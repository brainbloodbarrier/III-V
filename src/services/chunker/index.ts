/**
 * Chunker pipeline module - orchestrates document chunking for RAG applications.
 *
 * **SECURITY CONSIDERATIONS (Issue #212):**
 *
 * Trust Model:
 * - Input files are expected to come from the PDF parser (Phase 1), not arbitrary
 *   user content. This is a local CLI tool, not a web service.
 * - The pipeline trusts file paths provided via CLI arguments; no path traversal
 *   protection is implemented as this is an offline processing tool.
 *
 * Path Assumptions:
 * - All file paths are local filesystem paths
 * - Output directories are created with default permissions (no sensitive data)
 * - The tool is designed for single-user, local execution
 *
 * Memory Limits:
 * - File size validation is handled in the parser layer (see json-parser.ts)
 * - Token counting uses efficient caching to prevent memory bloat
 *
 * Concurrency Model (Issue #214):
 * - Single-threaded execution model
 * - Fail-fast on existing output files prevents race conditions
 * - No file locking; relies on output check at pipeline start
 *
 * FILE API PATTERN:
 * This module uses Node.js 'fs' sync APIs for file operations.
 * Rationale: The chunker pipeline is a batch operation that processes documents
 * sequentially. Synchronous APIs simplify error handling and control flow in
 * this context. Bun fully supports Node.js 'fs' module as a first-class API.
 *
 * @see https://bun.sh/docs/runtime/nodejs-apis for Bun's Node.js compatibility
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import type { RhotonDocument, ContentBlock } from "../../models/document";
import type { Chunk, ChunkBuilder, ChunksOutput, ChunkIndex } from "../../models/chunk";
import { ChunksOutputSchema, ChunkIndexSchema } from "../../models/schemas";
import { buildHeaderIndex, getBreadcrumbText } from "./breadcrumb";
import { splitBlock, generateChunkId } from "./splitter";
import { clearTokenCache } from "./tokenizer";
import { loadFigureMap, linkFigure, findFigureReferences } from "./figure-linker";
import type { FigureMapEntry } from "./figure-linker";
import { applyOverlapToChunks } from "./overlap";
import { mergeSmallChunks } from "./merger";
import { validateChunks } from "./validator";
import type { ValidationResult } from "./validator";
import { generatePreviewHtml } from "./preview-generator";
import {
  builderWithFigureRefs,
  builderAsFigureCaption,
  relinkChunksImmutable,
  linkNextChunks,
} from "./transforms";
import { iterateBlocks, iterateBlocksWithPage } from "./document-iterator";
import { createLogger } from "../../lib/logger";

const log = createLogger("chunker");

/**
 * Configuration options for the chunking pipeline.
 *
 * NAMING CONVENTION NOTE:
 * ChunkerConfig and ChunkerResult use camelCase for properties because they
 * are internal runtime types (never serialized to JSON files). This follows
 * the project convention: camelCase for internal types, snake_case for
 * serialized/persisted data (see models/chunk.ts for the serialized types).
 *
 * CONCURRENCY NOTE (Issue #214):
 * This pipeline is designed for single-threaded, sequential execution.
 * Parallel invocations targeting the same outputDir will fail with a descriptive
 * error unless `force: true` is specified. This prevents race conditions that
 * could corrupt output files.
 */
export interface ChunkerConfig {
  inputPath: string;       // path to document.json
  figureMapPath: string;   // path to figure_map.json
  outputDir: string;       // output directory for chunks
  force?: boolean;         // if true, overwrite existing output files (default: false)
}

/**
 * Result returned from the chunking pipeline.
 * Contains both the generated chunks (snake_case, serialized) and runtime
 * metadata (camelCase, internal only).
 */
export interface ChunkerResult {
  totalChunks: number;        // camelCase: internal runtime field
  chunks: Chunk[];            // Chunk uses snake_case (serialized type)
  index: ChunkIndex;          // ChunkIndex uses snake_case (serialized type)
  validationPassed: boolean;  // camelCase: internal runtime field
  validationResult: ValidationResult;
}

/**
 * Internal context passed between chunking pipeline stages.
 */
interface ChunkingContext {
  document: RhotonDocument;
  figureMap: Map<string, FigureMapEntry>;
  headerIndex: Map<string, string>;
  chunks: Chunk[];
  index: ChunkIndex;
  chunksOutput: ChunksOutput;
  startTime: number;
}

/**
 * Load and validate all input documents required for chunking.
 * Returns document, figure map, and header index.
 */
