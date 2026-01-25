/**
 * Contract tests to validate Zod schemas match JSON Schema contracts.
 * These tests ensure our runtime validation matches the contract definitions.
 */

import { describe, it, expect } from "bun:test";
import {
  RhotonDocumentSchema,
  FigureMapSchema,
  ValidationReportSchema,
  ContentBlockSchema,
  FigureReferenceSchema,
  BoundingBoxSchema,
} from "../../src/models/schemas.ts";

describe("ContentBlock Schema", () => {
  it("accepts valid block with correct id format", () => {
    const validBlock = {
      id: "/page/0/text/1",
      block_type: "text",
      level: 0,
      content: "Sample content",
      raw_html: "<p>Sample content</p>",
      parent_hierarchy: ["Chapter 1", "Section 1.1"],
      figure_references: [],
      bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
      section_id: "section-1-1",
    };
    expect(() => ContentBlockSchema.parse(validBlock)).not.toThrow();
  });

  it("rejects invalid block id format", () => {
    const invalidBlock = {
      id: "invalid-id",
      block_type: "text",
      level: 0,
      content: "Sample content",
      raw_html: "<p>Sample content</p>",
      parent_hierarchy: [],
      figure_references: [],
      bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
      section_id: "section-1",
    };
    expect(() => ContentBlockSchema.parse(invalidBlock)).toThrow();
  });

  it("accepts all valid block types", () => {
    const blockTypes = [
      "section_header",
      "text",
      "figure_caption",
      "page_header",
      "inline_math",
    ];
    for (const blockType of blockTypes) {
      const block = {
        id: "/page/0/text/0",
        block_type: blockType,
        level: 0,
        content: "",
        raw_html: "",
        parent_hierarchy: [],
        figure_references: [],
        bbox: { x1: 0, y1: 0, x2: 0, y2: 0 },
        section_id: "",
      };
      expect(() => ContentBlockSchema.parse(block)).not.toThrow();
    }
  });

  it("rejects invalid block type", () => {
    const invalidBlock = {
      id: "/page/0/text/0",
      block_type: "invalid_type",
      level: 0,
      content: "",
      raw_html: "",
      parent_hierarchy: [],
      figure_references: [],
      bbox: { x1: 0, y1: 0, x2: 0, y2: 0 },
      section_id: "",
    };
    expect(() => ContentBlockSchema.parse(invalidBlock)).toThrow();
  });

  it("rejects level outside 0-6 range", () => {
    const invalidBlock = {
      id: "/page/0/text/0",
      block_type: "section_header",
      level: 7,
      content: "",
      raw_html: "",
      parent_hierarchy: [],
      figure_references: [],
      bbox: { x1: 0, y1: 0, x2: 0, y2: 0 },
      section_id: "",
    };
    expect(() => ContentBlockSchema.parse(invalidBlock)).toThrow();
  });
});

describe("BoundingBox Schema", () => {
  it("accepts valid bounding box", () => {
    const validBbox = { x1: 0, y1: 10, x2: 100, y2: 50 };
    expect(() => BoundingBoxSchema.parse(validBbox)).not.toThrow();
  });

  it("rejects negative coordinates", () => {
    const invalidBbox = { x1: -1, y1: 0, x2: 100, y2: 50 };
    expect(() => BoundingBoxSchema.parse(invalidBbox)).toThrow();
  });
});

describe("FigureReference Schema", () => {
  it("accepts valid mapped figure with image_file", () => {
    const validFigure = {
      figure_id: "Fig. 4.1",
      image_file: "_page_10_Figure_1.jpeg",
      page_number: 10,
      caption: "The cerebral veins",
      abbreviations: { A: "artery", V: "vein" },
      status: "mapped",
    };
    expect(() => FigureReferenceSchema.parse(validFigure)).not.toThrow();
  });

  it("rejects mapped figure without image_file", () => {
    const invalidFigure = {
      figure_id: "Fig. 4.1",
      page_number: 10,
      caption: "The cerebral veins",
      abbreviations: {},
      status: "mapped",
    };
    expect(() => FigureReferenceSchema.parse(invalidFigure)).toThrow();
  });

  it("accepts unresolved figure without image_file", () => {
    const validFigure = {
      figure_id: "Fig. 4.2",
      page_number: 11,
      caption: "Unknown figure",
      abbreviations: {},
      status: "unresolved",
    };
    expect(() => FigureReferenceSchema.parse(validFigure)).not.toThrow();
  });

  it("accepts no-image-in-caption figure without image_file", () => {
    const validFigure = {
      figure_id: "Fig. 4.3",
      page_number: 12,
      caption: "Figure without inline image",
      abbreviations: {},
      status: "no-image-in-caption",
    };
    expect(() => FigureReferenceSchema.parse(validFigure)).not.toThrow();
  });

  it("rejects invalid figure_id format", () => {
    const invalidFigure = {
      figure_id: "Figure 4.1", // Should be "Fig. X.Y"
      page_number: 10,
      caption: "Test",
      abbreviations: {},
      status: "unresolved",
    };
    expect(() => FigureReferenceSchema.parse(invalidFigure)).toThrow();
  });

  it("accepts all valid status values", () => {
    const statuses = ["mapped", "no-image-in-caption", "unresolved"];
    for (const status of statuses) {
      const figure = {
        figure_id: "Fig. 1.1",
        page_number: 0,
        caption: "Test",
        abbreviations: {},
        status,
        ...(status === "mapped" ? { image_file: "test.jpg" } : {}),
      };
      expect(() => FigureReferenceSchema.parse(figure)).not.toThrow();
    }
  });
});

