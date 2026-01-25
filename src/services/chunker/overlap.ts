import type { Chunk } from "../../models/chunk";
import { splitSentences } from "./sentence";
import { estimateTokens, HARD_MAX_TOKENS } from "./tokenizer";

/**
 * Generate overlap content from the end of previous chunk's content.
 *
 * @param prevContent - Content from the previous chunk
 * @param sentenceCount - Number of sentences to include (default 2)
 * @returns Overlap content and token count
 */
export function generateOverlap(
  prevContent: string,
  sentenceCount: number = 2
): { overlapContent: string; overlapTokens: number } {
  if (!prevContent || prevContent.trim() === "") {
    return { overlapContent: "", overlapTokens: 0 };
  }

  const sentences = splitSentences(prevContent);

  // Get last N sentences
  const overlapSentences = sentences.slice(-sentenceCount);
  const overlapContent = overlapSentences.join(" ");
  const overlapTokens = estimateTokens(overlapContent);

  return { overlapContent, overlapTokens };
}

/**
 * Apply overlap to a sequence of chunks.
 *
 * Rules:
 * - First chunk in each section has no overlap
 * - Overlap does not cross section boundaries
 * - Figure caption chunks do not receive overlap
 * - Last 2 sentences from previous chunk are prepended
 *
 * @param chunks - Array of chunks to process
 * @returns Chunks with overlap applied
 */
export function applyOverlapToChunks(chunks: Chunk[]): Chunk[] {
  if (chunks.length === 0) return [];

  const result: Chunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = { ...chunks[i] }; // Clone to avoid mutation

    if (i === 0) {
      // First chunk has no overlap
      chunk.overlap_tokens = 0;
      result.push(chunk);
      continue;
    }

    const prevChunk = chunks[i - 1];

    // Check conditions for applying overlap
    const sameSection = chunk.parent_section_id === prevChunk.parent_section_id;
    const notFigureCaption = !chunk.is_figure_caption;

    if (sameSection && notFigureCaption) {
      // Generate overlap from previous chunk
      const { overlapContent, overlapTokens } = generateOverlap(prevChunk.content, 2);

      if (overlapContent) {
        // Calculate what the new token count would be
        const newContent = overlapContent + " " + chunk.content;
        const newContentWithContext = chunk.breadcrumb_text + "\n\n" + newContent;
        const newTokenCount = estimateTokens(newContentWithContext);

        // Only apply overlap if it doesn't exceed hard max
        if (newTokenCount <= HARD_MAX_TOKENS) {
          chunk.content = newContent;
          chunk.content_with_context = newContentWithContext;
          chunk.overlap_tokens = overlapTokens;
          chunk.token_count = newTokenCount;
          chunk.character_count = chunk.content.length;
        } else {
          // Skip overlap - would exceed hard limit
          chunk.overlap_tokens = 0;
        }
      } else {
        chunk.overlap_tokens = 0;
      }
    } else {
      // No overlap across sections or for figure captions
      chunk.overlap_tokens = 0;
    }

    result.push(chunk);
  }

  return result;
}
