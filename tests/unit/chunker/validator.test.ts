import { describe, test, expect } from "bun:test";
import { validateChunks, type ValidationResult, type QualityGate } from "../../../src/services/chunker/validator";
import { HARD_MAX_TOKENS, MIN_TOKENS } from "../../../src/services/chunker/tokenizer";
import type { Chunk, ChunksOutput } from "../../../src/models/chunk";

/**
 * Helper to create a valid chunk with default values.
 * Override specific properties as needed.
 */
function createChunk(overrides: Partial<Chunk> = {}): Chunk {
  const defaults: Chunk = {
    chunk_id: "doc-chunk-0001",
    document_id: "doc",
    breadcrumb: ["Section 1"],
    breadcrumb_text: "[Context: Section 1]",
    content: "This is test content for the chunk.",
    content_with_context: "[Context: Section 1]\n\nThis is test content for the chunk.",
    page_numbers: [1],
    source_block_ids: ["/page/1/Text/1"],
    sequence_number: 0,
    previous_chunk_id: null,
    next_chunk_id: null,
    parent_section_id: "section-1",
    figure_references: [],
    token_count: 100,
    character_count: 37,
    overlap_tokens: 0,
    is_figure_caption: false,
    is_table: false,
    contains_abbreviations: false,
  };

  return { ...defaults, ...overrides };
}

/**
 * Helper to create ChunksOutput with the given chunks.
 */
function createChunksOutput(chunks: Chunk[]): ChunksOutput {
  return {
    document_id: "doc",
    generated_at: new Date().toISOString(),
    total_chunks: chunks.length,
    chunks,
  };
}


/**
 * Helper to get a specific gate from validation result.
 */
function getGate(result: ValidationResult, name: string): QualityGate | undefined {
  return result.gates.find((g) => g.name === name);
}

