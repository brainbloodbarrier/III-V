/**
 * Zod schemas for runtime validation of all entities.
 * Must match JSON Schema contracts in contracts/ directory.
 * Constitution Principle II: All outputs must validate against schemas.
 */

import { z } from "zod";

// ============================================================================
// Primitive Schemas
// ============================================================================

export const BlockTypeSchema = z.enum([
  "section_header",
  "text",
  "figure_caption",
  "page_header",
  "inline_math",
]).describe("Content block classification type");

export const FigureStatusSchema = z.enum([
  "mapped",
  "no-image-in-caption",
  "unresolved",
]).describe("Figure-to-image linking status: mapped=linked, no-image-in-caption=caption lacks image ref, unresolved=image not found");

export const BoundingBoxSchema = z.object({
  x1: z.number().min(0).describe("Left edge X coordinate"),
  y1: z.number().min(0).describe("Top edge Y coordinate"),
  x2: z.number().min(0).describe("Right edge X coordinate"),
  y2: z.number().min(0).describe("Bottom edge Y coordinate"),
}).describe("PDF page coordinates for block positioning");

// ============================================================================
// Content Block Schema
// ============================================================================

export const ContentBlockSchema = z.object({
  id: z.string().regex(/^\/page\/\d+\/\w+\/\d+$/).describe("Block ID: /page/{n}/{type}/{seq}"),
  block_type: BlockTypeSchema,
  level: z.number().int().min(0).max(6).describe("Heading level (0=body, 1-6=h1-h6)"),
  content: z.string().describe("Normalized plain text content"),
  raw_html: z.string().describe("Original HTML from source"),
  parent_hierarchy: z.array(z.string()).describe("Ancestor section IDs for breadcrumb"),
  figure_references: z.array(z.string()).describe("Figure IDs mentioned in block (e.g., Fig. 4.1)"),
  bbox: BoundingBoxSchema,
  section_id: z.string().describe("Containing section identifier"),
}).describe("A single content unit from the PDF (paragraph, heading, caption)");

// ============================================================================
// Page Schema
// ============================================================================

export const RhotonPageSchema = z.object({
  page_number: z.number().int().min(0).describe("0-indexed PDF page number"),
  blocks: z.array(ContentBlockSchema).describe("Content blocks on this page"),
}).describe("Single page from Rhoton document with all content blocks");

// ============================================================================
// Figure Schemas
// ============================================================================

export const FigureReferenceSchema = z
  .object({
    figure_id: z.string().regex(/^Fig\. \d+\.\d+$/).describe("Figure identifier (e.g., Fig. 4.1)"),
    image_file: z.string().optional().describe("Filename in images dir (required when mapped)"),
    image_path: z.string().optional().describe("Relative path to image file"),
    page_number: z.number().int().min(0).describe("Page where figure appears"),
    caption: z.string().min(1).describe("Full figure caption text"),
    caption_block_id: z.string().optional().describe("Block ID containing the caption"),
    abbreviations: z.record(z.string(), z.string()).describe("Abbreviation expansions from caption"),
    status: FigureStatusSchema,
    referencing_blocks: z.array(z.string()).optional().describe("Block IDs that reference this figure"),
  })
  .describe("Figure metadata with image linking status")
  .refine(
    (data) => {
      // If status is "mapped", image_file must be present
      if (data.status === "mapped") {
        return data.image_file !== undefined && data.image_file.length > 0;
      }
      return true;
    },
    {
      message: "image_file is required when status is 'mapped'",
      path: ["image_file"],
    }
  );

export const FigureSummarySchema = z.object({
  total_figures: z.number().int().min(0).describe("Total figures found in document"),
  mapped_count: z.number().int().min(0).describe("Figures successfully linked to images"),
  unmapped_count: z.number().int().min(0).describe("Figures without image links"),
  coverage_percentage: z.number().min(0).max(100).describe("Mapping success rate (0-100)"),
  by_status: z
    .object({
      mapped: z.number().int(),
      "no-image-in-caption": z.number().int(),
      unresolved: z.number().int(),
    })
    .optional()
    .describe("Breakdown by FigureStatus"),
}).describe("Aggregated statistics for figure mapping quality");

