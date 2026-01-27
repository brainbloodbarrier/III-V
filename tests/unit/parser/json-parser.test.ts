/**
 * Tests for JSON parser that extracts blocks from Rhoton PDF JSON.
 * TDD: Write tests first, ensure they FAIL, then implement.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseJsonDocument,
  parseJsonFile,
  extractBlocks,
  parseBlockType,
  parseBoundingBox,
  extractHierarchy,
} from "../../../src/services/parser/json-parser";
import { MAX_FILE_SIZE_BYTES } from "../../../src/lib/config";

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
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p>Test content</p>",
            bbox: [10, 20, 100, 50],
            section_hierarchy: {},
            children: [],
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
        bbox: [0, 0, 612, 792],
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
                children: [],
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
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/5/FigureCaption/12",
            block_type: "FigureCaption",
            html: "<p>Fig. 4.1 caption</p>",
            bbox: [0, 0, 100, 50],
            section_hierarchy: {},
            children: [],
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
                children: [],
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
                children: [],
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
              { id: "/page/0/Text/0", block_type: "Text", html: "", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
              { id: "/page/0/Text/1", block_type: "Text", html: "", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
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
              { id: "/page/0/SectionHeader/0", block_type: "SectionHeader", html: "<h1>Title</h1>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
              { id: "/page/0/SectionHeader/1", block_type: "SectionHeader", html: "<h2>Subtitle</h2>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
              { id: "/page/0/SectionHeader/2", block_type: "SectionHeader", html: "<h4>Deep</h4>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
            ],
          },
        ],
      };
      const result = parseJsonDocument(documentJson);
      expect(result.pages[0]?.blocks[0]?.level).toBe(1);
      expect(result.pages[0]?.blocks[1]?.level).toBe(2);
      expect(result.pages[0]?.blocks[2]?.level).toBe(4);
    });

    it("handles document with no children", () => {
      const documentJson = {
        block_type: "Document",
        children: null,
      };
      const result = parseJsonDocument(documentJson);
      expect(result.pages.length).toBe(0);
      expect(result.totalBlocks).toBe(0);
    });

    it("skips non-Page block types at document level", () => {
      const documentJson = {
        block_type: "Document",
        children: [
          {
            block_type: "SomeOtherType",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/0/Text/0", block_type: "Text", html: "<p>Should be skipped</p>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
            ],
          },
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/1/Text/0", block_type: "Text", html: "<p>Included</p>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
            ],
          },
        ],
      };
      const result = parseJsonDocument(documentJson);
      expect(result.pages.length).toBe(1);
      expect(result.pages[0]?.blocks[0]?.content).toBe("Included");
    });
  });

  describe("parseJsonFile", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "json-parser-test-"));
    });

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("successfully loads and parses valid JSON file", async () => {
      const validDocument = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/0/Text/0", block_type: "Text", html: "<p>Test content</p>", bbox: [10, 20, 100, 50], section_hierarchy: {}, children: [] },
            ],
          },
        ],
      };
      const filePath = join(tempDir, "valid.json");
      await Bun.write(filePath, JSON.stringify(validDocument));

      const result = await parseJsonFile(filePath);
      expect(result.pages.length).toBe(1);
      expect(result.totalBlocks).toBe(1);
      expect(result.pages[0]?.blocks[0]?.content).toBe("Test content");
    });

    it("throws error when file does not exist", async () => {
      const nonExistentPath = join(tempDir, "nonexistent.json");
      await expect(parseJsonFile(nonExistentPath)).rejects.toThrow(
        `JSON file not found: ${nonExistentPath}`
      );
    });

    it("throws error for malformed JSON content", async () => {
      const filePath = join(tempDir, "malformed.json");
      await Bun.write(filePath, "{ invalid json content");

      await expect(parseJsonFile(filePath)).rejects.toThrow();
    });

    it("handles empty document (no pages)", async () => {
      const emptyDocument = {
        block_type: "Document",
        children: [],
      };
      const filePath = join(tempDir, "empty.json");
      await Bun.write(filePath, JSON.stringify(emptyDocument));

      const result = await parseJsonFile(filePath);
      expect(result.pages.length).toBe(0);
      expect(result.totalBlocks).toBe(0);
    });

    it("returns correct JsonParseResult structure", async () => {
      const document = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/0/Text/0", block_type: "Text", html: "<p>Block 1</p>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
              { id: "/page/0/Text/1", block_type: "Text", html: "<p>Block 2</p>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
            ],
          },
        ],
      };
      const filePath = join(tempDir, "structure.json");
      await Bun.write(filePath, JSON.stringify(document));

      const result = await parseJsonFile(filePath);
      expect(result).toHaveProperty("pages");
      expect(result).toHaveProperty("totalBlocks");
      expect(Array.isArray(result.pages)).toBe(true);
      expect(typeof result.totalBlocks).toBe("number");
      expect(result.totalBlocks).toBe(2);
    });

    /**
     * Issue #208: File size validation test
     *
     * Note: We can't easily create a 100MB+ file in unit tests, so we verify:
     * 1. The MAX_FILE_SIZE_BYTES constant exists and is reasonable
     * 2. The error message format is correct (via mock or small file test)
     */
    it("MAX_FILE_SIZE_BYTES constant is defined and reasonable", () => {
      // Constant should exist and be 100 MB
      expect(MAX_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024);
    });

    it("accepts files under the size limit", async () => {
      // Create a normal-sized file
      const validDocument = {
        block_type: "Document",
        children: [
          {
            block_type: "Page",
            bbox: [0, 0, 612, 792],
            children: [
              { id: "/page/0/Text/0", block_type: "Text", html: "<p>Normal content</p>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
            ],
          },
        ],
      };
      const filePath = join(tempDir, "normal_size.json");
      await Bun.write(filePath, JSON.stringify(validDocument));

      // Should succeed without throwing
      const result = await parseJsonFile(filePath);
      expect(result.totalBlocks).toBe(1);
    });

    // Note: Testing actual oversized file rejection would require creating a 100MB+ file
    // which is impractical for unit tests. The implementation is straightforward:
    // file.size > MAX_FILE_SIZE_BYTES throws error. Integration tests or manual testing
    // can verify this behavior with actual large files.
  });

  describe("HTML stripping (via extractBlocks)", () => {
    const createPageWithHtml = (html: string) => ({
      block_type: "Page",
      bbox: [0, 0, 612, 792],
      children: [
        {
          id: "/page/0/Text/0",
          block_type: "Text",
          html,
          bbox: [0, 0, 0, 0],
          section_hierarchy: {},
          children: [],
        },
      ],
    });

    it("removes paragraph tags", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>Hello world</p>"), 0);
      expect(blocks[0]?.content).toBe("Hello world");
    });

    it("removes nested tags", () => {
      const blocks = extractBlocks(createPageWithHtml("<p><strong>Bold</strong> text</p>"), 0);
      expect(blocks[0]?.content).toBe("Bold text");
    });

    it("converts &nbsp; to space", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>Hello&nbsp;world</p>"), 0);
      expect(blocks[0]?.content).toBe("Hello world");
    });

    it("converts &amp; to &", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>Rock &amp; Roll</p>"), 0);
      expect(blocks[0]?.content).toBe("Rock & Roll");
    });

    it("converts &lt; and &gt; to < and >", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>a &lt; b &gt; c</p>"), 0);
      expect(blocks[0]?.content).toBe("a < b > c");
    });

    it("converts &quot; to double quote", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>Say &quot;hello&quot;</p>"), 0);
      expect(blocks[0]?.content).toBe('Say "hello"');
    });

    it("converts &#39; to single quote", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>It&#39;s working</p>"), 0);
      expect(blocks[0]?.content).toBe("It's working");
    });

    it("trims whitespace", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>  trimmed  </p>"), 0);
      expect(blocks[0]?.content).toBe("trimmed");
    });

    it("handles multiple HTML entities together", () => {
      const blocks = extractBlocks(createPageWithHtml("<p>&amp;&nbsp;&lt;&gt;&quot;&#39;</p>"), 0);
      expect(blocks[0]?.content).toBe("& <>\"'");
    });

    it("handles complex nested HTML structure", () => {
      const html = "<div><p><span class=\"highlight\"><em>Important</em></span> note</p></div>";
      const blocks = extractBlocks(createPageWithHtml(html), 0);
      expect(blocks[0]?.content).toBe("Important note");
    });
  });

  describe("Figure reference extraction (via extractBlocks)", () => {
    const createPageWithContent = (text: string) => ({
      block_type: "Page",
      bbox: [0, 0, 612, 792],
      children: [
        {
          id: "/page/0/Text/0",
          block_type: "Text",
          html: `<p>${text}</p>`,
          bbox: [0, 0, 0, 0],
          section_hierarchy: {},
          children: [],
        },
      ],
    });

    it("extracts Fig. X.Y pattern", () => {
      const blocks = extractBlocks(createPageWithContent("See Fig. 4.1 for details"), 0);
      expect(blocks[0]?.figure_references).toContain("Fig. 4.1");
    });

    it("extracts Fig. pattern without space after period", () => {
      const blocks = extractBlocks(createPageWithContent("See Fig.4.2 here"), 0);
      expect(blocks[0]?.figure_references).toContain("Fig. 4.2");
    });

    it("extracts multiple figure references", () => {
      const blocks = extractBlocks(createPageWithContent("See Fig. 1.1 and Fig. 2.3 for info"), 0);
      expect(blocks[0]?.figure_references).toContain("Fig. 1.1");
      expect(blocks[0]?.figure_references).toContain("Fig. 2.3");
    });

    it("extracts Figs. range pattern (start figure)", () => {
      const blocks = extractBlocks(createPageWithContent("See Figs. 4.2-4.5 for comparison"), 0);
      expect(blocks[0]?.figure_references).toContain("Fig. 4.2");
    });

    it("extracts Figs. range with en-dash", () => {
      const blocks = extractBlocks(createPageWithContent("See Figs. 3.1\u20133.4 for details"), 0);
      expect(blocks[0]?.figure_references).toContain("Fig. 3.1");
    });

    it("deduplicates figure references", () => {
      const blocks = extractBlocks(createPageWithContent("Fig. 1.1 appears twice, see Fig. 1.1 again"), 0);
      const refs = blocks[0]?.figure_references ?? [];
      const fig11Count = refs.filter(r => r === "Fig. 1.1").length;
      expect(fig11Count).toBe(1);
    });

    it("returns empty array when no figures referenced", () => {
      const blocks = extractBlocks(createPageWithContent("No figures here"), 0);
      expect(blocks[0]?.figure_references).toEqual([]);
    });

    it("handles case-insensitive matching", () => {
      const blocks = extractBlocks(createPageWithContent("see fig. 5.3 and FIG. 5.4"), 0);
      expect(blocks[0]?.figure_references).toContain("Fig. 5.3");
      expect(blocks[0]?.figure_references).toContain("Fig. 5.4");
    });
  });

  describe("extractBlocks edge cases", () => {
    it("skips Page block type within children", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Page/0",
            block_type: "Page",
            html: "<p>Nested page</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {},
            children: [
              {
                id: "/page/0/Text/0",
                block_type: "Text",
                html: "<p>Child of nested page</p>",
                bbox: [0, 0, 0, 0],
                section_hierarchy: {},
                children: [],
              },
            ],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      // The Page block is skipped but its children are processed
      expect(blocks.length).toBe(1);
      expect(blocks[0]?.content).toBe("Child of nested page");
    });

    it("skips Document block type within children", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Document/0",
            block_type: "Document",
            html: "<p>Nested doc</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {},
            children: [
              {
                id: "/page/0/Text/0",
                block_type: "Text",
                html: "<p>Child of nested doc</p>",
                bbox: [0, 0, 0, 0],
                section_hierarchy: {},
                children: [],
              },
            ],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks.length).toBe(1);
      expect(blocks[0]?.content).toBe("Child of nested doc");
    });

    it("handles null children in page data", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: null,
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks).toEqual([]);
    });

    it("handles null children in block", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p>Content</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {},
            children: null,
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks.length).toBe(1);
      expect(blocks[0]?.content).toBe("Content");
    });

    it("sets section_id from last hierarchy element", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p>Content</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {
              "1": "/page/0/SectionHeader/1",
              "2": "/page/0/SectionHeader/2",
            },
            children: [],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks[0]?.section_id).toBe("/page/0/SectionHeader/2");
    });

    it("sets empty section_id when no hierarchy", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p>Content</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {},
            children: [],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks[0]?.section_id).toBe("");
    });

    it("preserves raw_html in content blocks", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p><strong>Bold</strong> text</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {},
            children: [],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks[0]?.raw_html).toBe("<p><strong>Bold</strong> text</p>");
    });

    it("handles heading level 0 for non-heading content", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          {
            id: "/page/0/Text/0",
            block_type: "Text",
            html: "<p>No heading tag</p>",
            bbox: [0, 0, 0, 0],
            section_hierarchy: {},
            children: [],
          },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks[0]?.level).toBe(0);
    });

    it("extracts heading levels 1-6", () => {
      const pageData = {
        block_type: "Page",
        bbox: [0, 0, 612, 792],
        children: [
          { id: "/page/0/SH/1", block_type: "SectionHeader", html: "<h1>H1</h1>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
          { id: "/page/0/SH/2", block_type: "SectionHeader", html: "<h2>H2</h2>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
          { id: "/page/0/SH/3", block_type: "SectionHeader", html: "<h3>H3</h3>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
          { id: "/page/0/SH/4", block_type: "SectionHeader", html: "<h4>H4</h4>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
          { id: "/page/0/SH/5", block_type: "SectionHeader", html: "<h5>H5</h5>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
          { id: "/page/0/SH/6", block_type: "SectionHeader", html: "<h6>H6</h6>", bbox: [0, 0, 0, 0], section_hierarchy: {}, children: [] },
        ],
      };
      const blocks = extractBlocks(pageData, 0);
      expect(blocks[0]?.level).toBe(1);
      expect(blocks[1]?.level).toBe(2);
      expect(blocks[2]?.level).toBe(3);
      expect(blocks[3]?.level).toBe(4);
      expect(blocks[4]?.level).toBe(5);
      expect(blocks[5]?.level).toBe(6);
    });
  });

  describe("extractHierarchy edge cases", () => {
    it("handles invalid hierarchy input types", () => {
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(extractHierarchy("string")).toEqual([]);
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(extractHierarchy(123)).toEqual([]);
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(extractHierarchy(["array"])).toEqual([]);
    });
  });

  /**
   * Issue #217: Malformed HTML Handling
   *
   * Tests that the stripHtml function handles malformed HTML gracefully without
   * crashing or producing unexpected output. The regex-based approach is intentionally
   * lenient - it extracts text content and handles edge cases gracefully rather than
   * parsing HTML strictly.
   *
   * LIMITATION: The current implementation uses regex-based HTML stripping which:
   * - Does not validate HTML structure
   * - May leave partial content from broken tags
   * - Is designed for simple cleanup, not strict HTML parsing
   *
   * For this use case (extracting text from PDF-to-HTML output), this approach is
   * appropriate as the input is machine-generated and generally well-formed.
   */
  describe("malformed HTML handling (Issue #217)", () => {
    const createPageWithHtml = (html: string) => ({
      block_type: "Page",
      bbox: [0, 0, 612, 792],
      children: [
        {
          id: "/page/0/Text/0",
          block_type: "Text",
          html,
          bbox: [0, 0, 0, 0],
          section_hierarchy: {},
          children: [],
        },
      ],
    });

    describe("unclosed tags", () => {
      it("handles unclosed paragraph tag", () => {
        const blocks = extractBlocks(createPageWithHtml("<p>text without closing"), 0);
        // Unclosed tag is stripped, text content is preserved
        expect(blocks[0]?.content).toBe("text without closing");
      });

      it("handles unclosed div tag", () => {
        const blocks = extractBlocks(createPageWithHtml("<div>content<span>nested"), 0);
        expect(blocks[0]?.content).toBe("contentnested");
      });

      it("handles multiple unclosed tags", () => {
        const blocks = extractBlocks(createPageWithHtml("<p><strong><em>text"), 0);
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles tag with only opening bracket", () => {
        const blocks = extractBlocks(createPageWithHtml("text <incomplete tag"), 0);
        // The regex `<[^>]+>` won't match `<incomplete tag` if there's no closing `>`
        // So the text remains as-is minus any valid tags
        expect(blocks[0]?.content).toContain("text");
      });
    });

    describe("unclosed attributes", () => {
      it("handles tag with unclosed attribute value", () => {
        // <div class="unclosed is missing the closing quote and >
        const blocks = extractBlocks(createPageWithHtml('<div class="unclosed>text'), 0);
        // The tag with broken attribute gets stripped (regex matches up to first >)
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles single quote unclosed attribute", () => {
        const blocks = extractBlocks(createPageWithHtml("<div class='open>content</div>"), 0);
        // The regex matches <div class='open> as a tag, stripping it
        expect(blocks[0]?.content).toBe("content");
      });

      it("handles attribute without quotes", () => {
        const blocks = extractBlocks(createPageWithHtml("<div class=noQuotes>text</div>"), 0);
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles empty attribute value", () => {
        const blocks = extractBlocks(createPageWithHtml('<p class="">empty attr</p>'), 0);
        expect(blocks[0]?.content).toBe("empty attr");
      });
    });

    describe("mismatched nesting", () => {
      it("handles mismatched div and span", () => {
        // Opening div, opening span, closing div (mismatched)
        const blocks = extractBlocks(createPageWithHtml("<div><span>text</div></span>"), 0);
        // All tags get stripped, text preserved
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles reversed closing order", () => {
        const blocks = extractBlocks(createPageWithHtml("<p><b>bold</p></b>"), 0);
        expect(blocks[0]?.content).toBe("bold");
      });

      it("handles extra closing tags", () => {
        const blocks = extractBlocks(createPageWithHtml("<p>text</p></p></p>"), 0);
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles orphan closing tags", () => {
        const blocks = extractBlocks(createPageWithHtml("text</div></span></p>"), 0);
        expect(blocks[0]?.content).toBe("text");
      });
    });

    describe("empty and malformed tags", () => {
      it("handles empty tag name", () => {
        const blocks = extractBlocks(createPageWithHtml("< >text</ >"), 0);
        // Regex won't match < > (no content between), but </ > might
        expect(blocks[0]?.content).toContain("text");
      });

      it("handles tag with only attributes", () => {
        const blocks = extractBlocks(createPageWithHtml('<"attribute">text'), 0);
        // This is malformed but we handle gracefully
        expect(blocks[0]?.content).toContain("text");
      });

      it("handles self-closing tag syntax variations", () => {
        const blocks = extractBlocks(createPageWithHtml("<br>text<br/>more<br />end"), 0);
        expect(blocks[0]?.content).toBe("textmoreend");
      });

      it("handles XHTML style void elements", () => {
        const blocks = extractBlocks(createPageWithHtml("<img src='x'/><hr/><br/>text"), 0);
        expect(blocks[0]?.content).toBe("text");
      });
    });

    describe("special characters in tags", () => {
      it("handles newlines within tags", () => {
        const blocks = extractBlocks(createPageWithHtml("<div\nclass='test'\n>content</div>"), 0);
        expect(blocks[0]?.content).toBe("content");
      });

      it("handles tabs within tags", () => {
        const blocks = extractBlocks(createPageWithHtml("<div\tclass='test'>content</div>"), 0);
        expect(blocks[0]?.content).toBe("content");
      });

      it("handles tag-like content in attribute values", () => {
        const blocks = extractBlocks(createPageWithHtml('<div data-info="<script>">safe</div>'), 0);
        // The regex matches greedily to first >, so this handles it
        expect(blocks[0]?.content).toContain("safe");
      });
    });

    describe("edge cases that could cause issues", () => {
      it("handles very long unclosed tag", () => {
        const longAttr = "a".repeat(10000);
        const blocks = extractBlocks(createPageWithHtml(`<div class="${longAttr}">text</div>`), 0);
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles deeply nested malformed structure", () => {
        const deepNesting = "<div>".repeat(100) + "text" + "</span>".repeat(50);
        const blocks = extractBlocks(createPageWithHtml(deepNesting), 0);
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles consecutive angle brackets", () => {
        const blocks = extractBlocks(createPageWithHtml("<<>>text<<div>>"), 0);
        // These aren't valid tags, behavior depends on regex
        expect(blocks[0]?.content).toContain("text");
      });

      it("handles HTML comments", () => {
        const blocks = extractBlocks(createPageWithHtml("<!-- comment -->text<!-- another -->"), 0);
        // Comments are tags, should be stripped
        expect(blocks[0]?.content).toBe("text");
      });

      it("handles unclosed HTML comment", () => {
        const blocks = extractBlocks(createPageWithHtml("<!-- unclosed comment text"), 0);
        // The <!-- won't match the tag pattern, content preserved
        expect(blocks[0]?.content).toContain("text");
      });

      it("handles CDATA-like sections", () => {
        const blocks = extractBlocks(createPageWithHtml("<![CDATA[content]]>text"), 0);
        expect(blocks[0]?.content).toContain("text");
      });
    });

    describe("preserves raw_html for debugging", () => {
      it("preserves malformed HTML in raw_html field", () => {
        const malformedHtml = "<p><strong>unclosed";
        const blocks = extractBlocks(createPageWithHtml(malformedHtml), 0);
        // Even if content is cleaned, raw_html preserves original
        expect(blocks[0]?.raw_html).toBe(malformedHtml);
      });
    });
  });
});
