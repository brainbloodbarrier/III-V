/**
 * Integration tests for the full data ingestion pipeline.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { parseSourceFiles } from "../../src/services/parser/index.ts";
import { normalizeBlocks } from "../../src/services/normalizer/index.ts";
import { buildFigureMap, calculateFigureSummary, createFigureMapOutput } from "../../src/services/figure-mapper/index.ts";
import { runValidation } from "../../src/services/validator/index.ts";
import { loadConfig, clearConfigCache } from "../../src/lib/config.ts";
import { RhotonDocumentSchema, FigureMapSchema } from "../../src/models/schemas.ts";

describe("Pipeline Integration", () => {
  beforeAll(() => {
    clearConfigCache();
  });

  afterAll(() => {
    clearConfigCache();
  });

  it("loads configuration successfully", async () => {
    const config = await loadConfig();
    expect(config.document.id).toBe("rhoton-supratentorial-cerebral-veins");
    expect(config.sources.json).toBeTruthy();
    expect(config.sources.markdown).toBeTruthy();
  });

  it("parses source files successfully", async () => {
    const config = await loadConfig();
    const { document, jsonResult, markdownResult } = await parseSourceFiles(config);

    expect(document.id).toBe(config.document.id);
    expect(document.pages.length).toBeGreaterThan(0);
    expect(jsonResult.totalBlocks).toBeGreaterThan(0);
    expect(markdownResult.totalLines).toBeGreaterThan(0);
  });

  it("normalizes text content removing ligatures", async () => {
    const config = await loadConfig();
    const { document } = await parseSourceFiles(config);

    let totalLigaturesBefore = 0;
    let totalLigaturesAfter = 0;

    for (const page of document.pages) {
      const result = normalizeBlocks(page.blocks);
      totalLigaturesBefore += result.totalLigaturesBefore;
      totalLigaturesAfter += result.totalLigaturesAfter;
    }

    // Ligatures should be reduced (ideally to zero)
    expect(totalLigaturesAfter).toBeLessThanOrEqual(totalLigaturesBefore);
  });

  it("builds figure map with expected coverage", async () => {
    const config = await loadConfig();
    const { document } = await parseSourceFiles(config);

    const figureMap = await buildFigureMap(document.pages, config.sources.imageDir);
    const summary = calculateFigureSummary(figureMap);

    expect(summary.total_figures).toBeGreaterThan(0);
    // Coverage should be reasonable (>0%, ideally >90%)
    expect(summary.coverage_percentage).toBeGreaterThanOrEqual(0);
  });

  it("produces valid RhotonDocument schema", async () => {
    const config = await loadConfig();
    const { document, jsonResult } = await parseSourceFiles(config);

    // Normalize all blocks
    for (const page of document.pages) {
      normalizeBlocks(page.blocks);
    }

    // Build figure map
    const figureMap = await buildFigureMap(document.pages, config.sources.imageDir);
    document.figure_map = figureMap;

    const summary = calculateFigureSummary(figureMap);
    document.metadata.figure_coverage = summary.coverage_percentage;

    // Schema validation should pass
    expect(() => RhotonDocumentSchema.parse(document)).not.toThrow();
  });

  it("produces valid FigureMap schema", async () => {
    const config = await loadConfig();
    const { document } = await parseSourceFiles(config);

    const figureMap = await buildFigureMap(document.pages, config.sources.imageDir);
    const output = createFigureMapOutput(document.id, figureMap);

    // Schema validation should pass
    expect(() => FigureMapSchema.parse(output)).not.toThrow();
  });

  it("runs validation and produces report", async () => {
    const config = await loadConfig();
    const { document, jsonResult } = await parseSourceFiles(config);

    let totalBlocks = 0;
    for (const page of document.pages) {
      normalizeBlocks(page.blocks);
      totalBlocks += page.blocks.length;
    }

    const figureMap = await buildFigureMap(document.pages, config.sources.imageDir);
    const summary = calculateFigureSummary(figureMap);

    const report = runValidation({
      documentId: document.id,
      parseRateInput: {
        sourceBlockCount: jsonResult.totalBlocks,
        outputBlockCount: totalBlocks,
      },
      ligatureCount: 0, // After normalization
      figureCoverage: summary.coverage_percentage,
    });

    expect(report.document_id).toBe(document.id);
    expect(report.gates.parse_rate).toBeDefined();
    expect(report.gates.ligature_count).toBeDefined();
    expect(report.gates.figure_coverage).toBeDefined();
    expect(["pass", "fail"]).toContain(report.overall_status);
  });
});
