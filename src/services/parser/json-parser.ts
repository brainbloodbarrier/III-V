/**
 * JSON parser for Rhoton PDF structured data.
 * Extracts blocks from the hierarchical JSON format.
 *
 * **Security Considerations (Issue #212):**
 * - Trust model: Input files are expected to come from the PDF parser (Phase 1),
 *   not arbitrary user content. The pipeline is a local CLI tool.
 * - File size validation: Rejects files exceeding MAX_FILE_SIZE_BYTES to prevent
 *   memory exhaustion attacks (Issue #208).
 * - Schema validation: Uses Zod schemas for runtime type safety.
 */

import { z } from "zod";
import { decode } from "html-entities";
import type { BlockType, BoundingBox, ContentBlock, RhotonPage } from "../../models/document";
import { dedupe } from "../../lib/array-utils";
import { createLogger } from "../../lib/logger";
import { MAX_FILE_SIZE_BYTES } from "../../lib/config";

const log = createLogger("json-parser");

/**
 * Zod schema for SourceBlock - validates source JSON blocks at runtime.
 * Uses z.lazy() for recursive children structure.
 *
 * Note: images field can be absent, null, or a record - we use .nullable().optional()
 * to handle all cases found in the source JSON data.
 */
const SourceBlockSchema: z.ZodType<SourceBlock> = z.lazy(() =>
  z.object({
    id: z.string(),
    block_type: z.string(),
    html: z.string(),
    bbox: z.array(z.number()).nullable(),
    section_hierarchy: z.record(z.string(), z.string()).nullable(),
    children: z.array(SourceBlockSchema).nullable(),
    images: z.record(z.string(), z.unknown()).nullable().optional(),
  })
);

/**
 * Raw block from source JSON.
 */
export type SourceBlock = {
  id: string;
  block_type: string;
  html: string;
  bbox: number[] | null;
  section_hierarchy: Record<string, string> | null;
  children: SourceBlock[] | null;
  images?: Record<string, unknown> | null;
};

/**
 * Zod schema for SourcePage - validates source JSON pages at runtime.
 */
const SourcePageSchema = z.object({
  block_type: z.string(),
  bbox: z.array(z.number()),
  children: z.array(SourceBlockSchema).nullable(),
});

/**
 * Raw page from source JSON.
 */
type SourcePage = z.infer<typeof SourcePageSchema>;

/**
 * Zod schema for SourceDocument - validates source JSON documents at runtime.
 */
const SourceDocumentSchema = z.object({
  block_type: z.string(),
  children: z.array(SourcePageSchema).nullable(),
});

/**
 * Raw document from source JSON.
 */
type SourceDocument = z.infer<typeof SourceDocumentSchema>;

/**
 * Result of parsing the JSON document.
 */
export interface JsonParseResult {
  pages: RhotonPage[];
  totalBlocks: number;
}

/**
 * Maps source block types to normalized block types.
 */
export function parseBlockType(sourceType: string): BlockType {
  const typeMap: Record<string, BlockType> = {
    SectionHeader: "section_header",
    Text: "text",
    Caption: "figure_caption",
    FigureCaption: "figure_caption",
    PageHeader: "page_header",
    Equation: "inline_math",
    Formula: "inline_math",
    TextInlineMath: "inline_math",
  };
  const mappedType = typeMap[sourceType];
  if (mappedType === undefined) {
    log.warn("Unknown block type defaulting to 'text'", { sourceType });
    return "text";
  }
  return mappedType;
}

/**
 * Parses a bbox array into BoundingBox object.
 */
export function parseBoundingBox(bbox: number[] | null | undefined): BoundingBox {
  if (!bbox || !Array.isArray(bbox) || bbox.length < 4) {
    log.warn("Invalid bounding box input, using default zeros", {
      received: bbox,
      reason: !bbox
        ? "null or undefined"
        : !Array.isArray(bbox)
          ? "not an array"
          : `insufficient elements (${bbox.length} < 4)`,
    });
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }
  return {
    x1: bbox[0] ?? 0,
    y1: bbox[1] ?? 0,
    x2: bbox[2] ?? 0,
    y2: bbox[3] ?? 0,
  };
}

/**
 * Extracts parent hierarchy from section_hierarchy object.
 * Returns array sorted by level number.
 */
export function extractHierarchy(
  hierarchy: Record<string, string> | null | undefined
): string[] {
  // Handle null/undefined as expected "no hierarchy" case (silent)
  if (hierarchy === null || hierarchy === undefined) {
    return [];
  }

  // Log warning for invalid input types
  if (typeof hierarchy !== "object" || Array.isArray(hierarchy)) {
    log.warn("Invalid hierarchy input: expected object", {
      receivedType: Array.isArray(hierarchy) ? "array" : typeof hierarchy,
    });
    return [];
  }

  const entries = Object.entries(hierarchy);
  // Sort by numeric key
  entries.sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));
  return entries.map(([, value]) => value);
}