describe("RhotonDocument Schema", () => {
  const minimalValidDocument = {
    id: "test-document",
    title: "Test Document",
    author: "Test Author",
    source_files: {
      json: "./test.json",
      markdown: "./test.md",
      image_dir: "./images/",
    },
    pages: [
      {
        page_number: 0,
        blocks: [
          {
            id: "/page/0/text/0",
            block_type: "text",
            level: 0,
            content: "Test content",
            raw_html: "<p>Test content</p>",
            parent_hierarchy: [],
            figure_references: [],
            bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
            section_id: "intro",
          },
        ],
      },
    ],
    figure_map: {},
    metadata: {
      processed_at: "2024-01-15T10:30:00Z",
      pipeline_version: "1.0.0",
      source_json_lines: 1000,
      source_markdown_lines: 500,
      total_images: 50,
      parse_rate: 100,
      ligature_count: 0,
      figure_coverage: 95.5,
    },
  };

  it("accepts minimal valid document", () => {
    expect(() => RhotonDocumentSchema.parse(minimalValidDocument)).not.toThrow();
  });

  it("rejects document with invalid id format", () => {
    const invalid = { ...minimalValidDocument, id: "Invalid-ID" };
    expect(() => RhotonDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects document with empty pages array", () => {
    const invalid = { ...minimalValidDocument, pages: [] };
    expect(() => RhotonDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects document with missing required fields", () => {
    const { title, ...missingTitle } = minimalValidDocument;
    expect(() => RhotonDocumentSchema.parse(missingTitle)).toThrow();
  });

  it("validates metadata ranges", () => {
    const invalidParseRate = {
      ...minimalValidDocument,
      metadata: { ...minimalValidDocument.metadata, parse_rate: 101 },
    };
    expect(() => RhotonDocumentSchema.parse(invalidParseRate)).toThrow();

    const invalidLigatureCount = {
      ...minimalValidDocument,
      metadata: { ...minimalValidDocument.metadata, ligature_count: -1 },
    };
    expect(() => RhotonDocumentSchema.parse(invalidLigatureCount)).toThrow();
  });
});

describe("FigureMap Schema", () => {
  it("accepts valid figure map", () => {
    const validMap = {
      document_id: "test-doc",
      figures: {
        "Fig. 1.1": {
          figure_id: "Fig. 1.1",
          image_file: "test.jpg",
          page_number: 1,
          caption: "Test caption",
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
    };
    expect(() => FigureMapSchema.parse(validMap)).not.toThrow();
  });

  it("accepts figure map with optional by_status", () => {
    const validMap = {
      document_id: "test-doc",
      figures: {},
      summary: {
        total_figures: 0,
        mapped_count: 0,
        unmapped_count: 0,
        coverage_percentage: 0,
        by_status: {
          mapped: 0,
          "no-image-in-caption": 0,
          unresolved: 0,
        },
      },
    };
    expect(() => FigureMapSchema.parse(validMap)).not.toThrow();
  });
});

describe("ValidationReport Schema", () => {
  it("accepts valid passing report", () => {
    const validReport = {
      document_id: "test-doc",
      timestamp: "2024-01-15T10:30:00Z",
      gates: {
        parse_rate: {
          name: "Parse Rate",
          threshold: "100%",
          actual: 100,
          status: "pass",
        },
        ligature_count: {
          name: "Ligature Count",
          threshold: "0",
          actual: 0,
          status: "pass",
        },
        figure_coverage: {
          name: "Figure Coverage",
          threshold: ">90%",
          actual: 94.5,
          status: "pass",
        },
      },
      overall_status: "pass",
    };
    expect(() => ValidationReportSchema.parse(validReport)).not.toThrow();
  });

  it("accepts valid failing report with failures array", () => {
    const validReport = {
      document_id: "test-doc",
      timestamp: "2024-01-15T10:30:00Z",
      gates: {
        parse_rate: {
          name: "Parse Rate",
          threshold: "100%",
          actual: 98,
          status: "fail",
        },
        ligature_count: {
          name: "Ligature Count",
          threshold: "0",
          actual: 0,
          status: "pass",
        },
        figure_coverage: {
          name: "Figure Coverage",
          threshold: ">90%",
          actual: 94.5,
          status: "pass",
        },
      },
      overall_status: "fail",
      failures: [
        {
          gate: "parse_rate",
          reason: "Parse rate 98% is below threshold 100%",
          affected_items: [
            { id: "/page/5/text/3", description: "Malformed JSON block" },
          ],
        },
      ],
    };
    expect(() => ValidationReportSchema.parse(validReport)).not.toThrow();
  });

  it("rejects invalid timestamp format", () => {
    const invalidReport = {
      document_id: "test-doc",
      timestamp: "invalid-date",
      gates: {
        parse_rate: { name: "Test", threshold: "100%", actual: 100, status: "pass" },
        ligature_count: { name: "Test", threshold: "0", actual: 0, status: "pass" },
        figure_coverage: { name: "Test", threshold: ">90%", actual: 95, status: "pass" },
      },
      overall_status: "pass",
    };
    expect(() => ValidationReportSchema.parse(invalidReport)).toThrow();
  });
});
