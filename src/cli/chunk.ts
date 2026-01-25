#!/usr/bin/env bun
/**
 * CLI entry point for Phase 2: Structural Chunking
 *
 * Usage:
 *   bun run src/cli/chunk.ts           # Run chunking pipeline
 *   bun run src/cli/chunk.ts --help    # Show help
 */

import { runChunker, type ChunkerConfig } from "../services/chunker";
import { resolve } from "path";

const HELP_TEXT = `
Phase 2: Structural Chunking Pipeline

Usage:
  bun run src/cli/chunk.ts [options]

Options:
  --help          Show this help message
  --verbose       Show detailed progress

Input:
  processed/01_normalized/document.json
  processed/01_normalized/figure_map.json

Output:
  processed/02_chunks/chunks.json
  processed/02_chunks/chunk_index.json
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const verbose = args.includes("--verbose");

  // Resolve paths relative to project root
  const projectRoot = resolve(import.meta.dir, "../..");

  const config: ChunkerConfig = {
    inputPath: resolve(projectRoot, "processed/01_normalized/document.json"),
    figureMapPath: resolve(projectRoot, "processed/01_normalized/figure_map.json"),
    outputDir: resolve(projectRoot, "processed/02_chunks"),
  };

  console.log("=".repeat(60));
  console.log("Phase 2: Structural Chunking Pipeline");
  console.log("=".repeat(60));

  if (verbose) {
    console.log("\nConfiguration:");
    console.log(`  Input:  ${config.inputPath}`);
    console.log(`  Output: ${config.outputDir}`);
  }

  const startTime = Date.now();

  try {
    const result = await runChunker(config);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("Results:");
    console.log("=".repeat(60));
    console.log(`  Total chunks:      ${result.totalChunks}`);
    console.log(`  Sections indexed:  ${Object.keys(result.index.chunks_by_section).length}`);
    console.log(`  Pages indexed:     ${Object.keys(result.index.chunks_by_page).length}`);
    console.log(`  Figures indexed:   ${Object.keys(result.index.figure_to_chunks).length}`);
    console.log(`  Validation:        ${result.validationPassed ? "PASS" : "FAIL"}`);
    console.log(`  Duration:          ${duration}s`);
    console.log("=".repeat(60));

    if (!result.validationPassed) {
      console.error("\n[ERROR] Validation failed - check output for errors");
      process.exit(1);
    }

    console.log("\nOutput files:");
    console.log(`  ${config.outputDir}/chunks.json`);
    console.log(`  ${config.outputDir}/chunk_index.json`);

  } catch (error) {
    console.error("\n[ERROR] Pipeline failed:", error);
    process.exit(1);
  }
}

main();
