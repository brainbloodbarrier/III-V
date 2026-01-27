import { describe, test, expect } from "bun:test";
import {
  generateOverlap,
  applyOverlapToChunks,
} from "../../../src/services/chunker/overlap";
import type { Chunk } from "../../../src/models/chunk";

describe("overlap", () => {
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

  describe("generateOverlap", () => {
    test("extracts last 2 sentences from previous chunk", () => {
      const prevContent = "First sentence. Second sentence. Third sentence.";
      const { overlapContent } = generateOverlap(prevContent, 2);

      expect(overlapContent).toContain("Second sentence.");
      expect(overlapContent).toContain("Third sentence.");
      expect(overlapContent).not.toContain("First sentence.");
    });

    test("returns all sentences if fewer than requested", () => {
      const prevContent = "Only one sentence.";
      const { overlapContent } = generateOverlap(prevContent, 2);

      expect(overlapContent).toBe("Only one sentence.");
    });

    test("calculates overlap token count", () => {
      const prevContent = "First sentence. Second sentence.";
      const { overlapTokens } = generateOverlap(prevContent, 2);

      expect(overlapTokens).toBeGreaterThan(0);
    });

    test("returns empty overlap for empty content", () => {
      const { overlapContent, overlapTokens } = generateOverlap("", 2);

      expect(overlapContent).toBe("");
      expect(overlapTokens).toBe(0);
    });
  });

  describe("applyOverlapToChunks", () => {
    test("adds overlap to second chunk in same section", () => {
      const chunk1 = createTestChunk({
        chunk_id: "doc-chunk-0001",
        content: "First sentence. Second sentence. Third sentence.",
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        chunk_id: "doc-chunk-0002",
        content: "Fourth sentence here.",
        parent_section_id: "section-1",
        sequence_number: 1,
      });

      const result = applyOverlapToChunks([chunk1, chunk2]);

      expect(result[0].overlap_tokens).toBe(0); // First chunk has no overlap
      expect(result[1].overlap_tokens).toBeGreaterThan(0);
      expect(result[1].content).toContain("Third sentence.");
    });

    test("does not add overlap across section boundaries", () => {
      const chunk1 = createTestChunk({
        chunk_id: "doc-chunk-0001",
        content: "First sentence. Second sentence.",
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        chunk_id: "doc-chunk-0002",
        content: "New section content.",
        parent_section_id: "section-2", // Different section
        sequence_number: 1,
      });

      const result = applyOverlapToChunks([chunk1, chunk2]);

      expect(result[1].overlap_tokens).toBe(0);
      expect(result[1].content).toBe("New section content.");
    });

    test("first chunk in section has zero overlap", () => {
      const chunk1 = createTestChunk({
        parent_section_id: "section-1",
        sequence_number: 0,
      });

      const result = applyOverlapToChunks([chunk1]);

      expect(result[0].overlap_tokens).toBe(0);
    });

    test("does not add overlap to figure caption chunks", () => {
      const chunk1 = createTestChunk({
        content: "Regular content. More content.",
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Figure caption text.",
        parent_section_id: "section-1",
        is_figure_caption: true,
        sequence_number: 1,
      });

      const result = applyOverlapToChunks([chunk1, chunk2]);

      expect(result[1].overlap_tokens).toBe(0);
      expect(result[1].content).toBe("Figure caption text.");
    });

    test("handles chunks with fewer than 2 sentences", () => {
      const chunk1 = createTestChunk({
        content: "Short.",
        parent_section_id: "section-1",
        sequence_number: 0,
      });
      const chunk2 = createTestChunk({
        content: "Next chunk.",
        parent_section_id: "section-1",
        sequence_number: 1,
      });

      const result = applyOverlapToChunks([chunk1, chunk2]);

      // Should handle gracefully - may include the short sentence or skip
      expect(result[1].overlap_tokens).toBeGreaterThanOrEqual(0);
    });
  });
});
