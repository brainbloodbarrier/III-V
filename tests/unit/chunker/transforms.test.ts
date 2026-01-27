import { describe, test, expect } from "bun:test";
import {
  withTokenCount,
  withFigureRef,
  withFigureRefs,
  withOverlapContext,
  withNoOverlap,
  withLinking,
  withNextChunkId,
  asFigureCaption,
  builderWithFigureRef,
  builderWithFigureRefs,
  builderAsFigureCaption,
  relinkChunksImmutable,
  linkNextChunks,
} from "../../../src/services/chunker/transforms";
import type { Chunk, ChunkBuilder, FigureRef } from "../../../src/models/chunk";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    chunk_id: "test-doc-chunk-0000",
    document_id: "test-doc",
    breadcrumb: ["Document Root"],
    breadcrumb_text: "[Context: Document Root]",
    content: "Test chunk content.",
    content_with_context: "[Context: Document Root]\n\nTest chunk content.",
    page_numbers: [1],
    source_block_ids: ["/page/1/Text/1"],
    sequence_number: 0,
    previous_chunk_id: null,
    next_chunk_id: null,
    parent_section_id: "section-1",
    figure_references: [],
    token_count: 10,
    character_count: 40,
    overlap_tokens: 0,
    is_figure_caption: false,
    is_table: false,
    contains_abbreviations: false,
    ...overrides,
  };
}

function createMockChunkBuilder(overrides: Partial<ChunkBuilder> = {}): ChunkBuilder {
  return {
    document_id: "test-doc",
    breadcrumb: ["Document Root"],
    breadcrumb_text: "[Context: Document Root]",
    content: "Test builder content.",
    content_with_context: "[Context: Document Root]\n\nTest builder content.",
    page_numbers: [1],
    source_block_ids: ["/page/1/Text/1"],
    parent_section_id: "section-1",
    figure_references: [],
    token_count: 10,
    character_count: 40,
    overlap_tokens: 0,
    is_figure_caption: false,
    is_table: false,
    contains_abbreviations: false,
    ...overrides,
  };
}

