import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import type { RhotonDocument } from "../../models/document";
import type { Chunk, ChunksOutput, ChunkIndex } from "../../models/chunk";
import { ChunksOutputSchema, ChunkIndexSchema } from "../../models/schemas";
import { buildHeaderIndex, getBreadcrumbText } from "./breadcrumb";
import { splitBlock, generateChunkId } from "./splitter";
import { loadFigureMap, linkFigure, findFigureReferences, type FigureMapEntry } from "./figure-linker";
import { applyOverlapToChunks } from "./overlap";
import { mergeSmallChunks } from "./merger";
import { validateChunks, printValidationResults, type ValidationResult } from "./validator";
import { generatePreviewHtml } from "./preview-generator";

export interface ChunkerConfig {
  inputPath: string;       // path to document.json
  figureMapPath: string;   // path to figure_map.json
  outputDir: string;       // output directory for chunks
}

export interface ChunkerResult {
  totalChunks: number;
  chunks: Chunk[];
  index: ChunkIndex;
  validationPassed: boolean;
  validationResult: ValidationResult;
}

/**
 * Main chunking pipeline orchestrator.
 */
export async function runChunker(config: ChunkerConfig): Promise<ChunkerResult> {
  console.log("[INFO] Starting chunking pipeline...");

  // 1. Load Phase 1 outputs
  const document = loadDocument(config.inputPath);
  console.log(`[INFO] Loaded document: ${document.pages.length} pages`);

  // 2. Load figure map
  const figureMap = loadFigureMap(config.figureMapPath);
  console.log(`[INFO] Loaded figure map: ${figureMap.size} figures`);

  // 3. Build header index for breadcrumb resolution
  const headerIndex = buildHeaderIndex(document);
  console.log(`[INFO] Built header index: ${headerIndex.size} headers`);

  // 4. Process all blocks into chunks
  let chunks = processBlocks(document, headerIndex, figureMap);
  console.log(`[INFO] Generated ${chunks.length} initial chunks`);

  // 5. Apply overlap between adjacent chunks in same section
  chunks = applyOverlapToChunks(chunks);
  console.log(`[INFO] Applied overlap to chunks`);

  // 6. Merge small chunks within sections
  chunks = mergeSmallChunks(chunks);
  console.log(`[INFO] After merging: ${chunks.length} chunks`);

  // 7. Re-link prev/next after merging
  relinkChunks(chunks, document.id);

  // 8. Build chunk index
  const index = buildChunkIndex(chunks, document.id);

  // 9. Ensure output directory exists
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  // 10. Validate and write outputs
  const chunksOutput: ChunksOutput = {
    document_id: document.id,
    generated_at: new Date().toISOString(),
    total_chunks: chunks.length,
    chunks,
  };

  const chunksValid = ChunksOutputSchema.safeParse(chunksOutput);
  const indexValid = ChunkIndexSchema.safeParse(index);

  if (!chunksValid.success) {
    console.error("[ERROR] Chunks validation failed:", chunksValid.error.issues);
  }
  if (!indexValid.success) {
    console.error("[ERROR] Index validation failed:", indexValid.error.issues);
  }

  // Write outputs
  writeFileSync(
    `${config.outputDir}/chunks.json`,
    JSON.stringify(chunksOutput, null, 2)
  );
  writeFileSync(
    `${config.outputDir}/chunk_index.json`,
    JSON.stringify(index, null, 2)
  );

  console.log(`[INFO] Wrote chunks.json and chunk_index.json to ${config.outputDir}`);

  // 11. Run quality gate validation
  const validationResult = validateChunks(
    chunksOutput,
    index,
    countSourceBlocks(document),
    countFigureCaptions(document),
    Date.now() - Date.now() // Will be updated with actual processing time
  );

  // Write validation report
  writeFileSync(
    `${config.outputDir}/chunking-validation.json`,
    JSON.stringify(validationResult, null, 2)
  );

  // 12. Generate and write preview HTML
  const previewHtml = generatePreviewHtml(chunksOutput);
  writeFileSync(`${config.outputDir}/preview.html`, previewHtml);

  console.log(`[INFO] Wrote preview.html and chunking-validation.json to ${config.outputDir}`);

  return {
    totalChunks: chunks.length,
    chunks,
    index,
    validationPassed: chunksValid.success && indexValid.success && validationResult.overall_status === "PASS",
    validationResult,
  };
}

