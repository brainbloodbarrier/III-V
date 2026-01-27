/**
 * Unified section boundary detection utilities.
 *
 * This module centralizes section-related logic that was previously duplicated
 * across merger.ts, overlap.ts, and validator.ts.
 *
 * Section boundaries are determined by comparing parent_section_id values
 * between adjacent chunks. A boundary exists when two adjacent chunks have
 * different parent_section_id values.
 *
 * @module services/chunker/section-utils
 */

import type { Chunk, ChunkBuilder } from "../../models/chunk";

/**
 * A chunk-like object that has a parent_section_id.
 * This allows the utilities to work with both Chunk and ChunkBuilder types.
 */
type ChunkWithSection = Pick<Chunk | ChunkBuilder, "parent_section_id">;

/**
 * Check if two chunks are in the same section.
 *
 * Two chunks are considered in the same section if they have identical
 * parent_section_id values.
 *
 * @param chunkA - First chunk to compare
 * @param chunkB - Second chunk to compare
 * @returns true if both chunks are in the same section
 */
export function isSameSection(
  chunkA: ChunkWithSection,
  chunkB: ChunkWithSection
): boolean {
  return chunkA.parent_section_id === chunkB.parent_section_id;
}

/**
 * Check if there is a section boundary between two adjacent chunks.
 *
 * A section boundary exists when the current chunk has a different
 * parent_section_id than the previous chunk.
 *
 * @param prevChunk - The previous chunk in sequence
 * @param currChunk - The current chunk in sequence
 * @returns true if there is a section boundary between the chunks
 */
export function isSectionBoundary(
  prevChunk: ChunkWithSection,
  currChunk: ChunkWithSection
): boolean {
  return prevChunk.parent_section_id !== currChunk.parent_section_id;
}

/**
 * Get the section ID from a chunk.
 *
 * @param chunk - The chunk to extract section ID from
 * @returns The parent_section_id of the chunk
 */
export function getSectionId(chunk: ChunkWithSection): string {
  return chunk.parent_section_id;
}

/**
 * Check if a chunk is the final chunk in its section.
 *
 * A chunk is section-final if:
 * - It is the last chunk in the array, OR
 * - The next chunk has a different parent_section_id
 *
 * @param chunk - The chunk to check
 * @param nextChunk - The next chunk in sequence (undefined if chunk is last)
 * @returns true if the chunk is the final chunk in its section
 */
export function isSectionFinal(
  chunk: ChunkWithSection,
  nextChunk: ChunkWithSection | undefined
): boolean {
  if (!nextChunk) {
    return true;
  }
  return isSectionBoundary(chunk, nextChunk);
}

/**
 * Build a set of section-final chunk IDs from an array of chunks.
 *
 * This is useful for validation where section-final chunks may have
 * different rules (e.g., allowed to be under minimum token count).
 *
 * @param chunks - Array of chunks with chunk_id property
 * @returns Set of chunk IDs that are final in their sections
 */
export function getSectionFinalChunkIds(chunks: Chunk[]): Set<string> {
  const sectionFinalChunks = new Set<string>();

  for (let i = 0; i < chunks.length; i++) {
    // SAFETY: Loop bounds guarantee chunks[i] exists (0 <= i < chunks.length)
    const chunk = chunks[i]!;
    const nextChunk = chunks[i + 1];

    if (isSectionFinal(chunk, nextChunk)) {
      sectionFinalChunks.add(chunk.chunk_id);
    }
  }

  return sectionFinalChunks;
}