function loadAndValidateInputs(config: ChunkerConfig): {
  document: RhotonDocument;
  figureMap: Map<string, FigureMapEntry>;
  headerIndex: Map<string, string>;
} {
  const document = loadDocument(config.inputPath);
  log.info("Loaded document", { pageCount: document.pages.length });

  const figureMap = loadFigureMap(config.figureMapPath);
  log.info("Loaded figure map", { figureCount: figureMap.size });

  const headerIndex = buildHeaderIndex(document);
  log.info("Built header index", { headerCount: headerIndex.size });

  return { document, figureMap, headerIndex };
}

/**
 * Process document blocks through the chunking pipeline stages:
 * split -> overlap -> merge -> relink
 */
function processChunkingPipeline(
  document: RhotonDocument,
  headerIndex: Map<string, string>,
  figureMap: Map<string, FigureMapEntry>
): Chunk[] {
  // Process all blocks into initial chunks
  let chunks = processBlocks(document, headerIndex, figureMap);
  log.info("Generated initial chunks", { chunkCount: chunks.length });

  // Apply overlap between adjacent chunks in same section
  chunks = applyOverlapToChunks(chunks);
  log.info("Applied overlap to chunks");

  // Merge small chunks within sections
  chunks = mergeSmallChunks(chunks);
  log.info("After merging", { chunkCount: chunks.length });

  // Re-link prev/next after merging changes the sequence (immutable)
  chunks = relinkChunksImmutable(chunks, document.id, generateChunkId);

  return chunks;
}

/**
 * Validate chunks and index against schemas.
 * Throws on validation failure.
 */
function validateSchemas(chunksOutput: ChunksOutput, index: ChunkIndex): void {
  const chunksValid = ChunksOutputSchema.safeParse(chunksOutput);
  const indexValid = ChunkIndexSchema.safeParse(index);

  if (!chunksValid.success) {
    log.error("Chunks validation failed", { issues: chunksValid.error.issues });
    throw new Error(`Chunks schema validation failed: ${chunksValid.error.issues.map(i => i.message).join(", ")}`);
  }
  if (!indexValid.success) {
    log.error("Index validation failed", { issues: indexValid.error.issues });
    throw new Error(`Index schema validation failed: ${indexValid.error.issues.map(i => i.message).join(", ")}`);
  }
}

/**
 * Write all output files: chunks.json, chunk_index.json, validation report, and preview.
 */
function writeOutputFiles(
  config: ChunkerConfig,
  ctx: ChunkingContext
): ValidationResult {
  // Ensure output directory exists
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  // Validate schemas before writing
  validateSchemas(ctx.chunksOutput, ctx.index);

  // Write chunks and index
  writeFileSync(
    `${config.outputDir}/chunks.json`,
    JSON.stringify(ctx.chunksOutput, null, 2)
  );
  writeFileSync(
    `${config.outputDir}/chunk_index.json`,
    JSON.stringify(ctx.index, null, 2)
  );
  log.info("Wrote chunks.json and chunk_index.json", { outputDir: config.outputDir });

  // Run quality gate validation
  const validationResult = validateChunks(
    ctx.chunksOutput,
    countSourceBlocks(ctx.document),
    countFigureCaptions(ctx.document),
    Date.now() - ctx.startTime
  );

  // Write validation report
  writeFileSync(
    `${config.outputDir}/chunking-validation.json`,
    JSON.stringify(validationResult, null, 2)
  );

  // Generate and write preview HTML
  const previewHtml = generatePreviewHtml(ctx.chunksOutput);
  writeFileSync(`${config.outputDir}/preview.html`, previewHtml);

  log.info("Wrote preview.html and chunking-validation.json", { outputDir: config.outputDir });

  return validationResult;
}

/**
 * Check if output files already exist to prevent race conditions.
 * Returns an array of existing file paths if any are found.
 *
 * @param outputDir - The output directory to check
 * @returns Array of existing file paths, empty if none exist
 */
function checkExistingOutputFiles(outputDir: string): string[] {
  const outputFiles = [
    "chunks.json",
    "chunk_index.json",
    "chunking-validation.json",
    "preview.html",
  ];

  const existingFiles: string[] = [];
  for (const file of outputFiles) {
    const filePath = `${outputDir}/${file}`;
    if (existsSync(filePath)) {
      existingFiles.push(filePath);
    }
  }

  return existingFiles;
}

/**
 * Main chunking pipeline orchestrator.
 * Coordinates loading, processing, and output generation stages.
 *
 * **Concurrency Safety (Issue #214):**
 * This function checks for existing output files before processing to prevent
 * race conditions when multiple processes target the same output directory.
 * If output files exist and `force: true` is not specified, an error is thrown
 * with guidance to use the `--force` flag to overwrite.
 *
 * @throws {Error} If output files already exist and force is not true
 */