/**
 * Count total source blocks in document that produce chunks.
 * Excludes section headers and empty content blocks.
 */
function countSourceBlocks(document: RhotonDocument): number {
  let count = 0;
  for (const page of document.pages) {
    for (const block of page.blocks) {
      // Same conditions as processBlocks - skip section headers and empty content
      if (block.block_type === "section_header") {
        continue;
      }
      if (!block.content || block.content.trim() === "") {
        continue;
      }
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
  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.block_type === "figure_caption") {
        count++;
      }
    }
  }
  return count;
}

/**
 * Load document from JSON file.
 */
function loadDocument(path: string): RhotonDocument {
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

/**
 * Process all blocks in document into chunks.
 */
function processBlocks(
  document: RhotonDocument,
  headerIndex: Map<string, string>,
  figureMap: Map<string, FigureMapEntry>
): Chunk[] {
  const chunks: Chunk[] = [];
  let sequenceNumber = 0;

  for (const page of document.pages) {
    for (const block of page.blocks) {
      // Skip section headers - they're used for breadcrumbs, not content
      if (block.block_type === "section_header") {
        continue;
      }

      // Skip blocks with empty content (page headers, etc.)
      if (!block.content || block.content.trim() === "") {
        continue;
      }

      // Get breadcrumb for this block
      const { labels, text } = getBreadcrumbText(
        block.parent_hierarchy || [],
        headerIndex
      );

      // Split block into chunk(s)
      const partialChunks = splitBlock(block, labels, text, document.id);

      // Complete chunk metadata
      for (const partial of partialChunks) {
        // Link figure if this is a caption
        if (block.block_type === "figure_caption") {
          const figRef = linkFigure(block.id, figureMap);
          if (figRef) {
            partial.figure_references = [figRef];
          }
          partial.is_figure_caption = true;
        } else {
          // Find figure references in text content
          const refs = findFigureReferences(partial.content || "", figureMap);
          partial.figure_references = refs;
        }

        const chunk: Chunk = {
          ...partial,
          chunk_id: generateChunkId(document.id, sequenceNumber),
          sequence_number: sequenceNumber,
          previous_chunk_id: sequenceNumber > 0
            ? generateChunkId(document.id, sequenceNumber - 1)
            : null,
          next_chunk_id: null, // Will be set in post-processing
        } as Chunk;

        chunks.push(chunk);
        sequenceNumber++;
      }
    }
  }

  // Post-process: set next_chunk_id
  for (let i = 0; i < chunks.length - 1; i++) {
    chunks[i].next_chunk_id = chunks[i + 1].chunk_id;
  }

  return chunks;
}

/**
 * Re-link chunks after merging changes the sequence.
 */
function relinkChunks(chunks: Chunk[], documentId: string): void {
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].chunk_id = generateChunkId(documentId, i);
    chunks[i].sequence_number = i;
    chunks[i].previous_chunk_id = i > 0 ? generateChunkId(documentId, i - 1) : null;
    chunks[i].next_chunk_id = i < chunks.length - 1 ? generateChunkId(documentId, i + 1) : null;
  }
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
      if (!index.figure_to_chunks[figRef.figure_id]) {
        index.figure_to_chunks[figRef.figure_id] = [];
      }
      index.figure_to_chunks[figRef.figure_id].push(chunk.chunk_id);
    }
  }

  return index;
}

// Export for testing
export { loadDocument, processBlocks, buildChunkIndex };