/**
 * Extracts heading level from HTML tags.
 */
function extractHeadingLevel(html: string): number {
  const match = html.match(/<h([1-6])[^>]*>/i);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * Strips HTML tags and decodes entities to get plain text content.
 * Uses html-entities library for proper entity handling (Issue #208 CodeQL fix).
 */
function stripHtml(html: string): string {
  // Strip tags first
  const stripped = html.replace(/<[^>]+>/g, "");
  // Use library for proper entity decoding (handles all HTML entities correctly)
  const decoded = decode(stripped);
  // Normalize non-breaking spaces (U+00A0) to regular spaces for text processing
  return decoded.replace(/\u00A0/g, " ").trim();
}

/**
 * Extracts figure references from text content.
 */
function extractFigureReferences(content: string): string[] {
  const references: string[] = [];

  // Match "Fig. X.Y" patterns
  const figPattern = /Fig\.\s*(\d+\.\d+)/gi;
  let match;
  while ((match = figPattern.exec(content)) !== null) {
    if (match[1]) {
      references.push(`Fig. ${match[1]}`);
    }
  }

  // Match "Figs. X.Y-X.Z" range patterns
  const rangePattern = /Figs\.\s*(\d+\.\d+)\s*[-–]\s*(\d+\.)?(\d+)/gi;
  while ((match = rangePattern.exec(content)) !== null) {
    if (match[1]) {
      // For ranges, just add the start figure (expansion happens later)
      references.push(`Fig. ${match[1]}`);
    }
  }

  return dedupe(references);
}

/**
 * Recursively extracts blocks from a page, flattening nested children.
 */
export function extractBlocks(pageData: SourcePage, _pageNumber: number): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  function processBlock(block: SourceBlock): void {
    // Skip Page and Document block types
    if (block.block_type === "Page" || block.block_type === "Document") {
      if (block.children) {
        for (const child of block.children) {
          processBlock(child);
        }
      }
      return;
    }

    const content = stripHtml(block.html);
    const hierarchy = extractHierarchy(block.section_hierarchy);

    const contentBlock: ContentBlock = {
      id: block.id,
      block_type: parseBlockType(block.block_type),
      level: extractHeadingLevel(block.html),
      content,
      raw_html: block.html,
      parent_hierarchy: hierarchy,
      figure_references: extractFigureReferences(content),
      bbox: parseBoundingBox(block.bbox),
      section_id: hierarchy.length > 0 ? hierarchy[hierarchy.length - 1] ?? "" : "",
    };

    blocks.push(contentBlock);

    // Process nested children
    if (block.children) {
      for (const child of block.children) {
        processBlock(child);
      }
    }
  }

  if (pageData.children) {
    for (const block of pageData.children) {
      processBlock(block);
    }
  }

  return blocks;
}

/**
 * Parses the full JSON document into pages with blocks.
 */
export function parseJsonDocument(document: SourceDocument): JsonParseResult {
  const pages: RhotonPage[] = [];
  let totalBlocks = 0;

  if (!document.children) {
    log.warn("Document has no children");
    return { pages, totalBlocks };
  }

  for (let i = 0; i < document.children.length; i++) {
    const pageData = document.children[i];
    if (!pageData || pageData.block_type !== "Page") {
      continue;
    }

    const blocks = extractBlocks(pageData, i);
    totalBlocks += blocks.length;

    pages.push({
      page_number: i,
      blocks,
    });
  }

  log.info("Parsed JSON document", {
    pageCount: pages.length,
    totalBlocks,
  });

  return { pages, totalBlocks };
}

/**
 * Loads and parses a JSON file.
 * Uses Zod schema validation to ensure type safety at runtime.
 *
 * **Security (Issue #208):**
 * Validates file size before parsing to prevent memory exhaustion from
 * maliciously large files. The limit is defined by MAX_FILE_SIZE_BYTES.
 *
 * @throws {Error} If file not found, exceeds size limit, or fails schema validation
 */
export async function parseJsonFile(filePath: string): Promise<JsonParseResult> {
  log.info("Loading JSON file", { path: filePath });

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`JSON file not found: ${filePath}`);
  }

  // Security check: Validate file size before loading into memory (Issue #208)
  const fileSize = file.size;
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(
      `File size (${sizeMB} MB) exceeds maximum allowed size (${maxMB} MB): ${filePath}. ` +
      `This limit prevents memory exhaustion. If this is a legitimate file, consider ` +
      `splitting it into smaller documents.`
    );
  }

  const rawData: unknown = await file.json();

  // Validate the parsed JSON against our schema
  const parseResult = SourceDocumentSchema.safeParse(rawData);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Source document validation failed: ${issues}`);
  }

  return parseJsonDocument(parseResult.data);
}
