/**
 * Tests for document writer module.
 * Covers writing RhotonDocument to JSON file with schema validation.
 */

import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { writeDocument } from "../../../src/services/writer/document-writer.ts";
import type { RhotonDocument } from "../../../src/models/document.ts";

// Mock Bun.write to avoid actual file writes
const originalBunWrite = Bun.write;

describe("documentWriter", () => {
  let writeSpy: ReturnType<typeof spyOn>;
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
   * Creates a valid minimal RhotonDocument for testing.
   */
  function createValidDocument(overrides: Partial<RhotonDocument> = {}): RhotonDocument {
    return {
      id: "test-document",
      title: "Test Document",
      author: "Test Author",
      source_files: {
        json: "/path/to/source.json",
        markdown: "/path/to/source.md",
        image_dir: "/path/to/images",
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
              section_id: "section-1",
            },
          ],
        },
      ],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 100,
        source_markdown_lines: 200,
        total_images: 10,
        parse_rate: 99.5,
        ligature_count: 0,
        figure_coverage: 100,
      },
      ...overrides,
    };
  }

  describe("writeDocument", () => {
    it("should write valid document to file", async () => {
      const document = createValidDocument();
      const outputPath = "/output/test-document.json";

      await writeDocument(document, outputPath);

      expect(capturedPath).toBe(outputPath);
      const parsed = JSON.parse(capturedContent);
      expect(parsed.id).toBe("test-document");
      expect(parsed.title).toBe("Test Document");
    });

    it("should format JSON with 2-space indentation", async () => {
      const document = createValidDocument();
      const outputPath = "/output/test-document.json";

      await writeDocument(document, outputPath);

      // Check for 2-space indentation (not tabs, not 4 spaces)
      expect(capturedContent).toContain('  "id"');
      expect(capturedContent).not.toContain("\t");
    });

    it("should preserve all document fields", async () => {
      const document = createValidDocument({
        title: "Complete Neuroanatomy Guide",
        author: "Dr. Test",
      });
      const outputPath = "/output/complete.json";

      await writeDocument(document, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.title).toBe("Complete Neuroanatomy Guide");
      expect(parsed.author).toBe("Dr. Test");
      expect(parsed.source_files.json).toBe("/path/to/source.json");
      expect(parsed.pages).toHaveLength(1);
      expect(parsed.metadata.pipeline_version).toBe("1.0.0");
    });

    it("should handle documents with multiple pages", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              {
                id: "/page/0/text/0",
                block_type: "text",
                level: 0,
                content: "Page 0 content",
                raw_html: "<p>Page 0 content</p>",
                parent_hierarchy: [],
                figure_references: [],
                bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
                section_id: "section-1",
              },
            ],
          },
          {
            page_number: 1,
            blocks: [
              {
                id: "/page/1/text/0",
                block_type: "text",
                level: 0,
                content: "Page 1 content",
                raw_html: "<p>Page 1 content</p>",
                parent_hierarchy: [],
                figure_references: [],
                bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
                section_id: "section-2",
              },
            ],
          },
        ],
      });
      const outputPath = "/output/multi-page.json";

      await writeDocument(document, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.pages).toHaveLength(2);
      expect(parsed.pages[0].page_number).toBe(0);
      expect(parsed.pages[1].page_number).toBe(1);
    });

    it("should handle documents with figure references", async () => {
      const document = createValidDocument({
        figure_map: {
          "Fig. 1.1": {
            figure_id: "Fig. 1.1",
            image_file: "figure-1-1.png",
            image_path: "/images/figure-1-1.png",
            page_number: 0,
            caption: "Figure 1.1 caption",
            abbreviations: { A: "Artery", V: "Vein" },
            status: "mapped",
          },
        },
      });
      const outputPath = "/output/with-figures.json";

      await writeDocument(document, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.figure_map["Fig. 1.1"]).toBeDefined();
      expect(parsed.figure_map["Fig. 1.1"].status).toBe("mapped");
    });

    it("should reject document with invalid ID format", async () => {
      const document = createValidDocument({
        id: "Invalid_ID_With_Uppercase", // Invalid: must be lowercase kebab-case
      });
      const outputPath = "/output/invalid.json";

      await expect(writeDocument(document, outputPath)).rejects.toThrow();
    });

    it("should reject document with empty title", async () => {
      const document = createValidDocument({
        title: "", // Invalid: must be non-empty
      });
      const outputPath = "/output/empty-title.json";

      await expect(writeDocument(document, outputPath)).rejects.toThrow();
    });

    it("should reject document with no pages", async () => {
      const document = createValidDocument({
        pages: [], // Invalid: must have at least 1 page
      });
      const outputPath = "/output/no-pages.json";

      await expect(writeDocument(document, outputPath)).rejects.toThrow();
    });

    it("should reject document with invalid block ID format", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              {
                id: "invalid-block-id", // Invalid: must match /page/N/type/M pattern
                block_type: "text",
                level: 0,
                content: "Test",
                raw_html: "<p>Test</p>",
                parent_hierarchy: [],
                figure_references: [],
                bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
                section_id: "section-1",
              },
            ],
          },
        ],
      });
      const outputPath = "/output/invalid-block.json";

      await expect(writeDocument(document, outputPath)).rejects.toThrow();
    });

    it("should handle special characters in content", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              {
                id: "/page/0/text/0",
                block_type: "text",
                level: 0,
                content: 'Special chars: "quotes", <brackets>, & ampersand',
                raw_html: "<p>Special chars</p>",
                parent_hierarchy: [],
                figure_references: [],
                bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
                section_id: "section-1",
              },
            ],
          },
        ],
      });
      const outputPath = "/output/special-chars.json";

      await writeDocument(document, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.pages[0].blocks[0].content).toContain('"quotes"');
      expect(parsed.pages[0].blocks[0].content).toContain("<brackets>");
    });

    it("should handle unicode content", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              {
                id: "/page/0/text/0",
                block_type: "text",
                level: 0,
                content: "Unicode: \u03B1 \u03B2 \u03B3 (alpha beta gamma)",
                raw_html: "<p>Unicode</p>",
                parent_hierarchy: [],
                figure_references: [],
                bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
                section_id: "section-1",
              },
            ],
          },
        ],
      });
      const outputPath = "/output/unicode.json";

      await writeDocument(document, outputPath);

      const parsed = JSON.parse(capturedContent);
      expect(parsed.pages[0].blocks[0].content).toContain("\u03B1");
    });

    it("should use provided output path exactly", async () => {
      const document = createValidDocument();
      const outputPath = "/custom/path/to/output/document.json";

      await writeDocument(document, outputPath);

      expect(capturedPath).toBe(outputPath);
    });
  });
});
