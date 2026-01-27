/**
 * FILE API PATTERN: Uses Node.js 'fs' sync APIs for consistency with chunker/index.ts.
 * See chunker/index.ts header comment for full rationale on sync vs async file APIs.
 */
import { existsSync, readFileSync } from "fs";
import { z } from "zod";
import type { FigureRef } from "../../models/chunk";
import { createLogger } from "../../lib/logger";
import { FigureIndex } from "./figure-index";
import { FIGURE_LINKING_LIMITS } from "../../config/chunking";

const log = createLogger("chunker:figure-linker");

// Re-export FigureIndex for consumers
export { FigureIndex } from "./figure-index";

/**
 * Zod schema for FigureMapEntry - validates figure map entries at runtime.
 * This ensures type safety when loading external JSON data.
 */
const FigureMapEntrySchema = z.object({
  figure_id: z.string(),
  page_number: z.number().int().min(0),
  caption: z.string(),
  caption_block_id: z.string(),
  abbreviations: z.record(z.string(), z.string()),
  status: z.enum(["mapped", "no-image-in-caption", "unresolved"]),
  image_file: z.string().optional(),
  image_path: z.string().optional(),
  referencing_blocks: z.array(z.string()).optional(),
});

/**
 * Zod schema for the flat figure map format (Record<string, FigureMapEntry>).
 * Used by unit tests and legacy code.
 */
const FlatFigureMapSchema = z.record(z.string(), FigureMapEntrySchema);

/**
 * Zod schema for the nested figure map format with document_id, figures, and summary.
 * Used by the actual Phase 1 output.
 */
const NestedFigureMapSchema = z.object({
  document_id: z.string(),
  figures: z.record(z.string(), FigureMapEntrySchema),
  summary: z.object({
    total_figures: z.number().int().min(0),
    mapped_count: z.number().int().min(0),
    unmapped_count: z.number().int().min(0),
    coverage_percentage: z.number().min(0).max(100),
    by_status: z.object({
      mapped: z.number().int(),
      "no-image-in-caption": z.number().int(),
      unresolved: z.number().int(),
    }).optional(),
  }),
});

/**
 * Figure reference from Phase 1 figure_map.json
 */
export type FigureMapEntry = z.infer<typeof FigureMapEntrySchema>;

/**
 * Type guard to check if a value is a valid FigureMapEntry.
 * Uses Zod's safeParse for runtime validation.
 */
export function isFigureMapEntry(value: unknown): value is FigureMapEntry {
  return FigureMapEntrySchema.safeParse(value).success;
}

/**
 * Create a FigureIndex from a loaded figure map for O(1) lookups.
 *
 * @param figureMap - Map of caption_block_id to FigureMapEntry
 * @returns FigureIndex with dual-indexed lookups
 */
export function createFigureIndex(figureMap: Map<string, FigureMapEntry>): FigureIndex {
  return new FigureIndex(Array.from(figureMap.values()));
}

/**
 * Find a figure by its figure_id (e.g., "Fig. 4.1").
 *
 * @deprecated Use FigureIndex.getById() for O(1) lookups instead of this O(n) function.
 * @param figureMap - Map of caption_block_id to FigureMapEntry
 * @param figureId - The figure ID to search for
 * @returns FigureMapEntry if found, undefined otherwise
 */
