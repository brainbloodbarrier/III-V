import { readFileSync } from "fs";
import type { FigureRef } from "../../models/chunk";

/**
 * Figure reference from Phase 1 figure_map.json
 */
export interface FigureMapEntry {
  figure_id: string;
  page_number: number;
  caption: string;
  caption_block_id: string;
  abbreviations: string[];
  status: "mapped" | "no-image-in-caption" | "unresolved";
  image_file?: string;
  image_path?: string;
  referencing_blocks?: string[];
}

/**
 * Load figure map from JSON file and create lookup by caption_block_id.
 */
export function loadFigureMap(path: string): Map<string, FigureMapEntry> {
  const content = readFileSync(path, "utf-8");
  const figureMap = JSON.parse(content) as Record<string, FigureMapEntry>;

  // Create map keyed by caption_block_id for efficient lookup
  const map = new Map<string, FigureMapEntry>();
  for (const entry of Object.values(figureMap)) {
    map.set(entry.caption_block_id, entry);
  }

  return map;
}

/**
 * Create a caption snippet, truncating at word boundary if needed.
 *
 * @param caption - Full caption text
 * @param maxLength - Maximum length (default 100)
 * @returns Truncated caption with "..." if needed
 */
export function createCaptionSnippet(caption: string, maxLength: number = 100): string {
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
 * Link a caption block to its figure reference.
 *
 * @param captionBlockId - The block ID of the caption
 * @param figureMap - Map of figure_id to FigureMapEntry
 * @returns FigureRef if found, null otherwise
 */
export function linkFigure(
  captionBlockId: string,
  figureMap: Map<string, FigureMapEntry>
): FigureRef | null {
  // Search through entries to find matching caption_block_id
  for (const entry of figureMap.values()) {
    if (entry.caption_block_id === captionBlockId) {
      return {
        figure_id: entry.figure_id,
        image_path: entry.image_path || "",
        caption_snippet: createCaptionSnippet(entry.caption, 100),
      };
    }
  }
  return null;
}

/**
 * Find all figures referenced in text content.
 * Looks for patterns like "Fig. 4.1" or "Figure 4.1".
 */
export function findFigureReferences(
  content: string,
  figureMap: Map<string, FigureMapEntry>
): FigureRef[] {
  const refs: FigureRef[] = [];
  const seen = new Set<string>();

  // Match "Fig. X.Y" patterns
  const pattern = /Fig\.\s*(\d+\.\d+)/gi;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const figId = `Fig. ${match[1]}`;

    if (seen.has(figId)) continue;
    seen.add(figId);

    // Find the entry by figure_id
    for (const entry of figureMap.values()) {
      if (entry.figure_id === figId) {
        refs.push({
          figure_id: entry.figure_id,
          image_path: entry.image_path || "",
          caption_snippet: createCaptionSnippet(entry.caption, 100),
        });
        break;
      }
    }
  }

  return refs;
}
