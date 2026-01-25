import { describe, test, expect } from "bun:test";
import {
  ChunkSchema,
  ChunkIndexSchema,
  ChunksOutputSchema,
  FigureRefSchema,
} from "../../src/models/schemas";

describe("Chunk Schema Contract Tests", () => {
  describe("ChunkSchema", () => {
    test("validates a complete valid chunk", () => {
      const validChunk = {
        chunk_id: "rhoton-doc-chunk-0001",
        document_id: "rhoton-doc",
        breadcrumb: ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"],
        breadcrumb_text: "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS]",
        content: "The cerebral veins drain the brain.",
        content_with_context: "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS]\n\nThe cerebral veins drain the brain.",
        page_numbers: [1],
        source_block_ids: ["/page/1/Text/1"],
        sequence_number: 0,
        previous_chunk_id: null,
        next_chunk_id: "rhoton-doc-chunk-0002",
        parent_section_id: "/page/1/SectionHeader/1",
        figure_references: [],
        token_count: 25,
        character_count: 100,
        overlap_tokens: 0,
        is_figure_caption: false,
        is_table: false,
        contains_abbreviations: false,
      };

      const result = ChunkSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });

    test("rejects chunk_id with invalid pattern", () => {
      const invalidChunk = {
        chunk_id: "invalid-id", // missing -chunk-NNNN
        document_id: "doc",
        breadcrumb: ["Test"],
        breadcrumb_text: "[Context: Test]",
        content: "Test",
        content_with_context: "[Context: Test]\n\nTest",
        page_numbers: [1],
        source_block_ids: ["/page/1/Text/1"],
        sequence_number: 0,
        previous_chunk_id: null,
        next_chunk_id: null,
        parent_section_id: "section",
        figure_references: [],
        token_count: 5,
        character_count: 4,
        overlap_tokens: 0,
        is_figure_caption: false,
        is_table: false,
        contains_abbreviations: false,
      };

      const result = ChunkSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    test("rejects token_count > 600", () => {
      const invalidChunk = {
        chunk_id: "doc-chunk-0001",
        document_id: "doc",
        breadcrumb: ["Test"],
        breadcrumb_text: "[Context: Test]",
        content: "Test",
        content_with_context: "[Context: Test]\n\nTest",
        page_numbers: [1],
        source_block_ids: ["/page/1/Text/1"],
        sequence_number: 0,
        previous_chunk_id: null,
        next_chunk_id: null,
        parent_section_id: "section",
        figure_references: [],
        token_count: 601, // exceeds hard max
        character_count: 4,
        overlap_tokens: 0,
        is_figure_caption: false,
        is_table: false,
        contains_abbreviations: false,
      };

      const result = ChunkSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    test("rejects empty breadcrumb array", () => {
      const invalidChunk = {
        chunk_id: "doc-chunk-0001",
        document_id: "doc",
        breadcrumb: [], // must have at least 1 element
        breadcrumb_text: "[Context: Test]",
        content: "Test",
        content_with_context: "[Context: Test]\n\nTest",
        page_numbers: [1],
        source_block_ids: ["/page/1/Text/1"],
        sequence_number: 0,
        previous_chunk_id: null,
        next_chunk_id: null,
        parent_section_id: "section",
        figure_references: [],
        token_count: 5,
        character_count: 4,
        overlap_tokens: 0,
        is_figure_caption: false,
        is_table: false,
        contains_abbreviations: false,
      };

      const result = ChunkSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });
  });

  describe("FigureRefSchema", () => {
    test("validates valid figure reference", () => {
      const validRef = {
        figure_id: "Fig. 4.1",
        image_path: "./images/fig-4-1.jpg",
        caption_snippet: "The superficial veins showing...",
      };

      const result = FigureRefSchema.safeParse(validRef);
      expect(result.success).toBe(true);
    });

    test("rejects invalid figure_id pattern", () => {
      const invalidRef = {
        figure_id: "Figure 4.1", // should be "Fig. X.Y"
        image_path: "./images/fig.jpg",
        caption_snippet: "Caption",
      };

      const result = FigureRefSchema.safeParse(invalidRef);
      expect(result.success).toBe(false);
    });
  });

  describe("ChunkIndexSchema", () => {
    test("validates valid chunk index", () => {
      const validIndex = {
        document_id: "rhoton-doc",
        total_chunks: 2,
        chunks_by_section: {
          "/page/1/SectionHeader/1": ["rhoton-doc-chunk-0001", "rhoton-doc-chunk-0002"],
        },
        chunks_by_page: {
          "1": ["rhoton-doc-chunk-0001"],
          "2": ["rhoton-doc-chunk-0002"],
        },
        figure_to_chunks: {
          "Fig. 4.1": ["rhoton-doc-chunk-0001"],
        },
      };

      const result = ChunkIndexSchema.safeParse(validIndex);
      expect(result.success).toBe(true);
    });
  });

  describe("ChunksOutputSchema", () => {
    test("validates complete chunks output", () => {
      const validOutput = {
        document_id: "rhoton-doc",
        generated_at: "2026-01-24T12:00:00Z",
        total_chunks: 1,
        chunks: [
          {
            chunk_id: "rhoton-doc-chunk-0001",
            document_id: "rhoton-doc",
            breadcrumb: ["Test"],
            breadcrumb_text: "[Context: Test]",
            content: "Content",
            content_with_context: "[Context: Test]\n\nContent",
            page_numbers: [1],
            source_block_ids: ["/page/1/Text/1"],
            sequence_number: 0,
            previous_chunk_id: null,
            next_chunk_id: null,
            parent_section_id: "section",
            figure_references: [],
            token_count: 10,
            character_count: 7,
            overlap_tokens: 0,
            is_figure_caption: false,
            is_table: false,
            contains_abbreviations: false,
          },
        ],
      };

      const result = ChunksOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});