export function findFigureById(
  figureMap: Map<string, FigureMapEntry>,
  figureId: string
): FigureMapEntry | undefined {
  for (const entry of figureMap.values()) {
    if (entry.figure_id === figureId) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Find a figure by its caption block ID.
 * Iterates through map values to support maps keyed by either figure_id or caption_block_id.
 *
 * @deprecated Use FigureIndex.getByCaptionBlockId() for O(1) lookups instead of this O(n) function.
 * @param figureMap - Map of caption_block_id to FigureMapEntry
 * @param blockId - The caption block ID to search for
 * @returns FigureMapEntry if found, undefined otherwise
 */
export function findFigureByCaptionBlockId(
  figureMap: Map<string, FigureMapEntry>,
  blockId: string
): FigureMapEntry | undefined {
  for (const entry of figureMap.values()) {
    if (entry.caption_block_id === blockId) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Load figure map from JSON file and create lookup by caption_block_id.
 * Uses Zod schema validation to ensure type safety at runtime.
 *
 * Supports two formats:
 * 1. Flat format: Record<string, FigureMapEntry> - used by unit tests
 * 2. Nested format: { document_id, figures, summary } - used by Phase 1 output
 *
 * @throws {Error} If file not found or JSON fails schema validation
 */
export function loadFigureMap(path: string): Map<string, FigureMapEntry> {
  if (!existsSync(path)) {
    throw new Error(`Figure map file not found: ${path}`);
  }
  const content = readFileSync(path, "utf-8");
  const rawData: unknown = JSON.parse(content);

  // Try nested format first (Phase 1 output)
  const nestedResult = NestedFigureMapSchema.safeParse(rawData);
  if (nestedResult.success) {
    const figureMap = nestedResult.data.figures;
    const map = new Map<string, FigureMapEntry>();
    for (const entry of Object.values(figureMap)) {
      map.set(entry.caption_block_id, entry);
    }
    return map;
  }

  // Fall back to flat format (unit tests, legacy)
  const flatResult = FlatFigureMapSchema.safeParse(rawData);
  if (flatResult.success) {
    const figureMap = flatResult.data;
    const map = new Map<string, FigureMapEntry>();
    for (const entry of Object.values(figureMap)) {
      map.set(entry.caption_block_id, entry);
    }
    return map;
  }

  // Neither format worked, report the flat format error (most common case for manual edits)
  const issues = flatResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Figure map validation failed: ${issues}`);
}

/**
 * Create a caption snippet, truncating at word boundary if needed.
 *
 * @param caption - Full caption text
 * @param maxLength - Maximum length (default CAPTION_SNIPPET_MAX_LENGTH)
 * @returns Truncated caption with "..." if needed
 */
export function createCaptionSnippet(
  caption: string,
  maxLength: number = FIGURE_LINKING_LIMITS.CAPTION_SNIPPET_MAX_LENGTH
): string {
  if (!caption) return "";
  if (caption.length <= maxLength) return caption;

  // Find last space before maxLength
  let truncateAt = maxLength;
  for (let i = maxLength - 1; i >= 0; i--) {
    if (caption[i] === " ") {
      truncateAt = i;
      break;
    }
  }

  return caption.slice(0, truncateAt) + "...";
}

/**
 * Create a FigureRef from a FigureMapEntry.
 * Ensures consistent handling of optional fields and caption truncation.
 *
 * This factory centralizes FigureRef construction to:
 * - Normalize undefined image_path to empty string
 * - Apply consistent caption snippet truncation
 * - Provide a single point of modification for FigureRef creation
 *
 * @param entry - The FigureMapEntry to convert
 * @returns A FigureRef object with normalized fields
 */
export function createFigureRef(entry: FigureMapEntry): FigureRef {
  return {
    figure_id: entry.figure_id,
    image_path: entry.image_path ?? "",
    caption_snippet: createCaptionSnippet(entry.caption),
  };
}

/**
 * Link a caption block to its figure reference using FigureIndex (O(1) lookup).
 *
 * @param captionBlockId - The block ID of the caption
 * @param index - FigureIndex for O(1) lookups
 * @returns FigureRef if found, null otherwise
 */
export function linkFigureWithIndex(
  captionBlockId: string,
  index: FigureIndex
): FigureRef | null {
  const entry = index.getByCaptionBlockId(captionBlockId);

  if (entry) {
    return createFigureRef(entry);
  }

  // Log when no matching figure found for debugging
  const availableCaptionBlockIds = index.getCaptionBlockIds();
  log.warn("No matching figure found for caption block ID", {
    captionBlockId,
    availableCaptionBlockIds,
  });

  return null;
}

/**
 * Link a caption block to its figure reference.
 *
 * @param captionBlockId - The block ID of the caption
 * @param figureMap - Map of caption_block_id to FigureMapEntry
 * @returns FigureRef if found, null otherwise
 */
export function linkFigure(
  captionBlockId: string,
  figureMap: Map<string, FigureMapEntry>
): FigureRef | null {
  const entry = findFigureByCaptionBlockId(figureMap, captionBlockId);

  if (entry) {
    return createFigureRef(entry);
  }

  // Log when no matching figure found for debugging
  const availableCaptionBlockIds = Array.from(figureMap.values()).map(
    (e) => e.caption_block_id
  );
  log.warn("No matching figure found for caption block ID", {
    captionBlockId,
    availableCaptionBlockIds,
  });

  return null;
}

/**
 * Pattern to match figure references in text content.
 *
 * **Pattern Limitation (Issue #216 / H-3):**
 * This regex only matches the abbreviated "Fig." form, NOT the spelled-out "Figure" form.
 *
 * **Analysis Finding:**
 * In the Rhoton document corpus (supratentorial cerebral veins), analysis found:
 * - 303 occurrences of "Fig." pattern (e.g., "Fig. 4.1", "Fig. 4.2")
 * - 0 occurrences of "Figure" pattern (e.g., "Figure 4.1")
 *
 * The current pattern is therefore SUFFICIENT for Rhoton's texts, which consistently
 * use the abbreviated "Fig." convention throughout.
 *
 * **Future Considerations:**
 * If processing documents with different conventions (e.g., "Figure 1", "Figure A.1"),
 * this pattern should be extended:
 * ```typescript
 * // Extended pattern for both conventions (not currently needed):
 * const extendedPattern = /(?:Fig(?:ure)?)\.\s*(\d+\.\d+)/gi;
 * // Or for simple numbering: /(?:Fig(?:ure)?)\.\s*(\d+(?:\.\d+)?)/gi;
 * ```
 *
 * @see PR #110 code review - H-3 finding on pattern completeness
 */
const FIGURE_PATTERN = /Fig\.\s*(\d+\.\d+)/gi;

/**
 * Find all figures referenced in text content using FigureIndex (O(1) lookups).
 * Looks for abbreviated patterns like "Fig. 4.1" (case-insensitive).
 *
 * @remarks
 * Uses {@link FIGURE_PATTERN} which only matches the abbreviated "Fig." form.
 * Does not match spelled-out "Figure X.Y" references.
 * The pattern expects a chapter.figure numbering format (e.g., "4.1", "12.3").
 *
 * See the FIGURE_PATTERN documentation for analysis of this limitation.
 *
 * @param content - Text content to search for figure references
 * @param index - FigureIndex for O(1) lookups by figure_id
 * @returns Array of FigureRef objects for matched figures
 */
export function findFigureReferencesWithIndex(
  content: string,
  index: FigureIndex
): FigureRef[] {
  const refs: FigureRef[] = [];
  const seen = new Set<string>();

  // Match "Fig. X.Y" patterns - see FIGURE_PATTERN documentation for limitation notes
  const pattern = new RegExp(FIGURE_PATTERN.source, FIGURE_PATTERN.flags);
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const figId = `Fig. ${match[1]}`;

    if (seen.has(figId)) continue;
    seen.add(figId);

    // Find the entry by figure_id using O(1) index lookup
    const entry = index.getById(figId);
    if (entry) {
      refs.push(createFigureRef(entry));
    }
  }

  return refs;
}

/**
 * Find all figures referenced in text content.
 * Looks for abbreviated patterns like "Fig. 4.1" (case-insensitive).
 *
 * @deprecated Use findFigureReferencesWithIndex() with FigureIndex for O(1) lookups.
 *
 * @remarks
 * Uses {@link FIGURE_PATTERN} which only matches the abbreviated "Fig." form.
 * Does not match spelled-out "Figure X.Y" references.
 * The pattern expects a chapter.figure numbering format (e.g., "4.1", "12.3").
 *
 * See the FIGURE_PATTERN documentation for analysis of this limitation.
 */
export function findFigureReferences(
  content: string,
  figureMap: Map<string, FigureMapEntry>
): FigureRef[] {
  const refs: FigureRef[] = [];
  const seen = new Set<string>();

  // Match "Fig. X.Y" patterns - see FIGURE_PATTERN documentation for limitation notes
  const pattern = new RegExp(FIGURE_PATTERN.source, FIGURE_PATTERN.flags);
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const figId = `Fig. ${match[1]}`;

    if (seen.has(figId)) continue;
    seen.add(figId);

    // Find the entry by figure_id using the helper
    const entry = findFigureById(figureMap, figId);
    if (entry) {
      refs.push(createFigureRef(entry));
    }
  }

  return refs;
}