export const FigureMapSchema = z.object({
  document_id: z.string().describe("Parent document identifier"),
  figures: z.record(z.string(), FigureReferenceSchema).describe("Map of figure_id → FigureReference"),
  summary: FigureSummarySchema,
}).describe("Complete figure inventory with linking status for a document");

// ============================================================================
// Document Schemas
// ============================================================================

export const SourceFilesSchema = z.object({
  json: z.string().describe("Path to JSON export from PDF"),
  markdown: z.string().describe("Path to Markdown export from PDF"),
  image_dir: z.string().describe("Directory containing extracted images"),
}).describe("Input file paths for pipeline processing");

export const DocumentMetadataSchema = z.object({
  processed_at: z.string().datetime().describe("ISO 8601 processing timestamp"),
  pipeline_version: z.string().describe("Semantic version of processing pipeline"),
  source_json_lines: z.number().int().min(0).describe("Line count in source JSON"),
  source_markdown_lines: z.number().int().min(0).describe("Line count in source Markdown"),
  total_images: z.number().int().min(0).describe("Images found in image_dir"),
  parse_rate: z.number().min(0).max(100).describe("Parsing success percentage (quality gate)"),
  ligature_count: z.number().int().min(0).describe("Remaining ligatures after normalization"),
  figure_coverage: z.number().min(0).max(100).describe("Figure mapping success percentage"),
}).describe("Processing metrics and quality gate values");

export const RhotonDocumentSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).describe("Lowercase kebab-case document ID"),
  title: z.string().min(1).describe("Document title"),
  author: z.string().min(1).describe("Document author"),
  source_files: SourceFilesSchema,
  pages: z.array(RhotonPageSchema).min(1).describe("All pages with content blocks"),
  figure_map: z.record(z.string(), FigureReferenceSchema).describe("Figure ID → reference mapping"),
  metadata: DocumentMetadataSchema,
}).describe("Complete processed Rhoton document (Phase 1 output)");

// ============================================================================
// Validation Report Schemas
// ============================================================================

export const GateStatusSchema = z.enum(["pass", "fail"]).describe("Quality gate result: pass or fail");

export const GateResultSchema = z.object({
  name: z.string().describe("Gate name (parse_rate, ligature_count, figure_coverage)"),
  threshold: z.string().describe("Human-readable threshold (e.g., '>= 95%')"),
  actual: z.union([z.number(), z.number().int()]).describe("Measured value"),
  status: GateStatusSchema,
  details: z.string().optional().describe("Additional context on failure"),
}).describe("Individual quality gate evaluation result");

export const FailureDetailSchema = z.object({
  gate: z.string().describe("Name of failed gate"),
  reason: z.string().describe("Explanation of failure"),
  affected_items: z
    .array(
      z.object({
        id: z.string().describe("ID of problematic item"),
        description: z.string().optional().describe("Issue description"),
      })
    )
    .optional()
    .describe("Specific items causing failure"),
}).describe("Detailed information about a quality gate failure");

export const ValidationReportSchema = z.object({
  document_id: z.string().describe("Validated document ID"),
  timestamp: z.string().datetime().describe("ISO 8601 validation timestamp"),
  gates: z.object({
    parse_rate: GateResultSchema,
    ligature_count: GateResultSchema,
    figure_coverage: GateResultSchema,
  }).describe("Results for each quality gate"),
  overall_status: GateStatusSchema,
  failures: z.array(FailureDetailSchema).optional().describe("Details for any failed gates"),
}).describe("Phase 1 quality validation report");

// ============================================================================
// Chunk Schemas (Phase 2: Structural Chunking)
// ============================================================================

export const FigureRefSchema = z.object({
  figure_id: z.string().regex(/^Fig\. \d+\.\d+$/).describe("Figure identifier (e.g., Fig. 4.1)"),
  image_path: z.string().min(1).describe("Relative path to image file"),
  caption_snippet: z.string().max(150).describe("First 100-150 chars of caption"),
}).describe("Lightweight figure reference embedded in chunks");

