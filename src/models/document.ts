/**
 * Core document model interfaces for the Rhoton Knowledge Base.
 * Matches the JSON Schema contract at contracts/document.schema.json
 */

import type { FigureReference } from "./figure.ts";

/**
 * Block types found in Rhoton documents.
 */
export type BlockType =
  | "section_header"
  | "text"
  | "figure_caption"
  | "page_header"
  | "inline_math";

/**
 * Bounding box coordinates for a content block.
 * Coordinates are relative to the page (0-based).
 */
export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * A single content block within a page.
 * Preserves the source block ID for traceability (Constitution Principle I).
 */
export interface ContentBlock {
  /** Source block ID in format /page/N/type/M */
  id: string;
  /** The type of content block */
  block_type: BlockType;
  /** Heading level (0-6, 0 for non-headers) */
  level: number;
  /** Normalized text content */
  content: string;
  /** Original HTML content from source */
  raw_html: string;
  /** Ancestor section headers (for hierarchy) */
  parent_hierarchy: string[];
  /** Figure IDs referenced in this block */
  figure_references: string[];
  /** Position on page */
  bbox: BoundingBox;
  /** Section identifier for grouping */
  section_id: string;
}

/**
 * A single page in the document.
 */
export interface RhotonPage {
  /** 0-based page number */
  page_number: number;
  /** Content blocks on this page */
  blocks: ContentBlock[];
}

/**
 * Source file paths for traceability.
 */
export interface SourceFiles {
  json: string;
  markdown: string;
  image_dir: string;
}

/**
 * Document processing metadata.
 */
export interface DocumentMetadata {
  /** ISO timestamp of processing */
  processed_at: string;
  /** Pipeline version */
  pipeline_version: string;
  /** Source JSON line count */
  source_json_lines: number;
  /** Source Markdown line count */
  source_markdown_lines: number;
  /** Total images in source directory */
  total_images: number;
  /** Percentage of blocks successfully parsed (0-100) */
  parse_rate: number;
  /** Count of ligature characters remaining */
  ligature_count: number;
  /** Percentage of figures mapped to images (0-100) */
  figure_coverage: number;
}

/**
 * The unified Rhoton document representation.
 * This is the primary output of the ingestion pipeline.
 */
export interface RhotonDocument {
  /** Document identifier (lowercase, kebab-case) */
  id: string;
  /** Document title */
  title: string;
  /** Author name */
  author: string;
  /** Source file references */
  source_files: SourceFiles;
  /** Document pages with content blocks */
  pages: RhotonPage[];
  /** Figure-to-image mappings */
  figure_map: Record<string, FigureReference>;
  /** Processing metadata */
  metadata: DocumentMetadata;
}
