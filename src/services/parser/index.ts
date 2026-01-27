/**
 * Parser orchestrator - combines JSON and Markdown parsing into RhotonDocument.
 */

import type { RhotonDocument, RhotonPage, SourceFiles, DocumentMetadata } from "../../models/document.ts";
import type { FigureReference } from "../../models/figure.ts";
import { parseJsonFile, type JsonParseResult } from "./json-parser.ts";
import { parseMarkdownFile, type MarkdownParseResult } from "./markdown-parser.ts";
import { loadConfig, type PipelineConfig } from "../../lib/config.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("parser");

export interface ParseResult {
  document: RhotonDocument;
  jsonResult: JsonParseResult;
  markdownResult: MarkdownParseResult;
}

/**
 * Counts total images in a directory.
 */
async function countImages(imageDir: string): Promise<number> {
  const glob = new Bun.Glob("*.{jpg,jpeg,png,gif}");
  let count = 0;
  for await (const _file of glob.scan({ cwd: imageDir })) {
    count++;
  }
  return count;
}

/**
 * Parses all source files and produces a RhotonDocument.
 */
export async function parseSourceFiles(config?: PipelineConfig): Promise<ParseResult> {
  const cfg = config ?? (await loadConfig());

  log.info("Starting source file parsing", {
    json: cfg.sources.json,
    markdown: cfg.sources.markdown,
    imageDir: cfg.sources.imageDir,
  });

  // Parse both files in parallel
  const [jsonResult, markdownResult] = await Promise.all([
    parseJsonFile(cfg.sources.json),
    parseMarkdownFile(cfg.sources.markdown),
  ]);

  // Count images
  const totalImages = await countImages(cfg.sources.imageDir);

  // Build source files reference
  const sourceFiles: SourceFiles = {
    json: cfg.sources.json,
    markdown: cfg.sources.markdown,
    image_dir: cfg.sources.imageDir,
  };

  // Build metadata (quality metrics filled in later by validators)
  const metadata: DocumentMetadata = {
    processed_at: new Date().toISOString(),
    pipeline_version: "1.0.0",
    source_json_lines: jsonResult.totalBlocks,
    source_markdown_lines: markdownResult.totalLines,
    total_images: totalImages,
    parse_rate: 100, // Will be validated
    ligature_count: 0, // Will be calculated after normalization
    figure_coverage: 0, // Will be calculated after figure mapping
  };

  // Build document
  const document: RhotonDocument = {
    id: cfg.document.id,
    title: cfg.document.title,
    author: cfg.document.author,
    source_files: sourceFiles,
    pages: jsonResult.pages,
    figure_map: {}, // Will be populated by figure mapper
    metadata,
  };

  log.info("Source file parsing complete", {
    pageCount: document.pages.length,
    totalBlocks: jsonResult.totalBlocks,
    totalImages,
  });

  return { document, jsonResult, markdownResult };
}

// Re-export for convenience
export { parseJsonFile, parseJsonDocument, parseBlockType, parseBoundingBox, extractHierarchy, extractBlocks } from "./json-parser.ts";
export { parseMarkdownFile, parseMarkdown, detectPageBoundaries, extractPageContent } from "./markdown-parser.ts";
export type { JsonParseResult, SourceBlock } from "./json-parser.ts";
export type { MarkdownParseResult, MarkdownPage, PageBoundary } from "./markdown-parser.ts";
