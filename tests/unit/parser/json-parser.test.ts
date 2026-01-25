/**
 * Tests for JSON parser that extracts blocks from Rhoton PDF JSON.
 * TDD: Write tests first, ensure they FAIL, then implement.
 */

import { describe, it, expect } from "bun:test";
import {
  parseJsonDocument,
  extractBlocks,
  parseBlockType,
  parseBoundingBox,
  extractHierarchy,
  type SourceBlock,
} from "../../../src/services/parser/json-parser.ts";

describe("JSON Parser", () => {
  describe("parseBlockType", () => {
    it("converts SectionHeader to section_header", () => {
      expect(parseBlockType("SectionHeader")).toBe("section_header");
    });

    it("converts Text to text", () => {
      expect(parseBlockType("Text")).toBe("text");
    });

    it("converts FigureCaption to figure_caption", () => {
      expect(parseBlockType("FigureCaption")).toBe("figure_caption");
    });

    it("converts PageHeader to page_header", () => {
      expect(parseBlockType("PageHeader")).toBe("page_header");
    });

    it("converts Equation to inline_math", () => {
      expect(parseBlockType("Equation")).toBe("inline_math");
    });

    it("defaults unknown types to text", () => {
      expect(parseBlockType("UnknownType")).toBe("text");
    });
  });

  describe("parseBoundingBox", () => {
    it("parses 4-element bbox array", () => {
      const bbox = parseBoundingBox([10.5, 20.3, 100.0, 50.7]);
      expect(bbox).toEqual({ x1: 10.5, y1: 20.3, x2: 100.0, y2: 50.7 });
    });

    it("returns zero bbox for invalid input", () => {
      expect(parseBoundingBox(null)).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
      expect(parseBoundingBox(undefined)).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
      expect(parseBoundingBox([1, 2])).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
    });
  });

  describe("extractHierarchy", () => {
    it("extracts section IDs from section_hierarchy object", () => {
      const hierarchy = {
        "1": "/page/0/SectionHeader/1",
        "2": "/page/0/SectionHeader/2",
      };
      const result = extractHierarchy(hierarchy);
      expect(result).toEqual([
        "/page/0/SectionHeader/1",
        "/page/0/SectionHeader/2",
      ]);
    });

    it("returns empty array for empty hierarchy", () => {
      expect(extractHierarchy({})).toEqual([]);
      expect(extractHierarchy(null)).toEqual([]);
    });

    it("sorts hierarchy by level number", () => {
      const hierarchy = {
        "3": "/page/0/SectionHeader/3",
        "1": "/page/0/SectionHeader/1",
        "2": "/page/0/SectionHeader/2",
      };
      const result = extractHierarchy(hierarchy);
      expect(result).toEqual([
        "/page/0/SectionHeader/1",
        "/page/0/SectionHeader/2",
        "/page/0/SectionHeader/3",
      ]);
    });
  });

  describe("extractBlocks", () => {
    it("extracts blocks from page children", () => {
      const pageData = {
        block_type: "Page",
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p>Test content</p>",
            bbox: [10, 20, 100, 50],
            section_hierarchy: {},
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks.length).toBe(1);
      expect(blocks[0]?.id).toBe("/page/0/Text/0");
      expect(blocks[0]?.block_type).toBe("text");
    });

    it("flattens nested children", () => {
      const pageData = {
        block_type: "Page",
        children: [
          {
            id: "/page/0/SectionHeader/0",
            block_type: "SectionHeader",
            html: "<h1>Title</h1>",
            bbox: [10, 20, 100, 50],
            section_hierarchy: {},
            children: [
              {
                id: "/page/0/Text/1",
                block_type: "Text",
                html: "<p>Nested</p>",
                bbox: [10, 60, 100, 90],
                section_hierarchy: {},
              },
            ],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks.length).toBe(2);
    });

    it("preserves source block IDs (Constitution Principle I)", () => {
      const pageData = {
        block_type: "Page",
        children: [
          {
            id: "/page/5/FigureCaption/12",
            block_type: "FigureCaption",
            html: "<p>Fig. 4.1 caption</p>",
            bbox: [0, 0, 100, 50],
            section_hierarchy: {},
          },
        ],
      };
      const blocks = extractBlocks(pageData, 5);
      expect(blocks[0]?.id).toBe("/page/5/FigureCaption/12");
    });
  });

  describe("parseJsonDocument", () => {
    it("parses document with multiple pages", async () => {
      const documentJson = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              {
                id: "/page/0/Text/0",
                block_type: "Text",
                html: "<p>Page 0</p>",
                bbox: [10, 20, 100, 50],
                section_hierarchy: {},
              },
            ],
          },
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              {
                id: "/page/1/Text/0",
                block_type: "Text",
                html: "<p>Page 1</p>",
                bbox: [10, 20, 100, 50],
                section_hierarchy: {},
              },
            ],
          },
        ],
      };
      const result = parseJsonDocument(documentJson);
      expect(result.pages.length).toBe(2);
      expect(result.pages[0]?.page_number).toBe(0);
      expect(result.pages[1]?.page_number).toBe(1);
    });

    it("extracts total block count", async () => {
      const documentJson = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/0/Text/0", block_type: "Text", html: "", bbox: [0, 0, 0, 0], section_hierarchy: {} },
              { id: "/page/0/Text/1", block_type: "Text", html: "", bbox: [0, 0, 0, 0], section_hierarchy: {} },
            ],
          },
        ],
      };
      const result = parseJsonDocument(documentJson);
      expect(result.totalBlocks).toBe(2);
    });

    it("handles empty pages gracefully", () => {
      const documentJson = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: null,
          },
        ],
      };
      const result = parseJsonDocument(documentJson);
      expect(result.pages.length).toBe(1);
      expect(result.pages[0]?.blocks.length).toBe(0);
    });

    it("extracts heading level from HTML tags", () => {
      const documentJson = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/0/SectionHeader/0", block_type: "SectionHeader", html: "<h1>Title</h1>", bbox: [0, 0, 0, 0], section_hierarchy: {} },
              { id: "/page/0/SectionHeader/1", block_type: "SectionHeader", html: "<h2>Subtitle</h2>", bbox: [0, 0, 0, 0], section_hierarchy: {} },
              { id: "/page/0/SectionHeader/2", block_type: "SectionHeader", html: "<h4>Deep</h4>", bbox: [0, 0, 0, 0], section_hierarchy: {} },
            ],
          },
        ],
      };
      const result = parseJsonDocument(documentJson);
      expect(result.pages[0]?.blocks[0]?.level).toBe(1);
      expect(result.pages[0]?.blocks[1]?.level).toBe(2);
      expect(result.pages[0]?.blocks[2]?.level).toBe(4);
    });
  });
});
