/**
 * Tests for markdown writer module.
 * Covers writing RhotonDocument to Markdown file.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { writeMarkdown } from "../../../src/services/writer/markdown-writer.ts";
import type { RhotonDocument, ContentBlock, RhotonPage } from "../../../src/models/document.ts";

// Mock Bun.write to avoid actual file writes
const originalBunWrite = Bun.write;

describe("markdownWriter", () => {
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
   * Creates a valid content block for testing.
   */
  function createBlock(overrides: Partial<ContentBlock> = {}): ContentBlock {
    return {
      id: "/page/0/text/0",
      block_type: "text",
      level: 0,
      content: "Test content",
      raw_html: "<p>Test content</p>",
      parent_hierarchy: [],
      figure_references: [],
      bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
      section_id: "section-1",
      ...overrides,
    };
  }

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
          blocks: [createBlock()],
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

  describe("writeMarkdown", () => {
    it("should write markdown file with document header", async () => {
      const document = createValidDocument({
        title: "Neuroanatomy Guide",
        author: "Dr. Rhoton",
      });
      const outputPath = "/output/content.md";

      await writeMarkdown(document, outputPath);

      expect(capturedPath).toBe(outputPath);
      expect(capturedContent).toContain("# Neuroanatomy Guide");
      expect(capturedContent).toContain("**Author:** Dr. Rhoton");
    });

    it("should include horizontal rule after header", async () => {
      const document = createValidDocument();
      const outputPath = "/output/content.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("---");
    });

    it("should format section headers with correct heading levels", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/section_header/0",
                block_type: "section_header",
                level: 1,
                content: "Chapter 1: Introduction",
              }),
              createBlock({
                id: "/page/0/section_header/1",
                block_type: "section_header",
                level: 2,
                content: "Background",
              }),
              createBlock({
                id: "/page/0/section_header/2",
                block_type: "section_header",
                level: 3,
                content: "Historical Context",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/headers.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("# Chapter 1: Introduction");
      expect(capturedContent).toContain("## Background");
      expect(capturedContent).toContain("### Historical Context");
    });

    it("should handle all 6 heading levels", async () => {
      const blocks: ContentBlock[] = [];
      for (let level = 1; level <= 6; level++) {
        blocks.push(
          createBlock({
            id: `/page/0/section_header/${level - 1}`,
            block_type: "section_header",
            level,
            content: `Heading Level ${level}`,
          })
        );
      }

      const document = createValidDocument({
        pages: [{ page_number: 0, blocks }],
      });
      const outputPath = "/output/all-levels.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("# Heading Level 1");
      expect(capturedContent).toContain("## Heading Level 2");
      expect(capturedContent).toContain("### Heading Level 3");
      expect(capturedContent).toContain("#### Heading Level 4");
      expect(capturedContent).toContain("##### Heading Level 5");
      expect(capturedContent).toContain("###### Heading Level 6");
    });

    it("should skip page headers in output", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/page_header/0",
                block_type: "page_header",
                level: 0,
                content: "Page Header - Should Not Appear",
              }),
              createBlock({
                id: "/page/0/text/0",
                block_type: "text",
                level: 0,
                content: "Regular text content",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/no-page-headers.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).not.toContain("Page Header - Should Not Appear");
      expect(capturedContent).toContain("Regular text content");
    });

    it("should output text blocks as plain text", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/text/0",
                block_type: "text",
                level: 0,
                content: "The cerebral arteries supply blood to the brain.",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/text-content.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("The cerebral arteries supply blood to the brain.");
    });

    it("should output figure captions", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/figure_caption/0",
                block_type: "figure_caption",
                level: 0,
                content: "Figure 1.1: Anatomical diagram showing the Circle of Willis",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/captions.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("Figure 1.1: Anatomical diagram showing the Circle of Willis");
    });

    it("should output inline math blocks", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/inline_math/0",
                block_type: "inline_math",
                level: 0,
                content: "Area = pi * r^2",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/math.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("Area = pi * r^2");
    });

    it("should handle multiple pages", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/text/0",
                content: "Content from page 0",
              }),
            ],
          },
          {
            page_number: 1,
            blocks: [
              createBlock({
                id: "/page/1/text/0",
                content: "Content from page 1",
              }),
            ],
          },
          {
            page_number: 2,
            blocks: [
              createBlock({
                id: "/page/2/text/0",
                content: "Content from page 2",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/multi-page.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("Content from page 0");
      expect(capturedContent).toContain("Content from page 1");
      expect(capturedContent).toContain("Content from page 2");
    });

    it("should handle empty pages gracefully", async () => {
      const document = createValidDocument({
        pages: [
          { page_number: 0, blocks: [] },
          {
            page_number: 1,
            blocks: [createBlock({ id: "/page/1/text/0", content: "Content on page 1" })],
          },
          { page_number: 2, blocks: [] },
        ],
      });
      const outputPath = "/output/empty-pages.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("Content on page 1");
      // Should not crash or produce invalid markdown
    });

    it("should handle pages with only page headers (should produce empty content for that page)", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/page_header/0",
                block_type: "page_header",
                content: "Header only page",
              }),
            ],
          },
          {
            page_number: 1,
            blocks: [createBlock({ id: "/page/1/text/0", content: "Real content" })],
          },
        ],
      });
      const outputPath = "/output/header-only-page.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).not.toContain("Header only page");
      expect(capturedContent).toContain("Real content");
    });

    it("should add blank lines between blocks", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({ id: "/page/0/text/0", content: "First paragraph" }),
              createBlock({ id: "/page/0/text/1", content: "Second paragraph" }),
            ],
          },
        ],
      });
      const outputPath = "/output/spacing.md";

      await writeMarkdown(document, outputPath);

      // Content should have blank lines between blocks
      expect(capturedContent).toContain("First paragraph\n\n");
      expect(capturedContent).toContain("Second paragraph\n");
    });

    it("should handle section headers with level 0 (no prefix)", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/section_header/0",
                block_type: "section_header",
                level: 0, // Level 0 means no heading prefix
                content: "Unlabeled section",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/level-zero.md";

      await writeMarkdown(document, outputPath);

      // Level 0 should not add # prefix
      expect(capturedContent).toContain("Unlabeled section");
      expect(capturedContent).not.toContain("# Unlabeled section");
    });

    it("should handle special markdown characters in content", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/text/0",
                content: "Content with *asterisks* and _underscores_ and [brackets]",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/special-chars.md";

      await writeMarkdown(document, outputPath);

      // Content should be preserved as-is (no escaping in current implementation)
      expect(capturedContent).toContain("*asterisks*");
      expect(capturedContent).toContain("_underscores_");
      expect(capturedContent).toContain("[brackets]");
    });

    it("should handle unicode content", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/text/0",
                content: "Greek letters: \u03B1, \u03B2, \u03B3 and symbols: \u00B5m, \u00B0C",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/unicode.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("\u03B1");
      expect(capturedContent).toContain("\u03B2");
      expect(capturedContent).toContain("\u00B5m");
    });

    it("should use provided output path exactly", async () => {
      const document = createValidDocument();
      const outputPath = "/custom/nested/path/output.md";

      await writeMarkdown(document, outputPath);

      expect(capturedPath).toBe(outputPath);
    });

    it("should handle documents with mixed block types", async () => {
      const document = createValidDocument({
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/section_header/0",
                block_type: "section_header",
                level: 2,
                content: "Methods",
              }),
              createBlock({
                id: "/page/0/text/0",
                block_type: "text",
                content: "The study was conducted using standard protocols.",
              }),
              createBlock({
                id: "/page/0/figure_caption/0",
                block_type: "figure_caption",
                content: "Figure 1: Experimental setup",
              }),
              createBlock({
                id: "/page/0/text/1",
                block_type: "text",
                content: "Results showed significant improvements.",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/mixed.md";

      await writeMarkdown(document, outputPath);

      expect(capturedContent).toContain("## Methods");
      expect(capturedContent).toContain("The study was conducted");
      expect(capturedContent).toContain("Figure 1: Experimental setup");
      expect(capturedContent).toContain("Results showed significant improvements");
    });

    it("should produce valid markdown structure", async () => {
      const document = createValidDocument({
        title: "Complete Document",
        author: "Complete Author",
        pages: [
          {
            page_number: 0,
            blocks: [
              createBlock({
                id: "/page/0/section_header/0",
                block_type: "section_header",
                level: 1,
                content: "Introduction",
              }),
              createBlock({
                id: "/page/0/text/0",
                content: "Opening paragraph.",
              }),
            ],
          },
        ],
      });
      const outputPath = "/output/valid-structure.md";

      await writeMarkdown(document, outputPath);

      // Check overall structure
      const lines = capturedContent.split("\n");
      expect(lines[0]).toBe("# Complete Document");
      expect(lines[1]).toBe("");
      expect(lines[2]).toBe("**Author:** Complete Author");
      expect(lines[3]).toBe("");
      expect(lines[4]).toBe("---");
    });
  });
});
