import { describe, test, expect } from "bun:test";
import {
  isSameSection,
  isSectionBoundary,
  getSectionId,
  isSectionFinal,
  getSectionFinalChunkIds,
} from "../../../src/services/chunker/section-utils";
import type { Chunk } from "../../../src/models/chunk";

// Helper to create a minimal chunk with just the fields we need
function createTestChunk(
  chunkId: string,
  parentSectionId: string
): Chunk {
  return {
    chunk_id: chunkId,
    document_id: "test-doc",
    breadcrumb: ["Section"],
    breadcrumb_text: "[Context: Section]",
    content: "Test content",
    content_with_context: "[Context: Section]\n\nTest content",
    page_numbers: [1],
    source_block_ids: ["block-1"],
    sequence_number: 0,
    previous_chunk_id: null,
    next_chunk_id: null,
    parent_section_id: parentSectionId,
    figure_references: [],
    token_count: 50,
    character_count: 12,
    overlap_tokens: 0,
    is_figure_caption: false,
    is_table: false,
    contains_abbreviations: false,
  };
}

describe("section-utils", () => {
  describe("isSameSection", () => {
    test("returns true for chunks in same section", () => {
      const chunkA = createTestChunk("chunk-0001", "section-1");
      const chunkB = createTestChunk("chunk-0002", "section-1");

      expect(isSameSection(chunkA, chunkB)).toBe(true);
    });

    test("returns false for chunks in different sections", () => {
      const chunkA = createTestChunk("chunk-0001", "section-1");
      const chunkB = createTestChunk("chunk-0002", "section-2");

      expect(isSameSection(chunkA, chunkB)).toBe(false);
    });

    test("is symmetric", () => {
      const chunkA = createTestChunk("chunk-0001", "section-1");
      const chunkB = createTestChunk("chunk-0002", "section-2");

      expect(isSameSection(chunkA, chunkB)).toBe(isSameSection(chunkB, chunkA));
    });
  });

  describe("isSectionBoundary", () => {
    test("returns true when sections differ", () => {
      const prevChunk = createTestChunk("chunk-0001", "section-1");
      const currChunk = createTestChunk("chunk-0002", "section-2");

      expect(isSectionBoundary(prevChunk, currChunk)).toBe(true);
    });

    test("returns false when sections match", () => {
      const prevChunk = createTestChunk("chunk-0001", "section-1");
      const currChunk = createTestChunk("chunk-0002", "section-1");

      expect(isSectionBoundary(prevChunk, currChunk)).toBe(false);
    });

    test("is inverse of isSameSection", () => {
      const chunkA = createTestChunk("chunk-0001", "section-1");
      const chunkB = createTestChunk("chunk-0002", "section-2");

      expect(isSectionBoundary(chunkA, chunkB)).toBe(!isSameSection(chunkA, chunkB));
    });
  });

  describe("getSectionId", () => {
    test("returns parent_section_id", () => {
      const chunk = createTestChunk("chunk-0001", "my-section-id");

      expect(getSectionId(chunk)).toBe("my-section-id");
    });
  });

  describe("isSectionFinal", () => {
    test("returns true when nextChunk is undefined", () => {
      const chunk = createTestChunk("chunk-0001", "section-1");

      expect(isSectionFinal(chunk, undefined)).toBe(true);
    });

    test("returns true when next chunk is in different section", () => {
      const chunk = createTestChunk("chunk-0001", "section-1");
      const nextChunk = createTestChunk("chunk-0002", "section-2");

      expect(isSectionFinal(chunk, nextChunk)).toBe(true);
    });

    test("returns false when next chunk is in same section", () => {
      const chunk = createTestChunk("chunk-0001", "section-1");
      const nextChunk = createTestChunk("chunk-0002", "section-1");

      expect(isSectionFinal(chunk, nextChunk)).toBe(false);
    });
  });

  describe("getSectionFinalChunkIds", () => {
    test("returns empty set for empty array", () => {
      const result = getSectionFinalChunkIds([]);

      expect(result.size).toBe(0);
    });

    test("returns single chunk id for single-element array", () => {
      const chunks = [createTestChunk("test-doc-chunk-0001", "section-1")];

      const result = getSectionFinalChunkIds(chunks);

      expect(result.size).toBe(1);
      expect(result.has("test-doc-chunk-0001")).toBe(true);
    });

    test("identifies last chunk as section final", () => {
      const chunks = [
        createTestChunk("test-doc-chunk-0001", "section-1"),
        createTestChunk("test-doc-chunk-0002", "section-1"),
        createTestChunk("test-doc-chunk-0003", "section-1"),
      ];

      const result = getSectionFinalChunkIds(chunks);

      expect(result.size).toBe(1);
      expect(result.has("test-doc-chunk-0003")).toBe(true);
    });

    test("identifies chunks before section change as section final", () => {
      const chunks = [
        createTestChunk("test-doc-chunk-0001", "section-1"),
        createTestChunk("test-doc-chunk-0002", "section-1"),
        createTestChunk("test-doc-chunk-0003", "section-2"),
        createTestChunk("test-doc-chunk-0004", "section-2"),
      ];

      const result = getSectionFinalChunkIds(chunks);

      expect(result.size).toBe(2);
      expect(result.has("test-doc-chunk-0002")).toBe(true); // End of section-1
      expect(result.has("test-doc-chunk-0004")).toBe(true); // End of section-2
    });

    test("handles multiple section boundaries", () => {
      const chunks = [
        createTestChunk("test-doc-chunk-0001", "section-1"),
        createTestChunk("test-doc-chunk-0002", "section-2"),
        createTestChunk("test-doc-chunk-0003", "section-3"),
        createTestChunk("test-doc-chunk-0004", "section-3"),
      ];

      const result = getSectionFinalChunkIds(chunks);

      expect(result.size).toBe(3);
      expect(result.has("test-doc-chunk-0001")).toBe(true); // End of section-1
      expect(result.has("test-doc-chunk-0002")).toBe(true); // End of section-2
      expect(result.has("test-doc-chunk-0004")).toBe(true); // End of section-3
    });
  });
});
