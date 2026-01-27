import type { Chunk } from "../../models/chunk";
import { estimateTokens, MIN_TOKENS, MAX_TOKENS } from "./tokenizer";

/**
 * Merge small chunks (< MIN_TOKENS) with adjacent chunks.
 *
 * Rules:
 * - Only merge within same section (same parent_section_id)
 * - Never merge figure caption chunks
 * - Combined token count must not exceed MAX_TOKENS
 * - Combine source_block_ids and page_numbers
 * - Recalculate token and character counts
 * - First try merging backward, then forward if at section start
 *
 * @param chunks - Array of chunks to process
 * @returns Chunks with small chunks merged
 */
export function mergeSmallChunks(chunks: Chunk[]): Chunk[] {
  if (chunks.length === 0) return [];
  if (chunks.length === 1) return chunks;

  // First pass: merge backward
  let result: Chunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Figure captions are never merged
    if (chunk.is_figure_caption) {
      result.push(chunk);
      continue;
    }

    // Check if this is a small chunk that should be merged backward
    if (chunk.token_count < MIN_TOKENS && result.length > 0) {
      const prevChunk = result[result.length - 1];

      // Check merge conditions
      const sameSection = chunk.parent_section_id === prevChunk.parent_section_id;
      const prevNotCaption = !prevChunk.is_figure_caption;
      const combinedFits = prevChunk.token_count + chunk.token_count <= MAX_TOKENS;

      if (sameSection && prevNotCaption && combinedFits) {
        // Merge into previous chunk
        mergeChunkIntoPrevious(prevChunk, chunk);
        continue;
      }
    }

    // Add chunk to result (not merged)
    result.push({ ...chunk });
  }

  // Second pass: merge small chunks forward (for section starts)
  const finalResult: Chunk[] = [];
  for (let i = 0; i < result.length; i++) {
    const chunk = result[i];

    // If previous chunk in finalResult is small and can merge forward
    if (finalResult.length > 0) {
      const prevChunk = finalResult[finalResult.length - 1];

      if (
        prevChunk.token_count < MIN_TOKENS &&
        !prevChunk.is_figure_caption &&
        !chunk.is_figure_caption &&
        prevChunk.parent_section_id === chunk.parent_section_id &&
        prevChunk.token_count + chunk.token_count <= MAX_TOKENS
      ) {
        // Merge previous small chunk into current
        mergeChunkIntoPrevious(prevChunk, chunk);
        continue;
      }
    }

    finalResult.push(chunk);
  }

  return finalResult;
}

/**
 * Merge chunk into previous chunk, updating all metadata.
 */
function mergeChunkIntoPrevious(prevChunk: Chunk, chunk: Chunk): void {
  // Combine content
  prevChunk.content = prevChunk.content + "\n\n" + chunk.content;
  prevChunk.content_with_context = prevChunk.breadcrumb_text + "\n\n" + prevChunk.content;

  // Combine source tracking
  prevChunk.source_block_ids = [
    ...prevChunk.source_block_ids,
    ...chunk.source_block_ids.filter(id => !prevChunk.source_block_ids.includes(id)),
  ];

  // Combine page numbers
  const pageSet = new Set([...prevChunk.page_numbers, ...chunk.page_numbers]);
  prevChunk.page_numbers = Array.from(pageSet).sort((a, b) => a - b);

  // Recalculate counts
  prevChunk.character_count = prevChunk.content.length;
  prevChunk.token_count = estimateTokens(prevChunk.content_with_context);

  // Keep other metadata from previous chunk
  // (breadcrumb, parent_section_id, is_figure_caption, etc.)
}
