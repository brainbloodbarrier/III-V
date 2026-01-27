/**
 * Re-export all model types and schemas.
 */

// Type interfaces
export type {
  BlockType,
  BoundingBox,
  ContentBlock,
  RhotonPage,
  SourceFiles,
  DocumentMetadata,
  RhotonDocument,
} from "./document.ts";

export type {
  FigureStatus,
  FigureReference,
  FigureSummary,
  FigureMap,
} from "./figure.ts";

export type {
  FigureRef,
  Chunk,
  ChunkIndex,
  ChunksOutput,
} from "./chunk.ts";

// Zod schemas
export {
  BlockTypeSchema,
  FigureStatusSchema,
  BoundingBoxSchema,
  ContentBlockSchema,
  RhotonPageSchema,
  FigureReferenceSchema,
  FigureSummarySchema,
  FigureMapSchema,
  SourceFilesSchema,
  DocumentMetadataSchema,
  RhotonDocumentSchema,
  GateStatusSchema,
  GateResultSchema,
  FailureDetailSchema,
  ValidationReportSchema,
} from "./schemas.ts";

// Inferred types from schemas (alternative to interfaces)
export type {
  GateResult,
  FailureDetail,
  ValidationReport,
} from "./schemas.ts";
