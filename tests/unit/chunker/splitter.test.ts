import { describe, test, expect } from "bun:test";
import { splitBlock, generateChunkId } from "../../../src/services/chunker/splitter";
import { MAX_TOKENS, HARD_MAX_TOKENS } from "../../../src/services/chunker/tokenizer";
import type { ContentBlock } from "../../../src/models/document";

/**
 * Creates a mock ContentBlock for testing.
 * This helper ensures type safety and provides sensible defaults.
 */
function createMockBlock(overrides: {
  id?: string;
  block_type?: string;
  content?: string;
  parent_hierarchy?: string[];
}): ContentBlock {
  return {
    id: overrides.id ?? "/page/1/Text/1",
    block_type: (overrides.block_type ?? "text") as ContentBlock["block_type"],
    level: 0,
    content: overrides.content ?? "",
    raw_html: "",
    parent_hierarchy: overrides.parent_hierarchy ?? [],
    figure_references: [],
    bbox: { x1: 0, y1: 0, x2: 100, y2: 100 },
    section_id: "",
  };
}

describe("splitter", () => {
  const mockBreadcrumb = ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"];
  const mockBreadcrumbText = "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS]";

  describe("splitBlock - basic path", () => {
    test("creates single chunk for short content", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "The cerebral veins drain the brain.",
        parent_hierarchy: ["/page/1/SectionHeader/1"],
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toBe("The cerebral veins drain the brain.");
      expect(chunks[0]!.breadcrumb).toEqual(mockBreadcrumb);
      expect(chunks[0]!.breadcrumb_text).toBe(mockBreadcrumbText);
    });

    test("includes breadcrumb in content_with_context", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Short content.",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0]!.content_with_context).toBe(
        mockBreadcrumbText + "\n\n" + "Short content."
      );
    });

    test("tracks source block ID and page number", () => {
      const block = createMockBlock({
        id: "/page/5/Text/3",
        block_type: "text",
        content: "Some content.",
      });

      // Pass 0-based page number 5
      const chunks = splitBlock(block, 5, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0]!.source_block_ids).toContain("/page/5/Text/3");
      // Page numbers are 1-based in chunks (0-based + 1), so page_number 5 becomes 6
      expect(chunks[0]!.page_numbers).toContain(6);
    });

    test("calculates token and character counts", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Test content here.", // 18 chars
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0]!.character_count).toBe(18);
      expect(chunks[0]!.token_count).toBeGreaterThan(0);
    });

    test("sets default metadata flags", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Normal text content.",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0]!.is_figure_caption).toBe(false);
      expect(chunks[0]!.is_table).toBe(false);
      expect(chunks[0]!.overlap_tokens).toBe(0);
    });

    test("content at exact MAX_TOKENS creates single chunk", () => {
      // Create content that's exactly at the limit
      const content = "x".repeat(MAX_TOKENS * 4); // chars = tokens * 4
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, [], "[Context: Document Root]", "doc-id");

      expect(chunks).toHaveLength(1);
    });
  });

  describe("splitBlock - long content splitting", () => {
    const mockBreadcrumb = ["Section"];
    const mockBreadcrumbText = "[Context: Section]";

    test("splits content exceeding MAX_TOKENS into multiple chunks", () => {
      // Create content that exceeds MAX_TOKENS (512 * 4 = 2048 chars)
      const longContent = "This is a sentence. ".repeat(150); // ~3000 chars
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks.length).toBeGreaterThan(1);
    });

    test("all split chunks have same breadcrumb", () => {
      const longContent = "This is a sentence. ".repeat(150);
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      for (const chunk of chunks) {
        expect(chunk.breadcrumb).toEqual(mockBreadcrumb);
        expect(chunk.breadcrumb_text).toBe(mockBreadcrumbText);
      }
    });

    test("no chunk exceeds HARD_MAX_TOKENS", () => {
      const longContent = "This is a sentence. ".repeat(200);
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      for (const chunk of chunks) {
        expect(chunk.token_count).toBeLessThanOrEqual(HARD_MAX_TOKENS);
      }
    });

    test("splits at paragraph breaks first", () => {
      const contentWithParagraphs =
        "First paragraph with content. More content here.\n\n" +
        "Second paragraph starts here. It has more text.\n\n" +
        "Third paragraph is also present. And more content.";

      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: contentWithParagraphs.repeat(20), // Make it long enough to split
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Should have multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
    });

    test("splits at sentence boundaries when no paragraph breaks", () => {
      // Long text without paragraph breaks
      const longSentences = "Sentence one here. Sentence two follows. Sentence three comes next. ".repeat(50);
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longSentences,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Each chunk should end at a sentence boundary (with a period)
      for (const chunk of chunks.slice(0, -1)) { // Except last chunk
        expect(chunk.content?.trim()).toMatch(/[.!?]$/);
      }
    });

    test("all chunks share source_block_ids", () => {
      const longContent = "This is a sentence. ".repeat(150);
      const block = createMockBlock({
        id: "/page/5/Text/3",
        block_type: "text",
        content: longContent,
      });

      const chunks = splitBlock(block, 5, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      for (const chunk of chunks) {
        expect(chunk.source_block_ids).toContain("/page/5/Text/3");
      }
    });
  });

  describe("generateChunkId", () => {
    test("generates correct format with 4-digit padding", () => {
      expect(generateChunkId("doc-123", 0)).toBe("doc-123-chunk-0000");
      expect(generateChunkId("doc-123", 1)).toBe("doc-123-chunk-0001");
      expect(generateChunkId("doc-123", 42)).toBe("doc-123-chunk-0042");
      expect(generateChunkId("doc-123", 999)).toBe("doc-123-chunk-0999");
      expect(generateChunkId("doc-123", 9999)).toBe("doc-123-chunk-9999");
    });

    test("handles numbers beyond 4 digits", () => {
      expect(generateChunkId("doc", 10000)).toBe("doc-chunk-10000");
      expect(generateChunkId("doc", 12345)).toBe("doc-chunk-12345");
    });

    test("handles various document ID formats", () => {
      expect(generateChunkId("simple", 5)).toBe("simple-chunk-0005");
      expect(generateChunkId("with-dashes", 5)).toBe("with-dashes-chunk-0005");
      expect(generateChunkId("doc_with_underscores", 5)).toBe("doc_with_underscores-chunk-0005");
      expect(generateChunkId("", 5)).toBe("-chunk-0005");
    });
  });

  describe("splitBlock - edge cases", () => {
    const mockBreadcrumb = ["Section"];
    const mockBreadcrumbText = "[Context: Section]";

    test("handles content with only whitespace", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "   \n\n   ",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toBeDefined();
      // Should produce a single chunk with the whitespace content
      expect(chunks).toHaveLength(1);
    });

    test("handles empty string content", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toBeDefined();
      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toBe("");
    });

    test("handles very long single word without spaces", () => {
      // Create a word that exceeds MAX_TOKENS (512 tokens * 4 chars = 2048 chars)
      const longWord = "supercalifragilisticexpialidocious".repeat(100);
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longWord,
      });

      const chunks = splitBlock(block, 1, [], "[Context: Root]", "doc-id");

      // Should produce at least one chunk
      expect(chunks.length).toBeGreaterThan(0);
      // Since there are no word boundaries, it produces a single chunk with the long word
      // (The whitespace splitter cannot break it further)
    });

    test("handles content containing only punctuation", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "...???!!!",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toBe("...???!!!");
    });

    test("handles Unicode content correctly", () => {
      const unicodeContent = "日本語テスト。これは文です。 中文测试。这是一个句子。 한국어 테스트입니다.";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: unicodeContent,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toBe(unicodeContent);
      expect(chunks[0]!.character_count).toBe(unicodeContent.length);
    });

    test("handles content with mixed paragraph and sentence breaks", () => {
      const mixedContent =
        "First sentence. Second sentence.\n\n" +
        "New paragraph starts. More content here.\n\n" +
        "Final paragraph.";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: mixedContent,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toBe(mixedContent);
    });

    test("handles content with very long URL", () => {
      const longUrl = "https://example.com/path/" + "a".repeat(500) + "/resource";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: `Visit ${longUrl} for more info.`,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    test("uses Document Root when breadcrumb is empty", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Some content.",
      });

      const chunks = splitBlock(block, 1, [], "[Context: Document Root]", "doc-id");

      expect(chunks[0]!.breadcrumb).toEqual(["Document Root"]);
    });

    test("page number 0 produces page_numbers [1] (0-based to 1-based conversion)", () => {
      const block = createMockBlock({
        id: "/page/0/Text/1",
        block_type: "text",
        content: "Content on first page.",
      });

      // Pass 0-based page number 0
      const chunks = splitBlock(block, 0, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Should convert to 1-based: 0 + 1 = 1
      expect(chunks[0]!.page_numbers).toContain(1);
    });
  });

  describe("splitBlock - content type detection", () => {
    const mockBreadcrumb = ["Section"];
    const mockBreadcrumbText = "[Context: Section]";

    test("sets is_figure_caption true for figure_caption block_type", () => {
      const block = createMockBlock({
        id: "/page/1/FigureCaption/1",
        block_type: "figure_caption",
        content: "Figure 1: Diagram of the brain",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0]!.is_figure_caption).toBe(true);
    });

    test("sets is_figure_caption false for non-figure_caption block_type", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "This mentions Figure 1 but is not a caption.",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks[0]!.is_figure_caption).toBe(false);
    });

    test("is_table is always false (tables not detected in source blocks)", () => {
      const tableContent = "| Header 1 | Header 2 |\n| --- | --- |\n| Data 1 | Data 2 |";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: tableContent,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Currently always false per implementation comment
      expect(chunks[0]!.is_table).toBe(false);
    });

    test("contains_abbreviations is always false (not yet implemented)", () => {
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: "Dr. Smith discussed Fig. 1 with Prof. Jones et al.",
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Currently always false per implementation
      expect(chunks[0]!.contains_abbreviations).toBe(false);
    });
  });

  describe("splitBlock - whitespace fallback splitting", () => {
    /**
     * Issue #211 (H-2): Single sentence exceeding MAX_TOKENS edge case
     *
     * This test explicitly verifies that when a single grammatically-valid
     * sentence exceeds MAX_TOKENS (512 tokens ≈ 2048 characters), the splitter:
     * 1. Correctly triggers word-boundary fallback splitting
     * 2. Produces chunks all within HARD_MAX_TOKENS (600)
     * 3. Preserves all original content (no text loss)
     *
     * This edge case is critical for medical literature where complex
     * anatomical descriptions can produce very long single sentences.
     */
    test("single sentence exceeding MAX_TOKENS triggers word-boundary split (Issue #211)", () => {
      // Construct a realistic medical sentence that exceeds MAX_TOKENS
      // MAX_TOKENS = 512 tokens ≈ 2048 chars (using chars/4 heuristic)
      // We need > 2048 chars in a single grammatically valid sentence
      const anatomicalDescription =
        "The superficial cerebral veins, which include the superior cerebral veins " +
        "draining into the superior sagittal sinus, the middle cerebral veins " +
        "anastomosing with the sphenoparietal sinus, and the inferior cerebral veins " +
        "emptying into the transverse and cavernous sinuses, demonstrate complex " +
        "interconnections through numerous cortical and subcortical anastomotic channels " +
        "that provide alternative drainage pathways when primary routes become occluded, " +
        "with the most significant being the vein of Trolard connecting superiorly and " +
        "the vein of Labbé coursing posteroinferiorly, both of which exhibit considerable " +
        "individual variation in size and configuration that surgeons must carefully " +
        "evaluate preoperatively to avoid catastrophic venous infarction. ";

      // Repeat to ensure we exceed 512 tokens (2048+ chars)
      // Each repetition is ~690 chars, so 3+ repetitions = 2000+ chars
      const singleOversizedSentence = anatomicalDescription.repeat(4).trim() + ".";

      // Verify our test input actually exceeds the limit
      const estimatedTokens = Math.ceil(singleOversizedSentence.length / 4);
      expect(estimatedTokens).toBeGreaterThan(MAX_TOKENS);
      console.log(`\nIssue #211 Test: Single sentence with ${singleOversizedSentence.length} chars (~${estimatedTokens} tokens)`);

      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: singleOversizedSentence,
      });

      // Use minimal breadcrumb to maximize available space for content
      const chunks = splitBlock(block, 1, [], "[Context: Root]", "doc-id");

      // 1. Should produce multiple chunks since single sentence exceeds limit
      expect(chunks.length).toBeGreaterThan(1);
      console.log(`  Produced ${chunks.length} chunks from single oversized sentence`);

      // 2. All chunks must be within HARD_MAX_TOKENS (600)
      for (const chunk of chunks) {
        expect(chunk.token_count).toBeLessThanOrEqual(HARD_MAX_TOKENS);
      }
      console.log(`  All chunks within HARD_MAX_TOKENS (${HARD_MAX_TOKENS})`);

      // 3. Verify no content is lost
      const reconstructed = chunks.map(c => c.content).join(" ");
      const originalWords = singleOversizedSentence.split(/\s+/).filter(w => w);
      const reconstructedWords = reconstructed.split(/\s+/).filter(w => w);

      // All original words should appear in the reconstructed content
      for (const word of originalWords) {
        expect(reconstructedWords).toContain(word);
      }
      console.log(`  Content integrity verified: ${originalWords.length} words preserved`);
    });

    test("triggers whitespace split for very long sentence without periods", () => {
      // Create a sentence that exceeds MAX_TOKENS but has no sentence boundaries
      // MAX_TOKENS = 512, so we need > 512 * 4 = 2048 chars
      const longSentence = "word ".repeat(600); // ~3000 chars, no sentence punctuation
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longSentence.trim(),
      });

      const chunks = splitBlock(block, 1, [], "[Context: Root]", "doc-id");

      // Should produce multiple chunks since it exceeds limits
      expect(chunks.length).toBeGreaterThan(1);

      // All chunks should be within token limits
      for (const chunk of chunks) {
        expect(chunk.token_count).toBeLessThanOrEqual(HARD_MAX_TOKENS);
      }
    });

    test("whitespace split respects word boundaries", () => {
      // Create content where words can be split at whitespace
      const words = [];
      for (let i = 0; i < 700; i++) {
        words.push(`word${i}`);
      }
      const longContent = words.join(" ");

      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longContent,
      });

      const chunks = splitBlock(block, 1, [], "[Context: Root]", "doc-id");

      // Verify chunks don't split mid-word
      for (const chunk of chunks) {
        // Each chunk should not start or end mid-word (unless it's the whole word)
        // Words should be complete (match word\d+ pattern)
        const words = chunk.content.split(" ");
        for (const word of words) {
          if (word) {
            expect(word).toMatch(/^word\d+$/);
          }
        }
      }
    });

    test("handles content that triggers multiple fallback levels", () => {
      // Create paragraphs where some paragraphs need sentence split,
      // and some sentences need whitespace split
      const normalParagraph = "Short paragraph. Another sentence.";
      const longSentence = "verylongword ".repeat(600);
      const content = `${normalParagraph}\n\n${longSentence.trim()}`;

      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, [], "[Context: Root]", "doc-id");

      expect(chunks.length).toBeGreaterThan(1);

      // All chunks should be within limits
      for (const chunk of chunks) {
        expect(chunk.token_count).toBeLessThanOrEqual(HARD_MAX_TOKENS);
      }
    });
  });

  describe("splitBlock - paragraph splitting edge cases", () => {
    const mockBreadcrumb = ["Section"];
    const mockBreadcrumbText = "[Context: Section]";

    test("handles multiple consecutive paragraph breaks", () => {
      const content = "First paragraph.\n\n\n\nSecond paragraph.\n\n\n\n\nThird paragraph.";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
    });

    test("splits large paragraph by sentences when needed", () => {
      // Create a single paragraph (no \n\n) that exceeds MAX_TOKENS
      const longParagraph = "This is sentence one. ".repeat(150);

      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content: longParagraph.trim(),
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks.length).toBeGreaterThan(1);

      // Chunks should end at sentence boundaries (period)
      for (const chunk of chunks.slice(0, -1)) {
        expect(chunk.content.trim()).toMatch(/\.$/);
      }
    });

    test("handles paragraph with leading/trailing whitespace", () => {
      const content = "  \n\n  First paragraph.  \n\n  Second paragraph.  \n\n  ";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      // Content should be trimmed properly
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("splitBlock - sentence splitting edge cases", () => {
    const mockBreadcrumb = ["Section"];
    const mockBreadcrumbText = "[Context: Section]";

    test("preserves abbreviations when splitting sentences", () => {
      const content = "Dr. Smith and Prof. Jones discussed Fig. 1. The results were significant.";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toContain("Dr. Smith");
      expect(chunks[0]!.content).toContain("Prof. Jones");
      expect(chunks[0]!.content).toContain("Fig. 1");
    });

    test("handles content ending without terminal punctuation", () => {
      const content = "This is a sentence. This one has no ending punctuation";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toBe(content);
    });

    test("handles decimal numbers in sentences", () => {
      const content = "The value was 3.14 meters. Another measurement was 2.71828.";
      const block = createMockBlock({
        id: "/page/1/Text/1",
        block_type: "text",
        content,
      });

      const chunks = splitBlock(block, 1, mockBreadcrumb, mockBreadcrumbText, "doc-id");

      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.content).toContain("3.14");
      expect(chunks[0]!.content).toContain("2.71828");
    });
  });
});
