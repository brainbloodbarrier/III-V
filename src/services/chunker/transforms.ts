/**
 * Immutable transform functions for Chunk manipulation.
 *
 * DESIGN PRINCIPLES:
 * - All functions return NEW chunks, never mutate inputs
 * - Functions are pure: same inputs always produce same outputs
 * - Follows ChunkBuilder pattern from models/chunk.ts
 * - Each function focuses on a single transformation concern
 *
 * USAGE:
 * Instead of mutating: chunk.token_count = 100;
 * Use transform: const updated = withTokenCount(chunk, 100);
 *
 * @module services/chunker/transforms
 */

import type { Chunk, ChunkBuilder, FigureRef } from "../../models/chunk";
import { estimateTokens } from "./tokenizer";

// ============================================================================
// Chunk Transforms (for complete Chunk objects)
// ============================================================================

/**
 * Creates a new Chunk with updated token count.
 * Useful when recalculating tokens after content changes.
 */
export function withTokenCount(chunk: Chunk, count: number): Chunk {
  return { ...chunk, token_count: count };
}

/**
 * Creates a new Chunk with an additional figure reference.
 * Preserves existing references and appends the new one.
 */
export function withFigureRef(chunk: Chunk, ref: FigureRef): Chunk {
  return {
    ...chunk,
    figure_references: [...chunk.figure_references, ref],
  };
}

/**
 * Creates a new Chunk with figure references replaced.
 * Use when setting all references at once.
 */
export function withFigureRefs(chunk: Chunk, refs: FigureRef[]): Chunk {
  return { ...chunk, figure_references: refs };
}

/**
 * Creates a new Chunk with overlap context applied.
 * Updates content, content_with_context, overlap_tokens, token_count, and character_count.
 *
 * @param chunk - The chunk to transform
 * @param overlapContent - The overlap text to prepend
 * @param overlapTokens - Number of tokens in the overlap
 */
export function withOverlapContext(
  chunk: Chunk,
  overlapContent: string,
  overlapTokens: number
): Chunk {
  const newContent = overlapContent + " " + chunk.content;
  const newContentWithContext = chunk.breadcrumb_text + "\n\n" + newContent;
  const newTokenCount = estimateTokens(newContentWithContext);

  return {
    ...chunk,
    content: newContent,
    content_with_context: newContentWithContext,
    overlap_tokens: overlapTokens,
    token_count: newTokenCount,
    character_count: newContent.length,
  };
}

/**
 * Creates a new Chunk with zero overlap (no context from previous chunk).
 */
export function withNoOverlap(chunk: Chunk): Chunk {
  return { ...chunk, overlap_tokens: 0 };
}

/**
 * Creates a new Chunk with updated linking fields.
 * Used for re-linking after merge operations.
 */
export function withLinking(
  chunk: Chunk,
  chunkId: string,
  sequenceNumber: number,
  previousChunkId: string | null,
  nextChunkId: string | null
): Chunk {
  return {
    ...chunk,
    chunk_id: chunkId,
    sequence_number: sequenceNumber,
    previous_chunk_id: previousChunkId,
    next_chunk_id: nextChunkId,
  };
}

/**
 * Creates a new Chunk with only the next_chunk_id updated.
 * Commonly used in post-processing to link the chain.
 */
export function withNextChunkId(chunk: Chunk, nextChunkId: string | null): Chunk {
  return { ...chunk, next_chunk_id: nextChunkId };
}

/**
 * Creates a new Chunk marked as a figure caption.
 */
export function asFigureCaption(chunk: Chunk): Chunk {
  return { ...chunk, is_figure_caption: true };
}

// ============================================================================
// ChunkBuilder Transforms (for intermediate construction)
// ============================================================================

/**
 * Creates a new ChunkBuilder with an additional figure reference.
 * Used during the splitting phase before finalization.
 */
export function builderWithFigureRef(builder: ChunkBuilder, ref: FigureRef): ChunkBuilder {
  return {
    ...builder,
    figure_references: [...builder.figure_references, ref],
  };
}

/**
 * Creates a new ChunkBuilder with figure references replaced.
 */
export function builderWithFigureRefs(builder: ChunkBuilder, refs: FigureRef[]): ChunkBuilder {
  return { ...builder, figure_references: refs };
}

/**
 * Creates a new ChunkBuilder marked as a figure caption.
 */
export function builderAsFigureCaption(builder: ChunkBuilder): ChunkBuilder {
  return { ...builder, is_figure_caption: true };
}

// ============================================================================
// Batch Transforms (for arrays of chunks)
// ============================================================================

/**
 * Re-links an array of chunks with new sequential IDs and linking.
 * Returns a new array with all chunks updated immutably.
 *
 * @param chunks - Array of chunks to relink
 * @param documentId - Document ID for generating chunk IDs
 * @param generateId - Function to generate chunk ID from doc ID and sequence number
 */
export function relinkChunksImmutable(
  chunks: readonly Chunk[],
  documentId: string,
  generateId: (docId: string, seq: number) => string
): Chunk[] {
  return chunks.map((chunk, i) =>
    withLinking(
      chunk,
      generateId(documentId, i),
      i,
      i > 0 ? generateId(documentId, i - 1) : null,
      i < chunks.length - 1 ? generateId(documentId, i + 1) : null
    )
  );
}

/**
 * Links the next_chunk_id for all chunks in sequence.
 * Returns a new array with updated chunks.
 */
export function linkNextChunks(chunks: readonly Chunk[]): Chunk[] {
  return chunks.map((chunk, i) => {
    if (i < chunks.length - 1) {
      const nextChunk = chunks[i + 1];
      if (!nextChunk) {
        throw new Error(`Expected chunk at index ${i + 1} to be defined during next_chunk_id linking`);
      }
      return withNextChunkId(chunk, nextChunk.chunk_id);
    }
    return chunk;
  });
}