export const ChunkSchema = z.object({
  chunk_id: z.string().regex(/^[a-z0-9-]+-chunk-[0-9]{4}$/).describe("{document_id}-chunk-{sequence:04d}"),
  document_id: z.string().min(1).describe("Parent document identifier"),
  breadcrumb: z.array(z.string()).min(1).describe("Section hierarchy path for context"),
  breadcrumb_text: z.string().regex(/^\[Context: .+\]$/).describe("Formatted breadcrumb: [Context: Ch > Sec > ...]"),
  content: z.string().min(1).describe("Raw chunk text without context prefix"),
  content_with_context: z.string().min(1).describe("Full text with breadcrumb prepended for RAG"),
  page_numbers: z.array(z.number().int().min(1)).min(1).describe("Source page numbers (1-indexed)"),
  source_block_ids: z.array(z.string()).min(1).describe("Block IDs that form this chunk"),
  sequence_number: z.number().int().min(0).describe("0-indexed position in document"),
  previous_chunk_id: z.string().nullable().describe("Link to previous chunk (null if first)"),
  next_chunk_id: z.string().nullable().describe("Link to next chunk (null if last)"),
  parent_section_id: z.string().describe("Containing section identifier"),
  figure_references: z.array(FigureRefSchema).describe("Figures referenced in this chunk"),
  token_count: z.number().int().min(1).max(600).describe("Token count (chars/4). Hard max: 600"),
  character_count: z.number().int().min(1).describe("Character count of content"),
  overlap_tokens: z.number().int().min(0).describe("Tokens shared with previous chunk"),
  is_figure_caption: z.boolean().describe("True if chunk is a standalone figure caption"),
  is_table: z.boolean().describe("True if chunk contains tabular data"),
  contains_abbreviations: z.boolean().describe("True if abbreviation definitions present"),
}).describe("Self-contained text unit with breadcrumb context for RAG retrieval");

export const ChunkIndexSchema = z.object({
  document_id: z.string().min(1).describe("Parent document identifier"),
  total_chunks: z.number().int().min(0).describe("Total chunks in document"),
  chunks_by_section: z.record(z.string(), z.array(z.string())).describe("section_id → chunk_ids for O(1) section lookup"),
  chunks_by_page: z.record(z.string(), z.array(z.string())).describe("page_number → chunk_ids for O(1) page lookup"),
  figure_to_chunks: z.record(z.string(), z.array(z.string())).describe("figure_id → chunk_ids referencing that figure"),
}).describe("Lookup index for efficient chunk retrieval by section, page, or figure");

export const ChunksOutputSchema = z.object({
  document_id: z.string().min(1).describe("Source document identifier"),
  generated_at: z.string().datetime().describe("ISO 8601 generation timestamp"),
  total_chunks: z.number().int().min(0).describe("Number of chunks generated"),
  chunks: z.array(ChunkSchema).describe("All chunks in sequence order"),
}).describe("Complete Phase 2 output: all chunks for a document");

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type BlockType = z.infer<typeof BlockTypeSchema>;
export type FigureStatus = z.infer<typeof FigureStatusSchema>;
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type RhotonPage = z.infer<typeof RhotonPageSchema>;
export type FigureReference = z.infer<typeof FigureReferenceSchema>;
export type FigureSummary = z.infer<typeof FigureSummarySchema>;
export type FigureMap = z.infer<typeof FigureMapSchema>;
export type SourceFiles = z.infer<typeof SourceFilesSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type RhotonDocument = z.infer<typeof RhotonDocumentSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type FailureDetail = z.infer<typeof FailureDetailSchema>;
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
export type FigureRef = z.infer<typeof FigureRefSchema>;
export type Chunk = z.infer<typeof ChunkSchema>;
export type ChunkIndex = z.infer<typeof ChunkIndexSchema>;
export type ChunksOutput = z.infer<typeof ChunksOutputSchema>;
