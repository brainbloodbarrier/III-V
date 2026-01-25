/**
 * TypeScript interfaces for the structural chunking feature (Phase 2).
 *
 * These interfaces match the JSON Schema contracts:
 * - specs/002-structural-chunking/contracts/chunk.schema.json
 * - specs/002-structural-chunking/contracts/chunk-index.schema.json
 *
 * @module models/chunk
 */

/**
 * Reference linking a chunk to a figure.
 * Embedded within Chunk entities.
 */
export interface FigureRef {
  /** Figure identifier, e.g., "Fig. 4.1" */
  figure_id: string;
  /** Path to image file, e.g., "./rhoton.../image-12.jpg" */
  image_path: string;
  /** First 100 chars of caption */
  caption_snippet: string;
}

/**
 * A self-contained text unit with hierarchical breadcrumb context.
 * Primary output entity of the chunking pipeline.
 *
 * Validation Rules:
 * - token_count must be <= 600 (hard max)
 * - token_count should be >= 80 (soft min, except final chunks)
 * - breadcrumb must have at least 1 element
 * - source_block_ids must have at least 1 element
 * - sequence_number must be unique within document
 *
 * Chunks are immutable once created.
 */
export interface Chunk {
  /** Unique identifier: {doc_id}-chunk-{seq:04d} */
  chunk_id: string;
  /** Parent document reference */
  document_id: string;
  /** Hierarchy path as array of labels, e.g., ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"] */
  breadcrumb: string[];
  /** Formatted context string, e.g., "[Context: X > Y > Z]" */
  breadcrumb_text: string;
  /** The actual chunk text (without context prefix) */
  content: string;
  /** breadcrumb_text + "\n\n" + content */
  content_with_context: string;
  /** Source page numbers, e.g., [3] or [3, 4] if spans pages */
  page_numbers: number[];
  /** Original JSON block IDs for traceability */
  source_block_ids: string[];
  /** Order within document (0-indexed) */
  sequence_number: number;
  /** Link to previous chunk (null if first) */
  previous_chunk_id: string | null;
  /** Link to next chunk (null if last) */
  next_chunk_id: string | null;
  /** Section this chunk belongs to */
  parent_section_id: string;
  /** Figures mentioned in this chunk */
  figure_references: FigureRef[];
  /** Estimated tokens (chars / 4), hard max: 600 */
  token_count: number;
  /** Character count of content */
  character_count: number;
  /** Tokens shared with previous chunk (0 if none) */
  overlap_tokens: number;
  /** True if this is a figure caption chunk */
  is_figure_caption: boolean;
  /** True if this contains tabular data */
  is_table: boolean;
  /** True if abbreviation definitions present */
  contains_abbreviations: boolean;
}

/**
 * Lookup structure for efficient chunk retrieval by section, page, or figure.
 *
 * Validation Rules:
 * - All chunk_ids referenced must exist in chunks.json
 * - total_chunks must equal length of chunks.json array
 */
export interface ChunkIndex {
  /** Parent document reference */
  document_id: string;
  /** Count of chunks in collection */
  total_chunks: number;
  /** section_id -> chunk_ids mapping */
  chunks_by_section: Record<string, string[]>;
  /** page_number (as string) -> chunk_ids mapping */
  chunks_by_page: Record<string, string[]>;
  /** figure_id -> chunk_ids mapping */
  figure_to_chunks: Record<string, string[]>;
}

/**
 * Output format for chunks.json file.
 * Contains all chunks for a document with metadata.
 */
export interface ChunksOutput {
  /** Parent document reference */
  document_id: string;
  /** ISO timestamp when chunks were generated */
  generated_at: string;
  /** Total number of chunks */
  total_chunks: number;
  /** Array of all chunks */
  chunks: Chunk[];
}
