/**
 * Tests for figure map writer module.
 * Covers writing FigureMap to JSON file with schema validation.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { writeFigureMap } from "../../../src/services/writer/figure-map-writer.ts";
import type { FigureMap } from "../../../src/models/figure.ts";

// Mock Bun.write to avoid actual file writes
const originalBunWrite = Bun.write;

describe("figureMapWriter", () => {
  let capturedPath: string;
  let capturedContent: string;

  beforeEach(() => {
    capturedPath = "";
    capturedContent = "";
    // @ts-expect-error - mocking Bun.write
    Bun.write = mock(async (path: string, content: string) => {
      capturedPath = path;
      capturedContent = content;
      return content.length;
    });
  });

  afterEach(() => {
    Bun.write = originalBunWrite;
  });

  /**
   * Creates a valid minimal FigureMap for testing.
   */
  function createValidFigureMap(overrides: Partial<FigureMap> = {}): FigureMap {
    return {
      document_id: "test-document",
      figures: {},
      summary: {
        total_figures: 0,
        mapped_count: 0,
        unmapped_count: 0,
        coverage_percentage: 100,
      },
      ...overrides,
    };
  }

  describe("writeFigureMap", () => {
    it("should write valid figure map to file", async () => {
      const figureMap = createValidFigureMap();
      const outputPath = "/output/figure-map.json";

      await writeFigureMap(figureMap, outputPath);

      expect(capturedPath).toBe(outputPath);
      const parsed = JSON.parse(capturedContent);
      expect(parsed.document_id).toBe("test-document");
    });

    it("should format JSON with 2-space indentation", async () => {
      const figureMap = createValidFigureMap();
      const outputPath = "/output/figure-map.json";

      await writeFigureMap(figureMap, outputPath);

      expect(capturedContent).toContain('  "document_id"');
      expect(capturedContent).not.toContain("\t");
    });

    it("should handle empty figure map", async () => {
      const figureMap = createValidFigureMap({
        figures: {},
        summary: {
          total_figures: 0,
          mapped_count: 0,
          unmapped_count: 0,
          coverage_percentage: 100,
        },
      });
      const outputPath = "/output/empty-figures.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(Object.keys(parsed.figures)).toHaveLength(0);
      expect(parsed.summary.total_figures).toBe(0);
    });

    it("should handle figure map with mapped figures", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 1.1": {
            figure_id: "Fig. 1.1",
            image_file: "figure-1-1.png",
            image_path: "/images/figure-1-1.png",
            page_number: 5,
            caption: "Figure 1.1: The cerebral arteries",
            abbreviations: { A: "Artery", ICA: "Internal carotid artery" },
            status: "mapped",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 1,
          unmapped_count: 0,
          coverage_percentage: 100,
        },
      });
      const outputPath = "/output/mapped-figures.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.figures["Fig. 1.1"]).toBeDefined();
      expect(parsed.figures["Fig. 1.1"].status).toBe("mapped");
      expect(parsed.figures["Fig. 1.1"].image_file).toBe("figure-1-1.png");
    });

    it("should handle figure map with unmapped figures", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 2.3": {
            figure_id: "Fig. 2.3",
            page_number: 10,
            caption: "Figure 2.3: Missing image reference",
            abbreviations: {},
            status: "unresolved",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 0,
          unmapped_count: 1,
          coverage_percentage: 0,
        },
      });
      const outputPath = "/output/unmapped-figures.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.figures["Fig. 2.3"].status).toBe("unresolved");
      expect(parsed.figures["Fig. 2.3"].image_file).toBeUndefined();
    });

    it("should handle figure map with no-image-in-caption status", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 3.1": {
            figure_id: "Fig. 3.1",
            page_number: 15,
            caption: "Figure 3.1: Reference without image in caption",
            abbreviations: {},
            status: "no-image-in-caption",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 0,
          unmapped_count: 1,
          coverage_percentage: 0,
        },
      });
      const outputPath = "/output/no-image-caption.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.figures["Fig. 3.1"].status).toBe("no-image-in-caption");
    });

    it("should handle multiple figures with mixed statuses", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 1.1": {
            figure_id: "Fig. 1.1",
            image_file: "fig1-1.png",
            image_path: "/images/fig1-1.png",
            page_number: 1,
            caption: "Figure 1.1: Mapped figure",
            abbreviations: {},
            status: "mapped",
          },
          "Fig. 1.2": {
            figure_id: "Fig. 1.2",
            page_number: 2,
            caption: "Figure 1.2: Unresolved figure",
            abbreviations: {},
            status: "unresolved",
          },
          "Fig. 1.3": {
            figure_id: "Fig. 1.3",
            page_number: 3,
            caption: "Figure 1.3: No image in caption",
            abbreviations: {},
            status: "no-image-in-caption",
          },
        },
        summary: {
          total_figures: 3,
          mapped_count: 1,
          unmapped_count: 2,
          coverage_percentage: 33.33,
          by_status: {
            mapped: 1,
            "no-image-in-caption": 1,
            unresolved: 1,
          },
        },
      });
      const outputPath = "/output/mixed-figures.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(Object.keys(parsed.figures)).toHaveLength(3);
      expect(parsed.summary.total_figures).toBe(3);
      expect(parsed.summary.coverage_percentage).toBe(33.33);
    });

    it("should handle figures with complex abbreviations", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 4.5": {
            figure_id: "Fig. 4.5",
            image_file: "fig4-5.png",
            image_path: "/images/fig4-5.png",
            page_number: 25,
            caption: "Figure 4.5: Complex anatomical structure",
            abbreviations: {
              A: "Artery",
              V: "Vein",
              N: "Nerve",
              "M.": "Muscle",
              ICA: "Internal carotid artery",
              MCA: "Middle cerebral artery",
            },
            status: "mapped",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 1,
          unmapped_count: 0,
          coverage_percentage: 100,
        },
      });
      const outputPath = "/output/complex-abbrevs.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.figures["Fig. 4.5"].abbreviations.ICA).toBe("Internal carotid artery");
      expect(Object.keys(parsed.figures["Fig. 4.5"].abbreviations)).toHaveLength(6);
    });

    it("should handle figures with referencing blocks", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 5.1": {
            figure_id: "Fig. 5.1",
            image_file: "fig5-1.png",
            image_path: "/images/fig5-1.png",
            page_number: 30,
            caption: "Figure 5.1: Referenced figure",
            caption_block_id: "/page/30/figure_caption/0",
            abbreviations: {},
            status: "mapped",
            referencing_blocks: [
              "/page/28/text/3",
              "/page/29/text/1",
              "/page/31/text/0",
            ],
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 1,
          unmapped_count: 0,
          coverage_percentage: 100,
        },
      });
      const outputPath = "/output/with-refs.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.figures["Fig. 5.1"].referencing_blocks).toHaveLength(3);
      expect(parsed.figures["Fig. 5.1"].caption_block_id).toBe("/page/30/figure_caption/0");
    });

    it("should reject figure with invalid figure_id format", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Figure 1": {
            figure_id: "Figure 1", // Invalid: must be "Fig. X.Y" format
            page_number: 1,
            caption: "Invalid figure ID",
            abbreviations: {},
            status: "unresolved",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 0,
          unmapped_count: 1,
          coverage_percentage: 0,
        },
      });
      const outputPath = "/output/invalid-id.json";

      await expect(writeFigureMap(figureMap, outputPath)).rejects.toThrow();
    });

    it("should reject mapped figure without image_file", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 1.1": {
            figure_id: "Fig. 1.1",
            // Missing image_file but status is "mapped"
            page_number: 1,
            caption: "Mapped but no image",
            abbreviations: {},
            status: "mapped",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 1,
          unmapped_count: 0,
          coverage_percentage: 100,
        },
      });
      const outputPath = "/output/missing-image.json";

      await expect(writeFigureMap(figureMap, outputPath)).rejects.toThrow();
    });

    it("should reject figure with empty caption", async () => {
      const figureMap = createValidFigureMap({
        figures: {
          "Fig. 1.1": {
            figure_id: "Fig. 1.1",
            page_number: 1,
            caption: "", // Invalid: must be non-empty
            abbreviations: {},
            status: "unresolved",
          },
        },
        summary: {
          total_figures: 1,
          mapped_count: 0,
          unmapped_count: 1,
          coverage_percentage: 0,
        },
      });
      const outputPath = "/output/empty-caption.json";

      await expect(writeFigureMap(figureMap, outputPath)).rejects.toThrow();
    });

    it("should reject invalid coverage percentage over 100", async () => {
      const figureMap = createValidFigureMap({
        summary: {
          total_figures: 1,
          mapped_count: 1,
          unmapped_count: 0,
          coverage_percentage: 150, // Invalid: must be 0-100
        },
      });
      const outputPath = "/output/invalid-coverage.json";

      await expect(writeFigureMap(figureMap, outputPath)).rejects.toThrow();
    });

    it("should use provided output path exactly", async () => {
      const figureMap = createValidFigureMap();
      const outputPath = "/custom/deep/path/figure-map.json";

      await writeFigureMap(figureMap, outputPath);

      expect(capturedPath).toBe(outputPath);
    });

    it("should preserve summary by_status breakdown", async () => {
      const figureMap = createValidFigureMap({
        summary: {
          total_figures: 10,
          mapped_count: 7,
          unmapped_count: 3,
          coverage_percentage: 70,
          by_status: {
            mapped: 7,
            "no-image-in-caption": 2,
            unresolved: 1,
          },
        },
      });
      const outputPath = "/output/with-breakdown.json";

      await writeFigureMap(figureMap, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.summary.by_status).toBeDefined();
      expect(parsed.summary.by_status.mapped).toBe(7);
      expect(parsed.summary.by_status["no-image-in-caption"]).toBe(2);
      expect(parsed.summary.by_status.unresolved).toBe(1);
    });
  });
});
