/**
 * ChunkAccumulator - A reusable utility for accumulating content until token limits.
 *
 * This utility encapsulates the common pattern of:
 * 1. Accumulating text items (paragraphs, sentences, words)
 * 2. Tracking token counts
 * 3. Flushing when limits are exceeded
 * 4. Handling the final remaining content
 *
 * @example
 * ```typescript
 * const accumulator = new ChunkAccumulator({
 *   maxTokens: 512,
 *   separator: " ",
 *   separatorTokens: 1,
 * });
 *
 * for (const item of items) {
 *   const flushed = accumulator.add(item, estimateTokens(item));
 *   if (flushed) {
 *     chunks.push(createChunk(flushed));
 *   }
 * }
 *
 * const remaining = accumulator.flush();
 * if (remaining) {
 *   chunks.push(createChunk(remaining));
 * }
 * ```
 */

import { estimateTokens } from "./tokenizer";

export interface ChunkAccumulatorOptions {
  /**
   * Maximum tokens allowed before flushing.
   */
  maxTokens: number;

  /**
   * Separator string to join accumulated items.
   * @default " "
   */
  separator?: string;

  /**
   * Token cost of the separator (estimated or exact).
   * @default 1
   */
  separatorTokens?: number;
}

export interface AccumulatorResult {
  /**
   * The accumulated content that was flushed.
   */
  content: string;

  /**
   * Token count of the flushed content.
   */
  tokens: number;
}

/**
 * A generic accumulator for building chunks from text items.
 *
 * Handles the common pattern of collecting items until a token limit
 * is reached, then flushing the collected content.
 */
export class ChunkAccumulator {
  private items: string[] = [];
  private currentTokens = 0;
  private readonly maxTokens: number;
  private readonly separator: string;
  private readonly separatorTokens: number;

  constructor(options: ChunkAccumulatorOptions) {
    this.maxTokens = options.maxTokens;
    this.separator = options.separator ?? " ";
    this.separatorTokens = options.separatorTokens ?? 1;
  }

  /**
   * Attempts to add an item to the accumulator.
   *
   * If adding the item would exceed the token limit and there are
   * existing items, the current content is flushed and returned.
   * The new item is then added to the now-empty accumulator.
   *
   * @param item - The text item to add
   * @param itemTokens - Token count for this item (pre-calculated for efficiency)
   * @returns The flushed content if a flush occurred, undefined otherwise
   */
  add(item: string, itemTokens?: number): AccumulatorResult | undefined {
    const tokens = itemTokens ?? estimateTokens(item);

    // Calculate token cost including separator if not first item
    const additionalTokens = this.items.length > 0 ? tokens + this.separatorTokens : tokens;

    // Check if adding this item would exceed limit
    if (this.currentTokens + additionalTokens > this.maxTokens && this.items.length > 0) {
      const flushed = this.flush();
      // Add the item to the now-empty accumulator
      this.items.push(item);
      this.currentTokens = tokens;
      return flushed;
    }

    // Add item to accumulator
    this.items.push(item);
    this.currentTokens += additionalTokens;
    return undefined;
  }

  /**
   * Flushes all accumulated content and resets the accumulator.
   *
   * @returns The accumulated content, or undefined if empty
   */
  flush(): AccumulatorResult | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const content = this.items.join(this.separator);
    const tokens = this.currentTokens;

    // Reset state
    this.items = [];
    this.currentTokens = 0;

    return { content, tokens };
  }

  /**
   * Checks if the accumulator has any content.
   */
  hasContent(): boolean {
    return this.items.length > 0;
  }

  /**
   * Gets the current token count.
   */
  getTokenCount(): number {
    return this.currentTokens;
  }

  /**
   * Gets the number of items currently accumulated.
   */
  getItemCount(): number {
    return this.items.length;
  }
}

/**
 * Helper function to process items through an accumulator and collect all results.
 *
 * This is a convenience function for the common pattern of iterating through
 * items, accumulating them, and collecting all flushed results plus the final flush.
 *
 * @param items - Array of text items to process
 * @param options - Accumulator configuration options
 * @param getTokens - Optional function to get token count for an item
 * @returns Array of accumulated results
 */
export function accumulateItems(
  items: string[],
  options: ChunkAccumulatorOptions,
  getTokens?: (item: string) => number
): AccumulatorResult[] {
  const accumulator = new ChunkAccumulator(options);
  const results: AccumulatorResult[] = [];
  const tokenFn = getTokens ?? estimateTokens;

  for (const item of items) {
    const flushed = accumulator.add(item, tokenFn(item));
    if (flushed) {
      results.push(flushed);
    }
  }

  const remaining = accumulator.flush();
  if (remaining) {
    results.push(remaining);
  }

  return results;
}