function createMockFigureRef(overrides: Partial<FigureRef> = {}): FigureRef {
  return {
    figure_id: "Fig. 4.1",
    image_path: "./images/image-001.jpg",
    caption_snippet: "The cerebral veins...",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("transforms", () => {
  // ===========================================================================
  // Chunk Transform Tests
  // ===========================================================================

  describe("withTokenCount", () => {
    test("returns new chunk with updated token count", () => {
      const chunk = createMockChunk({ token_count: 10 });

      const result = withTokenCount(chunk, 50);

      expect(result.token_count).toBe(50);
      expect(result).not.toBe(chunk); // Different object reference
    });

    test("does not mutate original chunk", () => {
      const chunk = createMockChunk({ token_count: 10 });

      withTokenCount(chunk, 50);

      expect(chunk.token_count).toBe(10);
    });

    test("preserves all other chunk fields", () => {
      const chunk = createMockChunk({
        chunk_id: "my-id",
        content: "my content",
        page_numbers: [1, 2, 3],
      });

      const result = withTokenCount(chunk, 100);

      expect(result.chunk_id).toBe("my-id");
      expect(result.content).toBe("my content");
      expect(result.page_numbers).toEqual([1, 2, 3]);
    });
  });

  describe("withFigureRef", () => {
    test("appends figure reference to empty array", () => {
      const chunk = createMockChunk({ figure_references: [] });
      const figRef = createMockFigureRef();

      const result = withFigureRef(chunk, figRef);

      expect(result.figure_references).toHaveLength(1);
      expect(result.figure_references[0]).toEqual(figRef);
    });

    test("appends figure reference to existing array", () => {
      const existingRef = createMockFigureRef({ figure_id: "Fig. 1.1" });
      const newRef = createMockFigureRef({ figure_id: "Fig. 1.2" });
      const chunk = createMockChunk({ figure_references: [existingRef] });

      const result = withFigureRef(chunk, newRef);

      expect(result.figure_references).toHaveLength(2);
      expect(result.figure_references[0]).toEqual(existingRef);
      expect(result.figure_references[1]).toEqual(newRef);
    });

    test("does not mutate original chunk", () => {
      const chunk = createMockChunk({ figure_references: [] });
      const figRef = createMockFigureRef();

      withFigureRef(chunk, figRef);

      expect(chunk.figure_references).toHaveLength(0);
    });
  });

  describe("withFigureRefs", () => {
    test("replaces all figure references", () => {
      const existingRef = createMockFigureRef({ figure_id: "Fig. 1.1" });
      const chunk = createMockChunk({ figure_references: [existingRef] });

      const newRefs = [
        createMockFigureRef({ figure_id: "Fig. 2.1" }),
        createMockFigureRef({ figure_id: "Fig. 2.2" }),
      ];

      const result = withFigureRefs(chunk, newRefs);

      expect(result.figure_references).toHaveLength(2);
      expect(result.figure_references[0]?.figure_id).toBe("Fig. 2.1");
      expect(result.figure_references[1]?.figure_id).toBe("Fig. 2.2");
    });

    test("clears figure references with empty array", () => {
      const existingRef = createMockFigureRef();
      const chunk = createMockChunk({ figure_references: [existingRef] });

      const result = withFigureRefs(chunk, []);

      expect(result.figure_references).toHaveLength(0);
    });
  });

  describe("withOverlapContext", () => {
    test("prepends overlap content to chunk content", () => {
      const chunk = createMockChunk({ content: "Original content." });

      const result = withOverlapContext(chunk, "Previous sentences.", 5);

      expect(result.content).toBe("Previous sentences. Original content.");
    });

    test("updates content_with_context correctly", () => {
      const chunk = createMockChunk({
        content: "Original.",
        breadcrumb_text: "[Context: Test Section]",
      });

      const result = withOverlapContext(chunk, "Overlap.", 2);

      expect(result.content_with_context).toBe(
        "[Context: Test Section]\n\nOverlap. Original."
      );
    });

    test("sets overlap_tokens correctly", () => {
      const chunk = createMockChunk({ overlap_tokens: 0 });

      const result = withOverlapContext(chunk, "Some overlap text.", 10);

      expect(result.overlap_tokens).toBe(10);
    });

    test("recalculates token_count", () => {
      const chunk = createMockChunk({ token_count: 10 });

      const result = withOverlapContext(chunk, "Additional context tokens.", 5);

      // Token count should be different (recalculated)
      expect(result.token_count).not.toBe(10);
    });

    test("updates character_count", () => {
      const chunk = createMockChunk({
        content: "Short.",
        character_count: 6,
      });

      const result = withOverlapContext(chunk, "Prepended.", 3);

      expect(result.character_count).toBe("Prepended. Short.".length);
    });

    test("does not mutate original chunk", () => {
      const chunk = createMockChunk({
        content: "Original.",
        overlap_tokens: 0,
      });

      withOverlapContext(chunk, "Overlap.", 5);

      expect(chunk.content).toBe("Original.");
      expect(chunk.overlap_tokens).toBe(0);
    });
  });

  describe("withNoOverlap", () => {
    test("sets overlap_tokens to zero", () => {
      const chunk = createMockChunk({ overlap_tokens: 10 });

      const result = withNoOverlap(chunk);

      expect(result.overlap_tokens).toBe(0);
    });

    test("preserves chunk with zero overlap unchanged", () => {
      const chunk = createMockChunk({ overlap_tokens: 0 });

      const result = withNoOverlap(chunk);

      expect(result.overlap_tokens).toBe(0);
    });
  });

  describe("withLinking", () => {
    test("updates all linking fields", () => {
      const chunk = createMockChunk({
        chunk_id: "old-id",
        sequence_number: 99,
        previous_chunk_id: "old-prev",
        next_chunk_id: "old-next",
      });

      const result = withLinking(chunk, "new-id", 5, "new-prev", "new-next");

      expect(result.chunk_id).toBe("new-id");
      expect(result.sequence_number).toBe(5);
      expect(result.previous_chunk_id).toBe("new-prev");
      expect(result.next_chunk_id).toBe("new-next");
    });

    test("handles null values for first/last chunk", () => {
      const chunk = createMockChunk();

      const result = withLinking(chunk, "first-chunk", 0, null, "next-id");

      expect(result.previous_chunk_id).toBeNull();
      expect(result.next_chunk_id).toBe("next-id");
    });

    test("does not mutate original chunk", () => {
      const chunk = createMockChunk({ chunk_id: "original-id" });

      withLinking(chunk, "new-id", 0, null, null);

      expect(chunk.chunk_id).toBe("original-id");
    });
  });

  describe("withNextChunkId", () => {
    test("updates only next_chunk_id", () => {
      const chunk = createMockChunk({
        next_chunk_id: null,
        previous_chunk_id: "keep-this",
      });

      const result = withNextChunkId(chunk, "new-next");

      expect(result.next_chunk_id).toBe("new-next");
      expect(result.previous_chunk_id).toBe("keep-this");
    });

    test("can set to null", () => {
      const chunk = createMockChunk({ next_chunk_id: "had-value" });

      const result = withNextChunkId(chunk, null);

      expect(result.next_chunk_id).toBeNull();
    });
  });

  describe("asFigureCaption", () => {
    test("marks chunk as figure caption", () => {
      const chunk = createMockChunk({ is_figure_caption: false });

      const result = asFigureCaption(chunk);

      expect(result.is_figure_caption).toBe(true);
    });

    test("preserves true value if already set", () => {
      const chunk = createMockChunk({ is_figure_caption: true });

      const result = asFigureCaption(chunk);

      expect(result.is_figure_caption).toBe(true);
    });
  });

  // ===========================================================================
  // ChunkBuilder Transform Tests
  // ===========================================================================

  describe("builderWithFigureRef", () => {
    test("appends figure reference to builder", () => {
      const builder = createMockChunkBuilder({ figure_references: [] });
      const figRef = createMockFigureRef();

      const result = builderWithFigureRef(builder, figRef);

      expect(result.figure_references).toHaveLength(1);
      expect(result.figure_references[0]).toEqual(figRef);
    });

    test("does not mutate original builder", () => {
      const builder = createMockChunkBuilder({ figure_references: [] });
      const figRef = createMockFigureRef();

      builderWithFigureRef(builder, figRef);

      expect(builder.figure_references).toHaveLength(0);
    });
  });

  describe("builderWithFigureRefs", () => {
    test("replaces all figure references in builder", () => {
      const builder = createMockChunkBuilder({
        figure_references: [createMockFigureRef({ figure_id: "Fig. 1.1" })],
      });

      const newRefs = [
        createMockFigureRef({ figure_id: "Fig. 2.1" }),
        createMockFigureRef({ figure_id: "Fig. 2.2" }),
      ];

      const result = builderWithFigureRefs(builder, newRefs);

      expect(result.figure_references).toHaveLength(2);
      expect(result.figure_references[0]?.figure_id).toBe("Fig. 2.1");
    });
  });

  describe("builderAsFigureCaption", () => {
    test("marks builder as figure caption", () => {
      const builder = createMockChunkBuilder({ is_figure_caption: false });

      const result = builderAsFigureCaption(builder);

      expect(result.is_figure_caption).toBe(true);
    });

    test("does not mutate original builder", () => {
      const builder = createMockChunkBuilder({ is_figure_caption: false });

      builderAsFigureCaption(builder);

      expect(builder.is_figure_caption).toBe(false);
    });
  });

  // ===========================================================================
  // Batch Transform Tests
  // ===========================================================================

  describe("relinkChunksImmutable", () => {
    const mockGenerateId = (docId: string, seq: number): string =>
      `${docId}-chunk-${seq.toString().padStart(4, "0")}`;

    test("relinks all chunks with new IDs", () => {
      const chunks = [
        createMockChunk({ chunk_id: "old-1" }),
        createMockChunk({ chunk_id: "old-2" }),
        createMockChunk({ chunk_id: "old-3" }),
      ];

      const result = relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(result[0]?.chunk_id).toBe("doc-chunk-0000");
      expect(result[1]?.chunk_id).toBe("doc-chunk-0001");
      expect(result[2]?.chunk_id).toBe("doc-chunk-0002");
    });

    test("sets sequence numbers correctly", () => {
      const chunks = [
        createMockChunk({ sequence_number: 99 }),
        createMockChunk({ sequence_number: 100 }),
      ];

      const result = relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(result[0]?.sequence_number).toBe(0);
      expect(result[1]?.sequence_number).toBe(1);
    });

    test("links previous_chunk_id correctly", () => {
      const chunks = [createMockChunk(), createMockChunk(), createMockChunk()];

      const result = relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(result[0]?.previous_chunk_id).toBeNull();
      expect(result[1]?.previous_chunk_id).toBe("doc-chunk-0000");
      expect(result[2]?.previous_chunk_id).toBe("doc-chunk-0001");
    });

    test("links next_chunk_id correctly", () => {
      const chunks = [createMockChunk(), createMockChunk(), createMockChunk()];

      const result = relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(result[0]?.next_chunk_id).toBe("doc-chunk-0001");
      expect(result[1]?.next_chunk_id).toBe("doc-chunk-0002");
      expect(result[2]?.next_chunk_id).toBeNull();
    });

    test("handles empty array", () => {
      const result = relinkChunksImmutable([], "doc", mockGenerateId);

      expect(result).toHaveLength(0);
    });

    test("handles single chunk", () => {
      const chunks = [createMockChunk()];

      const result = relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(result).toHaveLength(1);
      expect(result[0]?.chunk_id).toBe("doc-chunk-0000");
      expect(result[0]?.previous_chunk_id).toBeNull();
      expect(result[0]?.next_chunk_id).toBeNull();
    });

    test("does not mutate original chunks", () => {
      const chunks = [
        createMockChunk({ chunk_id: "original-id" }),
      ];

      relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(chunks[0]?.chunk_id).toBe("original-id");
    });

    test("returns new array", () => {
      const chunks = [createMockChunk()];

      const result = relinkChunksImmutable(chunks, "doc", mockGenerateId);

      expect(result).not.toBe(chunks);
    });
  });

  describe("linkNextChunks", () => {
    test("links next_chunk_id for all but last chunk", () => {
      const chunks = [
        createMockChunk({ chunk_id: "chunk-0", next_chunk_id: null }),
        createMockChunk({ chunk_id: "chunk-1", next_chunk_id: null }),
        createMockChunk({ chunk_id: "chunk-2", next_chunk_id: null }),
      ];

      const result = linkNextChunks(chunks);

      expect(result[0]?.next_chunk_id).toBe("chunk-1");
      expect(result[1]?.next_chunk_id).toBe("chunk-2");
      expect(result[2]?.next_chunk_id).toBeNull();
    });

    test("handles empty array", () => {
      const result = linkNextChunks([]);

      expect(result).toHaveLength(0);
    });

    test("handles single chunk (no next)", () => {
      const chunks = [createMockChunk({ chunk_id: "only-chunk" })];

      const result = linkNextChunks(chunks);

      expect(result[0]?.next_chunk_id).toBeNull();
    });

    test("does not mutate original chunks", () => {
      const chunks = [
        createMockChunk({ chunk_id: "chunk-0", next_chunk_id: null }),
        createMockChunk({ chunk_id: "chunk-1", next_chunk_id: null }),
      ];

      linkNextChunks(chunks);

      expect(chunks[0]?.next_chunk_id).toBeNull();
    });

    test("returns new array", () => {
      const chunks = [createMockChunk()];

      const result = linkNextChunks(chunks);

      expect(result).not.toBe(chunks);
    });
  });
});
