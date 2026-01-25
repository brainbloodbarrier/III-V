/**
 * Writer module - orchestrates all output file generation.
 */

import type { RhotonDocument } from "../../models/document.ts";
import type { FigureMap } from "../../models/figure.ts";
import { writeDocument } from "./document-writer.ts";
import { writeFigureMap } from "./figure-map-writer.ts";
import { writeMarkdown } from "./markdown-writer.ts";
import { getOutputPath, type PipelineConfig } from "../../lib/config.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("writer");

export interface WriteResult {
  documentPath: string;
  figureMapPath: string;
  markdownPath: string;
}

/**
 * Writes all output files.
 */
export async function writeAllOutputs(
  document: RhotonDocument,
  figureMap: FigureMap,
  config: PipelineConfig
): Promise<WriteResult> {
  // Ensure output directory exists
  const baseDir = config.output.baseDir;
  await Bun.write(`${baseDir}/.gitkeep`, "");

  const documentPath = getOutputPath(config, "document");
  const figureMapPath = getOutputPath(config, "figureMap");
  const markdownPath = getOutputPath(config, "content");

  log.info("Writing all outputs", { baseDir });

  // Write all files in parallel
  await Promise.all([
    writeDocument(document, documentPath),
    writeFigureMap(figureMap, figureMapPath),
    writeMarkdown(document, markdownPath),
  ]);

  log.info("All outputs written successfully");

  return {
    documentPath,
    figureMapPath,
    markdownPath,
  };
}

// Re-export individual writers
export { writeDocument } from "./document-writer.ts";
export { writeFigureMap } from "./figure-map-writer.ts";
export { writeMarkdown } from "./markdown-writer.ts";
