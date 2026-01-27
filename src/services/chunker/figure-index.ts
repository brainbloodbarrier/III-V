/**
 * FigureIndex provides O(1) lookups for figure entries by figure_id and caption_block_id.
 *
 * This replaces inefficient O(n) array.find() calls with Map-based lookups.
 * The index is built once from the figure map and provides constant-time access.
 *
 * @module services/chunker/figure-index
 */

import type { FigureMapEntry } from "./figure-linker";

/**
 * Index for O(1) figure lookups by figure_id or caption_block_id.
 *
 * @example
 * ```typescript
 * const figureMap = loadFigureMap("path/to/figure_map.json");
 * const index = new FigureIndex(Array.from(figureMap.values()));
 *
 * // O(1) lookup by figure_id
 * const fig = index.getById("Fig. 4.1");
 *
 * // O(1) lookup by caption_block_id
 * const fig2 = index.getByCaptionBlockId("/page/5/FigureCaption/1");
 * ```
 */
export class FigureIndex {
  private byId: Map<string, FigureMapEntry>;
  private byCaptionBlockId: Map<string, FigureMapEntry>;

  /**
   * Build index maps from an array of figure entries.
   *
   * @param figures - Array of FigureMapEntry objects to index
   */
  constructor(figures: FigureMapEntry[]) {
    this.byId = new Map();
    this.byCaptionBlockId = new Map();

    for (const figure of figures) {
      this.byId.set(figure.figure_id, figure);
      this.byCaptionBlockId.set(figure.caption_block_id, figure);
    }
  }

  /**
   * Get a figure by its figure_id (e.g., "Fig. 4.1").
   *
   * @param id - The figure_id to look up
   * @returns The FigureMapEntry if found, undefined otherwise
   */
  getById(id: string): FigureMapEntry | undefined {
    return this.byId.get(id);
  }

  /**
   * Get a figure by its caption_block_id (e.g., "/page/5/FigureCaption/1").
   *
   * @param blockId - The caption_block_id to look up
   * @returns The FigureMapEntry if found, undefined otherwise
   */
  getByCaptionBlockId(blockId: string): FigureMapEntry | undefined {
    return this.byCaptionBlockId.get(blockId);
  }

  /**
   * Get all indexed figures.
   *
   * @returns Iterator of all FigureMapEntry objects
   */
  values(): IterableIterator<FigureMapEntry> {
    return this.byId.values();
  }

  /**
   * Get the number of indexed figures.
   */
  get size(): number {
    return this.byId.size;
  }

  /**
   * Get all caption_block_ids in the index.
   *
   * @returns Array of caption_block_id strings
   */
  getCaptionBlockIds(): string[] {
    return Array.from(this.byCaptionBlockId.keys());
  }
}
