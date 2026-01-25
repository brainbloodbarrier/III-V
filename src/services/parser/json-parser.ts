/**
 * JSON parser for Rhoton PDF structured data.
 * Extracts blocks from the hierarchical JSON format.
 */

import type { BlockType, BoundingBox, ContentBlock, RhotonPage } from "../../models/document.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("json-parser");

/**
 * Raw block from source JSON.
 */
export interface SourceBlock {
  id: string;
  block_type: string;
  html: string;
  bbox: number[] | null;
  section_hierarchy: Record<string, string> | null;
  children: SourceBlock[] | null;
  images?: Record<string, unknown>;
}

/**
 * Raw page from source JSON.
 */
interface SourcePage {
  block_type: string;
  bbox: number[];
  children: SourceBlock[] | null;
}

/**
 * Raw document from source JSON.
 */
interface SourceDocument {
  block_type: string;
  children: SourcePage[] | null;
}

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
  return typeMap[sourceType] ?? "text";
}

/**
 * Parses a bbox array into BoundingBox object.
 */
export function parseBoundingBox(bbox: number[] | null | undefined): BoundingBox {
  if (!bbox || !Array.isArray(bbox) || bbox.length < 4) {
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
  if (!hierarchy || typeof hierarchy !== "object") {
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
 * Strips HTML tags to get plain text content.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
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

  return [...new Set(references)];
}

/**
 * Recursively extracts blocks from a page, flattening nested children.
 */
export function extractBlocks(pageData: SourcePage, pageNumber: number): ContentBlock[] {
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
 */
export async function parseJsonFile(filePath: string): Promise<JsonParseResult> {
  log.info("Loading JSON file", { path: filePath });

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`JSON file not found: ${filePath}`);
  }

  const document = (await file.json()) as SourceDocument;
  return parseJsonDocument(document);
}
