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
]);

export const FigureStatusSchema = z.enum([
  "mapped",
  "no-image-in-caption",
  "unresolved",
]);

export const BoundingBoxSchema = z.object({
  x1: z.number().min(0),
  y1: z.number().min(0),
  x2: z.number().min(0),
  y2: z.number().min(0),
});

// ============================================================================
// Content Block Schema
// ============================================================================

export const ContentBlockSchema = z.object({
  id: z.string().regex(/^\/page\/\d+\/\w+\/\d+$/),
  block_type: BlockTypeSchema,
  level: z.number().int().min(0).max(6),
  content: z.string(),
  raw_html: z.string(),
  parent_hierarchy: z.array(z.string()),
  figure_references: z.array(z.string()),
  bbox: BoundingBoxSchema,
  section_id: z.string(),
});

// ============================================================================
// Page Schema
// ============================================================================

export const RhotonPageSchema = z.object({
  page_number: z.number().int().min(0),
  blocks: z.array(ContentBlockSchema),
});

// ============================================================================
// Figure Schemas
// ============================================================================

export const FigureReferenceSchema = z
  .object({
    figure_id: z.string().regex(/^Fig\. \d+\.\d+$/),
    image_file: z.string().optional(),
    image_path: z.string().optional(),
    page_number: z.number().int().min(0),
    caption: z.string().min(1),
    caption_block_id: z.string().optional(),
    abbreviations: z.record(z.string(), z.string()),
    status: FigureStatusSchema,
    referencing_blocks: z.array(z.string()).optional(),
  })
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
  total_figures: z.number().int().min(0),
  mapped_count: z.number().int().min(0),
  unmapped_count: z.number().int().min(0),
  coverage_percentage: z.number().min(0).max(100),
  by_status: z
    .object({
      mapped: z.number().int(),
      "no-image-in-caption": z.number().int(),
      unresolved: z.number().int(),
    })
    .optional(),
});

export const FigureMapSchema = z.object({
  document_id: z.string(),
  figures: z.record(z.string(), FigureReferenceSchema),
  summary: FigureSummarySchema,
});

// ============================================================================
// Document Schemas
// ============================================================================

export const SourceFilesSchema = z.object({
  json: z.string(),
  markdown: z.string(),
  image_dir: z.string(),
});

export const DocumentMetadataSchema = z.object({
  processed_at: z.string().datetime(),
  pipeline_version: z.string(),
  source_json_lines: z.number().int().min(0),
  source_markdown_lines: z.number().int().min(0),
  total_images: z.number().int().min(0),
  parse_rate: z.number().min(0).max(100),
  ligature_count: z.number().int().min(0),
  figure_coverage: z.number().min(0).max(100),
});

export const RhotonDocumentSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  author: z.string().min(1),
  source_files: SourceFilesSchema,
  pages: z.array(RhotonPageSchema).min(1),
  figure_map: z.record(z.string(), FigureReferenceSchema),
  metadata: DocumentMetadataSchema,
});

// ============================================================================
// Validation Report Schemas
// ============================================================================

export const GateStatusSchema = z.enum(["pass", "fail"]);

export const GateResultSchema = z.object({
  name: z.string(),
  threshold: z.string(),
  actual: z.union([z.number(), z.number().int()]),
  status: GateStatusSchema,
  details: z.string().optional(),
});

export const FailureDetailSchema = z.object({
  gate: z.string(),
  reason: z.string(),
  affected_items: z
    .array(
      z.object({
        id: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const ValidationReportSchema = z.object({
  document_id: z.string(),
  timestamp: z.string().datetime(),
  gates: z.object({
    parse_rate: GateResultSchema,
    ligature_count: GateResultSchema,
    figure_coverage: GateResultSchema,
  }),
  overall_status: GateStatusSchema,
  failures: z.array(FailureDetailSchema).optional(),
});

// ============================================================================
// Chunk Schemas (Phase 2: Structural Chunking)
// ============================================================================

export const FigureRefSchema = z.object({
  figure_id: z.string().regex(/^Fig\. \d+\.\d+$/),
  image_path: z.string().min(1),
  caption_snippet: z.string().max(150),
});

export const ChunkSchema = z.object({
  chunk_id: z.string().regex(/^[a-z0-9-]+-chunk-[0-9]{4}$/),
  document_id: z.string().min(1),
  breadcrumb: z.array(z.string()).min(1),
  breadcrumb_text: z.string().regex(/^\[Context: .+\]$/),
  content: z.string().min(1),
  content_with_context: z.string().min(1),
  page_numbers: z.array(z.number().int().min(1)).min(1),
  source_block_ids: z.array(z.string()).min(1),
  sequence_number: z.number().int().min(0),
  previous_chunk_id: z.string().nullable(),
  next_chunk_id: z.string().nullable(),
  parent_section_id: z.string(),
  figure_references: z.array(FigureRefSchema),
  token_count: z.number().int().min(1).max(600),
  character_count: z.number().int().min(1),
  overlap_tokens: z.number().int().min(0),
  is_figure_caption: z.boolean(),
  is_table: z.boolean(),
  contains_abbreviations: z.boolean(),
});

export const ChunkIndexSchema = z.object({
  document_id: z.string().min(1),
  total_chunks: z.number().int().min(0),
  chunks_by_section: z.record(z.string(), z.array(z.string())),
  chunks_by_page: z.record(z.string(), z.array(z.string())),
  figure_to_chunks: z.record(z.string(), z.array(z.string())),
});

export const ChunksOutputSchema = z.object({
  document_id: z.string().min(1),
  generated_at: z.string().datetime(),
  total_chunks: z.number().int().min(0),
  chunks: z.array(ChunkSchema),
});

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
