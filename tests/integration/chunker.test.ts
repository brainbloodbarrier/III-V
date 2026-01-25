import { describe, test, expect, beforeAll } from "bun:test";
import { existsSync, readFileSync, rmSync, mkdirSync } from "fs";
import { resolve } from "path";
import { runChunker, type ChunkerConfig } from "../../src/services/chunker";
import { ChunksOutputSchema, ChunkIndexSchema } from "../../src/models/schemas";

describe("Chunking Pipeline Integration", () => {
  const projectRoot = resolve(import.meta.dir, "../..");
  const testOutputDir = resolve(projectRoot, "processed/02_chunks_test");

  const config: ChunkerConfig = {
    inputPath: resolve(projectRoot, "processed/01_normalized/document.json"),
    figureMapPath: resolve(projectRoot, "processed/01_normalized/figure_map.json"),
    outputDir: testOutputDir,
  };

  // Check if Phase 1 outputs exist
  const phase1Exists = existsSync(config.inputPath) && existsSync(config.figureMapPath);

  beforeAll(() => {
    // Clean up test output directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true });
    }
    mkdirSync(testOutputDir, { recursive: true });
  });

  test.skipIf(!phase1Exists)("runs full pipeline successfully", async () => {
    const result = await runChunker(config);

    expect(result.totalChunks).toBeGreaterThan(0);
    expect(result.chunks.length).toBe(result.totalChunks);
    expect(result.validationPassed).toBe(true);
  });

  test.skipIf(!phase1Exists)("produces valid chunks.json", async () => {
    const chunksPath = resolve(testOutputDir, "chunks.json");
    expect(existsSync(chunksPath)).toBe(true);

    const content = JSON.parse(readFileSync(chunksPath, "utf-8"));
    const validation = ChunksOutputSchema.safeParse(content);

    expect(validation.success).toBe(true);
  });

  test.skipIf(!phase1Exists)("produces valid chunk_index.json", async () => {
    const indexPath = resolve(testOutputDir, "chunk_index.json");
    expect(existsSync(indexPath)).toBe(true);

    const content = JSON.parse(readFileSync(indexPath, "utf-8"));
    const validation = ChunkIndexSchema.safeParse(content);

    expect(validation.success).toBe(true);
  });

  test.skipIf(!phase1Exists)("produces preview.html", async () => {
    const previewPath = resolve(testOutputDir, "preview.html");
    expect(existsSync(previewPath)).toBe(true);

    const content = readFileSync(previewPath, "utf-8");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("Chunk Preview");
  });

  test.skipIf(!phase1Exists)("produces chunking-validation.json", async () => {
    const validationPath = resolve(testOutputDir, "chunking-validation.json");
    expect(existsSync(validationPath)).toBe(true);

    const content = JSON.parse(readFileSync(validationPath, "utf-8"));
    expect(content.overall_status).toBeDefined();
    expect(content.gates).toBeInstanceOf(Array);
  });

  test.skipIf(!phase1Exists)("all chunks have valid breadcrumbs", async () => {
    const chunksPath = resolve(testOutputDir, "chunks.json");
    const { chunks } = JSON.parse(readFileSync(chunksPath, "utf-8"));

    for (const chunk of chunks) {
      expect(chunk.breadcrumb.length).toBeGreaterThan(0);
      expect(chunk.breadcrumb_text).toMatch(/^\[Context: .+\]$/);
    }
  });

  test.skipIf(!phase1Exists)("no chunk exceeds 600 tokens", async () => {
    const chunksPath = resolve(testOutputDir, "chunks.json");
    const { chunks } = JSON.parse(readFileSync(chunksPath, "utf-8"));

    for (const chunk of chunks) {
      expect(chunk.token_count).toBeLessThanOrEqual(600);
    }
  });

  test.skipIf(!phase1Exists)("chunks are properly linked", async () => {
    const chunksPath = resolve(testOutputDir, "chunks.json");
    const { chunks } = JSON.parse(readFileSync(chunksPath, "utf-8"));

    // First chunk has no previous
    expect(chunks[0].previous_chunk_id).toBeNull();

    // Last chunk has no next
    expect(chunks[chunks.length - 1].next_chunk_id).toBeNull();

    // Middle chunks are linked correctly
    for (let i = 1; i < chunks.length - 1; i++) {
      expect(chunks[i].previous_chunk_id).toBe(chunks[i - 1].chunk_id);
      expect(chunks[i].next_chunk_id).toBe(chunks[i + 1].chunk_id);
    }
  });

  test.skipIf(!phase1Exists)("figure captions are marked correctly", async () => {
    const chunksPath = resolve(testOutputDir, "chunks.json");
    const { chunks } = JSON.parse(readFileSync(chunksPath, "utf-8"));

    const captionChunks = chunks.filter((c: any) => c.is_figure_caption);

    // Should have figure caption chunks
    expect(captionChunks.length).toBeGreaterThan(0);

    // Caption chunks should have figure references
    for (const caption of captionChunks) {
      // Most captions should have figure refs (some might not if image wasn't mapped)
      expect(caption.figure_references).toBeDefined();
    }
  });

  test.skipIf(!phase1Exists)("index maps are consistent", async () => {
    const chunksPath = resolve(testOutputDir, "chunks.json");
    const indexPath = resolve(testOutputDir, "chunk_index.json");

    const { chunks } = JSON.parse(readFileSync(chunksPath, "utf-8"));
    const index = JSON.parse(readFileSync(indexPath, "utf-8"));

    // Verify total_chunks matches
    expect(index.total_chunks).toBe(chunks.length);

    // Verify all indexed chunk IDs exist in chunks
    const chunkIds = new Set(chunks.map((c: any) => c.chunk_id));

    for (const ids of Object.values(index.chunks_by_section)) {
      for (const id of ids as string[]) {
        expect(chunkIds.has(id)).toBe(true);
      }
    }

    for (const ids of Object.values(index.chunks_by_page)) {
      for (const id of ids as string[]) {
        expect(chunkIds.has(id)).toBe(true);
      }
    }
  });
});