export async function runChunker(config: ChunkerConfig): Promise<ChunkerResult> {
  const startTime = Date.now();
  log.info("Starting chunking pipeline");

  // Check for existing output files to prevent race conditions (Issue #214)
  if (!config.force) {
    const existingFiles = checkExistingOutputFiles(config.outputDir);
    if (existingFiles.length > 0) {
      const fileList = existingFiles.join(", ");
      throw new Error(
        `Output files already exist in ${config.outputDir}: ${fileList}. ` +
        `This could indicate a parallel invocation or incomplete previous run. ` +
        `Use --force (or force: true in config) to overwrite existing files.`
      );
    }
  }

  // Clear token cache to prevent stale data between documents
  clearTokenCache();

  // 1. Load and validate all inputs
  const { document, figureMap, headerIndex } = loadAndValidateInputs(config);

  // 2. Process blocks through chunking pipeline
  const chunks = processChunkingPipeline(document, headerIndex, figureMap);

  // 3. Build chunk index for efficient lookups
  const index = buildChunkIndex(chunks, document.id);

  // 4. Prepare output structure
  const chunksOutput: ChunksOutput = {
    document_id: document.id,
    generated_at: new Date().toISOString(),
    total_chunks: chunks.length,
    chunks,
  };

  // 5. Write all outputs and run validation
  const ctx: ChunkingContext = {
    document,
    figureMap,
    headerIndex,
    chunks,
    index,
    chunksOutput,
    startTime,
  };
  const validationResult = writeOutputFiles(config, ctx);

  return {
    totalChunks: chunks.length,
    chunks,
    index,
    validationPassed: validationResult.overall_status === "PASS",
    validationResult,
  };
}

/**
 * Count total source blocks in document that produce chunks.
 * Excludes section headers and empty content blocks.
 */
function countSourceBlocks(document: RhotonDocument): number {
  let count = 0;
  for (const block of iterateBlocks(document)) {
    if (isProcessableBlock(block)) {
      count++;
    }
  }
  return count;
}

/**
 * Count figure captions in document.
 */
function countFigureCaptions(document: RhotonDocument): number {
  let count = 0;
  for (const block of iterateBlocks(document)) {
    if (block.block_type === "figure_caption") {
      count++;
    }
  }
  return count;
}

/**
 * Finalizes a ChunkBuilder into a complete Chunk by adding sequence and linking fields.
 * This is the type-safe transition from the builder pattern to the final immutable Chunk.
 */
function finalizeChunk(
  builder: ChunkBuilder,
  chunkId: string,
  sequenceNumber: number,
  previousChunkId: string | null,
  nextChunkId: string | null
): Chunk {
  return {
    chunk_id: chunkId,
    document_id: builder.document_id,
    breadcrumb: builder.breadcrumb,
    breadcrumb_text: builder.breadcrumb_text,
    content: builder.content,
    content_with_context: builder.content_with_context,
    page_numbers: builder.page_numbers,
    source_block_ids: builder.source_block_ids,
    sequence_number: sequenceNumber,
    previous_chunk_id: previousChunkId,
    next_chunk_id: nextChunkId,
    parent_section_id: builder.parent_section_id,
    figure_references: builder.figure_references,
    token_count: builder.token_count,
    character_count: builder.character_count,
    overlap_tokens: builder.overlap_tokens,
    is_figure_caption: builder.is_figure_caption,
    is_table: builder.is_table,
    contains_abbreviations: builder.contains_abbreviations,
  };
}

/**
 * Load document from JSON file.
 */
