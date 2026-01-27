#!/usr/bin/env bun
/**
 * Data Ingestion Pipeline CLI
 *
 * Transforms Rhoton source files (JSON/Markdown/images) into unified RhotonDocument.
 *
 * Usage:
 *   bun run src/cli/ingest.ts [options]
 *
 * Options:
 *   --json <path>       Path to JSON source file
 *   --markdown <path>   Path to Markdown source file
 *   --images <path>     Path to images directory
 *   --validate-only     Only run validation on existing outputs
 *   --help              Show this help message
 */

import { parseSourceFiles } from "../services/parser/index.ts";
import { normalizeBlocks } from "../services/normalizer/index.ts";
import { buildFigureMap, createFigureMapOutput, calculateFigureSummary } from "../services/figure-mapper/index.ts";
import { writeAllOutputs } from "../services/writer/index.ts";
import { runValidation, writeValidationReport, printValidationReport } from "../services/validator/index.ts";
import { loadConfig, getOutputPath, type PipelineConfig } from "../lib/config.ts";
import { createLogger } from "../lib/logger.ts";
import type { RhotonDocument } from "../models/document.ts";

const log = createLogger("cli");

interface CliArgs {
  json?: string;
  markdown?: string;
  images?: string;
  validateOnly: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    validateOnly: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--json":
        result.json = args[++i];
        break;
      case "--markdown":
        result.markdown = args[++i];
        break;
      case "--images":
        result.images = args[++i];
        break;
      case "--validate-only":
        result.validateOnly = true;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Data Ingestion Pipeline CLI

Usage:
  bun run src/cli/ingest.ts [options]

Options:
  --json <path>       Path to JSON source file
  --markdown <path>   Path to Markdown source file
  --images <path>     Path to images directory
  --validate-only     Only run validation on existing outputs
  --help, -h          Show this help message

Examples:
  # Run full pipeline with default config
  bun run src/cli/ingest.ts

  # Run with custom source paths
  bun run src/cli/ingest.ts --json ./data.json --markdown ./data.md --images ./images/

  # Validate existing outputs
  bun run src/cli/ingest.ts --validate-only
`);
}

async function runPipeline(config: PipelineConfig): Promise<void> {
  log.info("Starting data ingestion pipeline");

  // Phase 1: Parse source files
  log.info("Phase 1: Parsing source files");
  const { document, jsonResult } = await parseSourceFiles(config);

  // Phase 2: Normalize text content
  log.info("Phase 2: Normalizing text content");
  let totalBlocks = 0;
  for (const page of document.pages) {
    const { totalLigaturesBefore, totalLigaturesAfter } = normalizeBlocks(page.blocks);
    document.metadata.ligature_count += totalLigaturesAfter;
    totalBlocks += page.blocks.length;
  }

  // Phase 3: Build figure map
  log.info("Phase 3: Building figure map");
  const figureMap = await buildFigureMap(document.pages, config.sources.imageDir);
  document.figure_map = figureMap;

  const figureSummary = calculateFigureSummary(figureMap);
  document.metadata.figure_coverage = figureSummary.coverage_percentage;

  // Phase 4: Write outputs
  log.info("Phase 4: Writing output files");
  const figureMapOutput = createFigureMapOutput(document.id, figureMap);
  await writeAllOutputs(document, figureMapOutput, config);

  // Phase 5: Validate quality gates
  log.info("Phase 5: Validating quality gates");
  const validationReport = runValidation({
    documentId: document.id,
    parseRateInput: {
      sourceBlockCount: jsonResult.totalBlocks,
      outputBlockCount: totalBlocks,
    },
    ligatureCount: document.metadata.ligature_count,
    figureCoverage: figureSummary.coverage_percentage,
  });

  const reportPath = getOutputPath(config, "validationReport");
  await writeValidationReport(validationReport, reportPath);

  // Print results
  printValidationReport(validationReport);

  if (validationReport.overall_status === "fail") {
    log.error("Pipeline failed quality gates");
    process.exit(1);
  }

  log.info("Pipeline completed successfully");
}

async function runValidateOnly(config: PipelineConfig): Promise<void> {
  log.info("Running validation only");

  const documentPath = getOutputPath(config, "document");
  const file = Bun.file(documentPath);

  if (!(await file.exists())) {
    log.error("Document not found - run full pipeline first", { path: documentPath });
    process.exit(1);
  }

  const document = (await file.json()) as RhotonDocument;

  // Count blocks
  let totalBlocks = 0;
  for (const page of document.pages) {
    totalBlocks += page.blocks.length;
  }

  const figureMapPath = getOutputPath(config, "figureMap");
  const figureMapFile = Bun.file(figureMapPath);
  const figureMapData = await figureMapFile.json();

  const validationReport = runValidation({
    documentId: document.id,
    parseRateInput: {
      sourceBlockCount: document.metadata.source_json_lines,
      outputBlockCount: totalBlocks,
    },
    ligatureCount: document.metadata.ligature_count,
    figureCoverage: document.metadata.figure_coverage,
  });

  printValidationReport(validationReport);

  if (validationReport.overall_status === "fail") {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  // Load config, potentially overriding with CLI args
  const config = await loadConfig();

  if (args.json) config.sources.json = args.json;
  if (args.markdown) config.sources.markdown = args.markdown;
  if (args.images) config.sources.imageDir = args.images;

  if (args.validateOnly) {
    await runValidateOnly(config);
  } else {
    await runPipeline(config);
  }
}

main().catch((error) => {
  log.error("Pipeline failed", { error: String(error) });
  console.error(error);
  process.exit(1);
});