describe("validateChunks", () => {
  describe("overall validation", () => {
    test("returns PASS when all gates pass", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          source_block_ids: ["/page/1/Text/1"],
          token_count: 200,
          breadcrumb: ["Section 1"],
        }),
      ];

      const chunksOutput = createChunksOutput(chunks);

      const result = validateChunks(
        chunksOutput,
        1, // sourceBlockCount matches covered blocks
        0, // expectedFigureCaptions
        1000 // processingTimeMs under 30s
      );

      expect(result.overall_status).toBe("PASS");
      expect(result.gates.every((g) => g.status === "PASS")).toBe(true);
    });

    test("returns FAIL when any gate fails", () => {
      const chunks = [
        createChunk({
          token_count: HARD_MAX_TOKENS + 100, // Exceeds limit
          source_block_ids: ["/page/1/Text/1"],
        }),
      ];

      const chunksOutput = createChunksOutput(chunks);

      const result = validateChunks(chunksOutput, 1, 0, 1000);

      expect(result.overall_status).toBe("FAIL");
    });

    test("includes timestamp in ISO format", () => {
      const chunks = [createChunk()];
      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        1000
      );

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("Gate 1: content_coverage", () => {
    test("passes when all source blocks are covered", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          source_block_ids: ["/page/1/Text/1", "/page/1/Text/2"],
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          source_block_ids: ["/page/1/Text/3"],
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3, // All 3 blocks covered
        0,
        1000
      );

      const gate = getGate(result, "content_coverage");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe("100%");
    });

    test("fails when not all source blocks are covered", () => {
      const chunks = [
        createChunk({
          source_block_ids: ["/page/1/Text/1"],
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        5, // Only 1 of 5 blocks covered
        0,
        1000
      );

      const gate = getGate(result, "content_coverage");
      expect(gate?.status).toBe("FAIL");
      expect(gate?.value).toBe("20%");
      expect(gate?.details).toBe("1/5 blocks covered");
    });

    test("handles duplicate block references correctly", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          source_block_ids: ["/page/1/Text/1"],
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          source_block_ids: ["/page/1/Text/1"], // Same block in overlap
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        1, // Only 1 unique block
        0,
        1000
      );

      const gate = getGate(result, "content_coverage");
      expect(gate?.status).toBe("PASS");
      expect(gate?.details).toBe("1/1 blocks covered");
    });
  });

  describe("Gate 2: max_token_limit", () => {
    test("passes when all chunks are within HARD_MAX_TOKENS", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: 500 }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: HARD_MAX_TOKENS, sequence_number: 1 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "max_token_limit");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe(HARD_MAX_TOKENS);
      expect(gate?.threshold).toBe(HARD_MAX_TOKENS);
    });

    test("fails when any chunk exceeds HARD_MAX_TOKENS", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: 200 }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          token_count: HARD_MAX_TOKENS + 50,
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "max_token_limit");
      expect(gate?.status).toBe("FAIL");
      expect(gate?.value).toBe(HARD_MAX_TOKENS + 50);
      expect(gate?.details).toBe("Chunk doc-chunk-0002 exceeds limit");
    });

    test("handles empty chunks array", () => {
      const chunks: Chunk[] = [];

      const result = validateChunks(
        createChunksOutput(chunks),
        0,
        0,
        1000
      );

      const gate = getGate(result, "max_token_limit");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe(0);
    });

    test("reports the maximum token count chunk", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: 300 }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: 550, sequence_number: 1 }),
        createChunk({ chunk_id: "doc-chunk-0003", token_count: 400, sequence_number: 2 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        0,
        1000
      );

      const gate = getGate(result, "max_token_limit");
      expect(gate?.value).toBe(550);
    });
  });

  describe("Gate 3: min_token_check", () => {
    test("passes when no chunks below MIN_TOKENS", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: MIN_TOKENS }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: 200, sequence_number: 1 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe(0);
    });

    test("passes for small figure caption chunks", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: 20, // Well below MIN_TOKENS
          is_figure_caption: true,
        }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: 200, sequence_number: 1 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        1,
        1000
      );

      const gate = getGate(result, "min_token_check");
      expect(gate?.status).toBe("PASS");
    });

    test("passes for section-final chunks below MIN_TOKENS", () => {
      // Section-final chunk is the last chunk before section change
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: 30, // Below MIN_TOKENS
          parent_section_id: "section-1",
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          token_count: 200,
          parent_section_id: "section-2", // Different section
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      expect(gate?.status).toBe("PASS");
    });

    test("passes for last chunk in document below MIN_TOKENS", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: 200,
          parent_section_id: "section-1",
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          token_count: 30, // Last chunk, below MIN_TOKENS
          parent_section_id: "section-1",
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      expect(gate?.status).toBe("PASS");
    });

    test("fails when more than 1% of chunks are below MIN_TOKENS", () => {
      // Create 100 chunks, 2 of which are small (2%)
      const chunks: Chunk[] = [];
      for (let i = 0; i < 100; i++) {
        chunks.push(
          createChunk({
            chunk_id: `doc-chunk-${String(i).padStart(4, "0")}`,
            token_count: i < 2 ? MIN_TOKENS - 10 : 200, // First 2 are small
            parent_section_id: "section-1", // All same section
            sequence_number: i,
          })
        );
      }

      const result = validateChunks(
        createChunksOutput(chunks),
        100,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      // Note: Last chunk is excluded as section-final, so only 1 small chunk remains (1%)
      // This is right at the boundary
      expect(gate?.status).toBe("FAIL"); // 1% is >= 1%, so it fails
    });

    test("passes when exactly less than 1% of chunks are small", () => {
      // Create 200 chunks, 1 small (0.5%)
      const chunks: Chunk[] = [];
      for (let i = 0; i < 200; i++) {
        chunks.push(
          createChunk({
            chunk_id: `doc-chunk-${String(i).padStart(4, "0")}`,
            token_count: i === 0 ? MIN_TOKENS - 10 : 200,
            parent_section_id: "section-1",
            sequence_number: i,
          })
        );
      }

      const result = validateChunks(
        createChunksOutput(chunks),
        200,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      // Last chunk is section-final, so excluded. First chunk is small (0.5%)
      expect(gate?.status).toBe("PASS");
    });
  });

  describe("Gate 4: breadcrumb_coverage", () => {
    test("passes when all chunks have non-empty breadcrumbs", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          breadcrumb: ["Section 1", "Subsection A"],
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          breadcrumb: ["Section 2"],
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "breadcrumb_coverage");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe("100%");
    });

    test("fails when any chunk has empty breadcrumb array", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          breadcrumb: ["Section 1"],
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          breadcrumb: [], // Empty breadcrumb
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "breadcrumb_coverage");
      expect(gate?.status).toBe("FAIL");
      expect(gate?.value).toBe("50%");
    });

    test("fails when any chunk has null/undefined breadcrumb", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          breadcrumb: ["Section 1"],
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          breadcrumb: undefined as any, // Invalid breadcrumb
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "breadcrumb_coverage");
      expect(gate?.status).toBe("FAIL");
    });
  });

  describe("Gate 5: figure_captions", () => {
    test("passes when all expected figure captions are present", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          is_figure_caption: true,
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          is_figure_caption: true,
          sequence_number: 1,
        }),
        createChunk({
          chunk_id: "doc-chunk-0003",
          is_figure_caption: false,
          sequence_number: 2,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        2, // Expected 2 figure captions
        1000
      );

      const gate = getGate(result, "figure_captions");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe(2);
      expect(gate?.threshold).toBe(2);
    });

    test("passes when more captions found than expected", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          is_figure_caption: true,
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          is_figure_caption: true,
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        1, // Expected 1 but found 2
        1000
      );

      const gate = getGate(result, "figure_captions");
      expect(gate?.status).toBe("PASS");
    });

    test("fails when fewer captions found than expected", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          is_figure_caption: true,
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          is_figure_caption: false,
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        3, // Expected 3 but found only 1
        1000
      );

      const gate = getGate(result, "figure_captions");
      expect(gate?.status).toBe("FAIL");
      expect(gate?.value).toBe(1);
      expect(gate?.threshold).toBe(3);
    });

    test("passes when zero expected and zero found", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          is_figure_caption: false,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0, // No figure captions expected
        1000
      );

      const gate = getGate(result, "figure_captions");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe(0);
    });
  });

  describe("Gate 6: schema_validation", () => {
    test("always passes (schema validation done by Zod)", () => {
      const chunks = [createChunk()];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        1000
      );

      const gate = getGate(result, "schema_validation");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe("valid");
      expect(gate?.threshold).toBe("valid");
    });
  });

  describe("Gate 7: processing_time", () => {
    test("passes when processing time is under 30 seconds", () => {
      const chunks = [createChunk()];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        5000 // 5 seconds
      );

      const gate = getGate(result, "processing_time");
      expect(gate?.status).toBe("PASS");
      expect(gate?.value).toBe("5.00s");
      expect(gate?.threshold).toBe("<30s");
    });

    test("passes at exactly 29.99 seconds", () => {
      const chunks = [createChunk()];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        29990 // 29.99 seconds
      );

      const gate = getGate(result, "processing_time");
      expect(gate?.status).toBe("PASS");
    });

    test("fails when processing time equals 30 seconds", () => {
      const chunks = [createChunk()];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        30000 // Exactly 30 seconds
      );

      const gate = getGate(result, "processing_time");
      expect(gate?.status).toBe("FAIL");
      expect(gate?.value).toBe("30.00s");
    });

    test("fails when processing time exceeds 30 seconds", () => {
      const chunks = [createChunk()];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        45000 // 45 seconds
      );

      const gate = getGate(result, "processing_time");
      expect(gate?.status).toBe("FAIL");
    });
  });

  describe("summary statistics", () => {
    test("calculates total_chunks correctly", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001" }),
        createChunk({ chunk_id: "doc-chunk-0002", sequence_number: 1 }),
        createChunk({ chunk_id: "doc-chunk-0003", sequence_number: 2 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        0,
        1000
      );

      expect(result.summary.total_chunks).toBe(3);
    });

    test("calculates figure_caption_chunks correctly", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", is_figure_caption: true }),
        createChunk({ chunk_id: "doc-chunk-0002", is_figure_caption: false, sequence_number: 1 }),
        createChunk({ chunk_id: "doc-chunk-0003", is_figure_caption: true, sequence_number: 2 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        2,
        1000
      );

      expect(result.summary.figure_caption_chunks).toBe(2);
    });

    test("calculates max_token_count correctly", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: 100 }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: 350, sequence_number: 1 }),
        createChunk({ chunk_id: "doc-chunk-0003", token_count: 200, sequence_number: 2 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        0,
        1000
      );

      expect(result.summary.max_token_count).toBe(350);
    });

    test("calculates avg_token_count correctly", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: 100 }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: 200, sequence_number: 1 }),
        createChunk({ chunk_id: "doc-chunk-0003", token_count: 300, sequence_number: 2 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        0,
        1000
      );

      // Average of 100, 200, 300 = 200
      expect(result.summary.avg_token_count).toBe(200);
    });

    test("rounds avg_token_count to nearest integer", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", token_count: 100 }),
        createChunk({ chunk_id: "doc-chunk-0002", token_count: 101, sequence_number: 1 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      // Average of 100, 101 = 100.5 -> rounds to 101
      expect(result.summary.avg_token_count).toBe(101);
    });

    test("calculates chunks_with_overlap correctly", () => {
      const chunks = [
        createChunk({ chunk_id: "doc-chunk-0001", overlap_tokens: 0 }),
        createChunk({ chunk_id: "doc-chunk-0002", overlap_tokens: 50, sequence_number: 1 }),
        createChunk({ chunk_id: "doc-chunk-0003", overlap_tokens: 0, sequence_number: 2 }),
        createChunk({ chunk_id: "doc-chunk-0004", overlap_tokens: 30, sequence_number: 3 }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        4,
        0,
        1000
      );

      expect(result.summary.chunks_with_overlap).toBe(2);
    });
  });

  describe("edge cases", () => {
    test("handles empty chunks array", () => {
      const chunks: Chunk[] = [];

      const result = validateChunks(
        createChunksOutput(chunks),
        0,
        0,
        1000
      );

      expect(result.summary.total_chunks).toBe(0);
      expect(result.summary.max_token_count).toBe(0);
      // avg_token_count will be NaN due to 0/0, but the function should handle it
    });

    test("handles single chunk", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: 250,
          overlap_tokens: 0,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        1000
      );

      expect(result.summary.total_chunks).toBe(1);
      expect(result.summary.max_token_count).toBe(250);
      expect(result.summary.avg_token_count).toBe(250);
      expect(result.summary.chunks_with_overlap).toBe(0);
    });

    test("handles chunks with multiple source block IDs", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          source_block_ids: ["/page/1/Text/1", "/page/1/Text/2", "/page/1/Text/3"],
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3, // All 3 blocks
        0,
        1000
      );

      const gate = getGate(result, "content_coverage");
      expect(gate?.status).toBe("PASS");
    });

    test("handles very large number of chunks", () => {
      const chunks: Chunk[] = [];
      for (let i = 0; i < 1000; i++) {
        chunks.push(
          createChunk({
            chunk_id: `doc-chunk-${String(i).padStart(4, "0")}`,
            source_block_ids: [`/page/${i + 1}/Text/1`],
            token_count: 200,
            sequence_number: i,
          })
        );
      }

      const result = validateChunks(
        createChunksOutput(chunks),
        1000,
        0,
        1000
      );

      expect(result.summary.total_chunks).toBe(1000);
      expect(result.overall_status).toBe("PASS");
    });

    test("handles boundary value for HARD_MAX_TOKENS exactly", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: HARD_MAX_TOKENS, // Exactly at limit
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        1,
        0,
        1000
      );

      const gate = getGate(result, "max_token_limit");
      expect(gate?.status).toBe("PASS");
    });

    test("handles boundary value for MIN_TOKENS exactly", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: MIN_TOKENS, // Exactly at minimum
          parent_section_id: "section-1",
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          token_count: 200,
          parent_section_id: "section-2",
          sequence_number: 1,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        2,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      expect(gate?.status).toBe("PASS");
    });

    test("handles chunk just below MIN_TOKENS (not section-final, not caption)", () => {
      // 3 chunks in same section, middle one is small
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: 200,
          parent_section_id: "section-1",
          is_figure_caption: false,
        }),
        createChunk({
          chunk_id: "doc-chunk-0002",
          token_count: MIN_TOKENS - 1, // Just below minimum
          parent_section_id: "section-1",
          is_figure_caption: false,
          sequence_number: 1,
        }),
        createChunk({
          chunk_id: "doc-chunk-0003",
          token_count: 200,
          parent_section_id: "section-1",
          is_figure_caption: false,
          sequence_number: 2,
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        3,
        0,
        1000
      );

      const gate = getGate(result, "min_token_check");
      // 1 small chunk out of 3 = 33.33% which is >= 1%
      expect(gate?.status).toBe("FAIL");
    });
  });

  describe("multiple failing gates", () => {
    test("reports all failing gates", () => {
      const chunks = [
        createChunk({
          chunk_id: "doc-chunk-0001",
          token_count: HARD_MAX_TOKENS + 100, // Fail: max_token_limit
          breadcrumb: [], // Fail: breadcrumb_coverage
          source_block_ids: ["/page/1/Text/1"],
        }),
      ];

      const result = validateChunks(
        createChunksOutput(chunks),
        5, // Fail: content_coverage (only 1/5 covered)
        3, // Fail: figure_captions (0 found, 3 expected)
        35000 // Fail: processing_time (35s > 30s)
      );

      expect(result.overall_status).toBe("FAIL");

      const failedGates = result.gates.filter((g) => g.status === "FAIL");
      expect(failedGates.length).toBeGreaterThanOrEqual(4);

      // Verify specific gates failed
      expect(getGate(result, "content_coverage")?.status).toBe("FAIL");
      expect(getGate(result, "max_token_limit")?.status).toBe("FAIL");
      expect(getGate(result, "breadcrumb_coverage")?.status).toBe("FAIL");
      expect(getGate(result, "figure_captions")?.status).toBe("FAIL");
      expect(getGate(result, "processing_time")?.status).toBe("FAIL");
    });
  });
});