function loadDocument(path: string): RhotonDocument {
  if (!existsSync(path)) {
    throw new Error(`Document file not found: ${path}`);
  }
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

/**
 * Determines if a block should be processed into a chunk.
 * Blocks are skipped if they are section headers (used for breadcrumbs only)
 * or have empty/whitespace-only content.
 */
function isProcessableBlock(block: ContentBlock): boolean {
  if (block.block_type === "section_header") {
    return false;
  }
  return Boolean(block.content && block.content.trim() !== "");
}

/**
 * Attaches figure references to a chunk builder using immutable transforms.
 * For figure captions, links the figure directly and marks it as a caption.
 * For other blocks, searches content for figure references.
 */
function attachFigureReferences(
  builder: ChunkBuilder,
  block: ContentBlock,
  figureMap: Map<string, FigureMapEntry>
): ChunkBuilder {
  if (block.block_type === "figure_caption") {
    const figRef = linkFigure(block.id, figureMap);
    const withRefs = figRef ? builderWithFigureRefs(builder, [figRef]) : builder;
    return builderAsFigureCaption(withRefs);
  }
  const refs = findFigureReferences(builder.content, figureMap);
  return builderWithFigureRefs(builder, refs);
}

/**
 * Processes a single block into finalized chunks.
 * Handles breadcrumb resolution, splitting, figure references, and finalization.
 */
function processBlock(
  block: ContentBlock,
  pageNumber: number,
  headerIndex: Map<string, string>,
  figureMap: Map<string, FigureMapEntry>,
  documentId: string,
  startSequence: number
): { chunks: Chunk[]; nextSequence: number } {
  const { labels, text } = getBreadcrumbText(
    block.parent_hierarchy || [],
    headerIndex
  );

  // page.page_number is 0-based, splitBlock expects 0-based and converts to 1-based internally
  const chunkBuilders = splitBlock(block, pageNumber, labels, text, documentId);
  const chunks: Chunk[] = [];
  let sequenceNumber = startSequence;

  for (const builder of chunkBuilders) {
    const enrichedBuilder = attachFigureReferences(builder, block, figureMap);
    const chunk = finalizeChunk(
      enrichedBuilder,
      generateChunkId(documentId, sequenceNumber),
      sequenceNumber,
      sequenceNumber > 0 ? generateChunkId(documentId, sequenceNumber - 1) : null,
      null // Will be set in post-processing
    );
    chunks.push(chunk);
    sequenceNumber++;
  }

  return { chunks, nextSequence: sequenceNumber };
}

/**
 * Process all blocks in document into chunks.
 */
function processBlocks(
  document: RhotonDocument,
  headerIndex: Map<string, string>,
  figureMap: Map<string, FigureMapEntry>
): Chunk[] {
  const allChunks: Chunk[] = [];
  let sequenceNumber = 0;

  for (const { block, pageNumber } of iterateBlocksWithPage(document)) {
    if (!isProcessableBlock(block)) {
      continue;
    }

    const result = processBlock(
      block,
      pageNumber,
      headerIndex,
      figureMap,
      document.id,
      sequenceNumber
    );

    allChunks.push(...result.chunks);
    sequenceNumber = result.nextSequence;
  }

  return linkNextChunks(allChunks);
}

/**
 * Build chunk index for efficient lookups.
 */
function buildChunkIndex(chunks: Chunk[], documentId: string): ChunkIndex {
  const index: ChunkIndex = {
    document_id: documentId,
    total_chunks: chunks.length,
    chunks_by_section: {},
    chunks_by_page: {},
    figure_to_chunks: {},
  };

  for (const chunk of chunks) {
    // Index by section
    const sectionId = chunk.parent_section_id || "unknown";
    if (!index.chunks_by_section[sectionId]) {
      index.chunks_by_section[sectionId] = [];
    }
    index.chunks_by_section[sectionId].push(chunk.chunk_id);

    // Index by page
    for (const pageNum of chunk.page_numbers) {
      const pageKey = String(pageNum);
      if (!index.chunks_by_page[pageKey]) {
        index.chunks_by_page[pageKey] = [];
      }
      index.chunks_by_page[pageKey].push(chunk.chunk_id);
    }

    // Index by figure
    for (const figRef of chunk.figure_references) {
      const figId = figRef.figure_id;
      if (!index.figure_to_chunks[figId]) {
        index.figure_to_chunks[figId] = [];
      }
      const figureChunks = index.figure_to_chunks[figId];
      if (!figureChunks) {
        throw new Error(`Expected figure_to_chunks array for figure ${figId} to be defined after initialization`);
      }
      figureChunks.push(chunk.chunk_id);
    }
  }

  return index;
}

/**
 * Re-link chunks after merging changes the sequence.
 * Mutates chunks in place for backward compatibility.
 * @deprecated Prefer relinkChunksImmutable for new code.
 */
function relinkChunks(chunks: Chunk[], documentId: string): void {
  const relinked = relinkChunksImmutable(chunks, documentId, generateChunkId);
  for (let i = 0; i < chunks.length; i++) {
    const relinkedChunk = relinked[i];
    const originalChunk = chunks[i];
    if (relinkedChunk && originalChunk) {
      originalChunk.chunk_id = relinkedChunk.chunk_id;
      originalChunk.sequence_number = relinkedChunk.sequence_number;
      originalChunk.previous_chunk_id = relinkedChunk.previous_chunk_id;
      originalChunk.next_chunk_id = relinkedChunk.next_chunk_id;
    }
  }
}

// Export for testing
export { loadDocument, processBlocks, buildChunkIndex, relinkChunks, countSourceBlocks, countFigureCaptions };
// Re-export immutable transforms for testing
export { relinkChunksImmutable, linkNextChunks } from "./transforms";
// Re-export document iterators for external use
export { iterateBlocks, iterateBlocksWithPage, type BlockWithPage } from "./document-iterator";
