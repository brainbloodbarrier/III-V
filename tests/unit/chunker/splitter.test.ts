import { describe, test, expect } from "bun:test";
import { splitBlock } from "../../../src/services/chunker/splitter";
import { MAX_TOKENS, HARD_MAX_TOKENS } from "../../../src/services/chunker/tokenizer";

describe("splitter", () => {
  const mockBreadcrumb = ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"];
  const mockBreadcrumbText = "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS]";

  describe("splitBlock - basic path", () => {
    test("creates single chunk for short content", () => {
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: "The cerebral veins drain the brain.",
        page_number: 1,
        parent_hierarchy: ["/page/1/SectionHeader/1"],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe("The cerebral veins drain the brain.");
      expect(chunks[0].breadcrumb).toEqual(mockBreadcrumb);
      expect(chunks[0].breadcrumb_text).toBe(mockBreadcrumbText);
    });

    test("includes breadcrumb in content_with_context", () => {
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Short content.",
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0].content_with_context).toBe(
        mockBreadcrumbText + "\n\n" + "Short content."
      );
    });

    test("tracks source block ID", () => {
      const block = {
        id: "/page/5/Text/3",
        block_type: "text",
        content: "Some content.",
        page_number: 5,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0].source_block_ids).toContain("/page/5/Text/3");
      // Page numbers are 1-based in chunks (0-based + 1), so page_number 5 becomes 6
      expect(chunks[0].page_numbers).toContain(6);
    });

    test("calculates token and character counts", () => {
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Test content here.", // 18 chars
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0].character_count).toBe(18);
      expect(chunks[0].token_count).toBeGreaterThan(0);
    });

    test("sets default metadata flags", () => {
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Normal text content.",
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0].is_figure_caption).toBe(false);
      expect(chunks[0].is_table).toBe(false);
      expect(chunks[0].overlap_tokens).toBe(0);
    });

    test("content at exact MAX_TOKENS creates single chunk", () => {
      // Create content that's exactly at the limit
      const content = "x".repeat(MAX_TOKENS * 4); // chars = tokens * 4
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content,
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, [], "[Context: Document Root]", "doc-id");

      expect(chunks).toHaveLength(1);
    });
  });

  describe("splitBlock - long content splitting", () => {
    const mockBreadcrumb = ["Section"];
    const mockBreadcrumbText = "[Context: Section]";

    test("splits content exceeding MAX_TOKENS into multiple chunks", () => {
      // Create content that exceeds MAX_TOKENS (512 * 4 = 2048 chars)
      const longContent = "This is a sentence. ".repeat(150); // ~3000 chars
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks.length).toBeGreaterThan(1);
    });

    test("all split chunks have same breadcrumb", () => {
      const longContent = "This is a sentence. ".repeat(150);
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      for (const chunk of chunks) {
        expect(chunk.breadcrumb).toEqual(mockBreadcrumb);
        expect(chunk.breadcrumb_text).toBe(mockBreadcrumbText);
      }
    });

    test("no chunk exceeds HARD_MAX_TOKENS", () => {
      const longContent = "This is a sentence. ".repeat(200);
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      for (const chunk of chunks) {
        expect(chunk.token_count).toBeLessThanOrEqual(HARD_MAX_TOKENS);
      }
    });

    test("splits at paragraph breaks first", () => {
      const contentWithParagraphs =
        "First paragraph with content. More content here.\n\n" +
        "Second paragraph starts here. It has more text.\n\n" +
        "Third paragraph is also present. And more content.";

      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: contentWithParagraphs.repeat(20), // Make it long enough to split
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Should have multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
    });

    test("splits at sentence boundaries when no paragraph breaks", () => {
      // Long text without paragraph breaks
      const longSentences = "Sentence one here. Sentence two follows. Sentence three comes next. ".repeat(50);
      const block = {
        id: "/page/1/Text/1",
        block_type: "text",
        content: longSentences,
        page_number: 1,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Each chunk should end at a sentence boundary (with a period)
      for (const chunk of chunks.slice(0, -1)) { // Except last chunk
        expect(chunk.content?.trim()).toMatch(/[.!?]$/);
      }
    });

    test("all chunks share source_block_ids", () => {
      const longContent = "This is a sentence. ".repeat(150);
      const block = {
        id: "/page/5/Text/3",
        block_type: "text",
        content: longContent,
        page_number: 5,
        parent_hierarchy: [],
      };

      const chunks = splitBlock(block as any, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      for (const chunk of chunks) {
        expect(chunk.source_block_ids).toContain("/page/5/Text/3");
      }
    });
  });
});
