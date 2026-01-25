import { describe, test, expect } from "bun:test";
import { mergeSmallChunks } from "../../../src/services/chunker/merger";
import type { Chunk } from "../../../src/models/chunk";
import { MIN_TOKENS, MAX_TOKENS } from "../../../src/services/chunker/tokenizer";

describe("merger", () => {
  // Helper to create a minimal chunk for testing
  function createTestChunk(overrides: Partial<Chunk>): Chunk {
    return {
      chunk_id: "test-chunk-0001",
      document_id: "test-doc",
      breadcrumb: ["Section"],
      breadcrumb_text: "[Context: Section]",
      content: "Default content.",
      content_with_context: "[Context: Section]\n\nDefault content.",
      page_numbers: [1],
      source_block_ids: ["/page/1/Text/1"],
      sequence_number: 0,
      previous_chunk_id: null,
      next_chunk_id: null,
      parent_section_id: "/page/1/SectionHeader/1",
      figure_references: [],
      token_count: 10,
      character_count: 16,
      overlap_tokens: 0,
      is_figure_caption: false,
      is_table: false,
      contains_abbreviations: false,
      ...overrides,
    };
  }

  describe("mergeSmallChunks", () => {
    test("merges chunks below MIN_TOKENS with previous", () => {
      const chunk1 = createTestChunk({
        chunk_id: "doc-chunk-0001",
        content: "First chunk with enough content to be valid.",
        token_count: 100,
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        chunk_id: "doc-chunk-0002",
        content: "Small.",
        token_count: 10, // Below MIN_TOKENS (80)
        parent_section_id: "section-1",
        sequence_number: 1,
      });

      const result = mergeSmallChunks([chunk1, chunk2]);

      expect(result.length).toBe(1);
      expect(result[0].content).toContain("First chunk");
      expect(result[0].content).toContain("Small.");
    });

    test("does not merge across section boundaries", () => {
      const chunk1 = createTestChunk({
        content: "Content in section one.",
        token_count: 100,
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Small.",
        token_count: 10,
        parent_section_id: "section-2", // Different section
        sequence_number: 1,
      });

      const result = mergeSmallChunks([chunk1, chunk2]);

      expect(result.length).toBe(2);
    });

    test("does not merge if combined would exceed MAX_TOKENS", () => {
      const chunk1 = createTestChunk({
        content: "Large chunk content.",
        token_count: MAX_TOKENS - 20, // Almost at limit
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Small but would exceed.",
        token_count: 50, // Below MIN_TOKENS but would exceed MAX
        parent_section_id: "section-1",
        sequence_number: 1,
      });

      const result = mergeSmallChunks([chunk1, chunk2]);

      expect(result.length).toBe(2);
    });

    test("never merges figure caption chunks", () => {
      const chunk1 = createTestChunk({
        content: "Regular content.",
        token_count: 100,
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Fig caption.",
        token_count: 10,
        parent_section_id: "section-1",
        is_figure_caption: true,
        sequence_number: 1,
      });

      const result = mergeSmallChunks([chunk1, chunk2]);

      expect(result.length).toBe(2);
      expect(result[1].is_figure_caption).toBe(true);
    });

    test("combines source_block_ids when merging", () => {
      const chunk1 = createTestChunk({
        content: "First part.",
        source_block_ids: ["/page/1/Text/1"],
        token_count: 100,
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Second part.",
        source_block_ids: ["/page/1/Text/2"],
        token_count: 10,
        parent_section_id: "section-1",
        sequence_number: 1,
      });

      const result = mergeSmallChunks([chunk1, chunk2]);

      expect(result[0].source_block_ids).toContain("/page/1/Text/1");
      expect(result[0].source_block_ids).toContain("/page/1/Text/2");
    });

    test("updates token and character counts after merge", () => {
      const chunk1 = createTestChunk({
        content: "First.",
        token_count: 100,
        character_count: 6,
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Second.",
        token_count: 10,
        character_count: 7,
        parent_section_id: "section-1",
        sequence_number: 1,
      });

      const result = mergeSmallChunks([chunk1, chunk2]);

      // Should be recalculated, not just summed
      expect(result[0].character_count).toBeGreaterThan(6);
    });

    test("handles empty input", () => {
      const result = mergeSmallChunks([]);
      expect(result).toEqual([]);
    });

    test("handles single chunk", () => {
      const chunk = createTestChunk({ token_count: 50 });
      const result = mergeSmallChunks([chunk]);

      expect(result.length).toBe(1);
    });

    test("merges multiple consecutive small chunks", () => {
      const chunk1 = createTestChunk({
        content: "Base content here.",
        token_count: 100,
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Small 1.",
        token_count: 10,
        parent_section_id: "section-1",
        sequence_number: 1,
      });
      const chunk3 = createTestChunk({
        content: "Small 2.",
        token_count: 10,
        parent_section_id: "section-1",
        sequence_number: 2,
      });

      const result = mergeSmallChunks([chunk1, chunk2, chunk3]);

      expect(result.length).toBe(1);
      expect(result[0].content).toContain("Small 1.");
      expect(result[0].content).toContain("Small 2.");
    });
  });
});
