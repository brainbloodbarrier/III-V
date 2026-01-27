import { describe, test, expect, beforeAll } from "bun:test";
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { runChunker, loadDocument, type ChunkerConfig } from "../../src/services/chunker";
import { loadFigureMap } from "../../src/services/chunker/figure-linker";
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

// ============================================================================
// Chunker Error Handling Tests
// ============================================================================

describe("Chunker Error Handling", () => {
  const projectRoot = resolve(import.meta.dir, "../..");
  const errorTestDir = resolve(projectRoot, "processed/02_chunks_error_test");

  beforeAll(() => {
    // Clean up and create test directory
    if (existsSync(errorTestDir)) {
      rmSync(errorTestDir, { recursive: true });
    }
    mkdirSync(errorTestDir, { recursive: true });
  });

  test("throws descriptive error for missing document.json input", async () => {
    const config: ChunkerConfig = {
      inputPath: "/nonexistent/path/document.json",
      figureMapPath: resolve(projectRoot, "processed/01_normalized/figure_map.json"),
      outputDir: errorTestDir,
    };

    await expect(runChunker(config)).rejects.toThrow(/Document file not found/);
  });

  test("throws descriptive error for missing figure_map.json input", async () => {
    // Create a minimal valid document.json
    const minimalDoc = {
      id: "test-doc",
      title: "Test",
      author: "Test Author",
      source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
      pages: [{ page_number: 1, blocks: [] }],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 0,
        source_markdown_lines: 0,
        total_images: 0,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 0,
      },
    };
    const tempDocPath = resolve(errorTestDir, "temp_document.json");
    writeFileSync(tempDocPath, JSON.stringify(minimalDoc));

    const config: ChunkerConfig = {
      inputPath: tempDocPath,
      figureMapPath: "/nonexistent/figure_map.json",
      outputDir: errorTestDir,
    };

    await expect(runChunker(config)).rejects.toThrow(/Figure map file not found/);
  });

  test("loadDocument throws for non-existent file", () => {
    expect(() => loadDocument("/nonexistent/document.json")).toThrow(
      /Document file not found/
    );
  });

  test("loadFigureMap throws for non-existent file", () => {
    expect(() => loadFigureMap("/nonexistent/figure_map.json")).toThrow(
      /Figure map file not found/
    );
  });

  test("handles document with no pages gracefully", async () => {
    // Create document with empty pages array
    const emptyPagesDoc = {
      id: "test-empty-pages",
      title: "Test",
      author: "Test Author",
      source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
      pages: [],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 0,
        source_markdown_lines: 0,
        total_images: 0,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 0,
      },
    };

    const emptyDocPath = resolve(errorTestDir, "empty_pages_document.json");
    const emptyFigureMapPath = resolve(errorTestDir, "empty_figure_map.json");

    writeFileSync(emptyDocPath, JSON.stringify(emptyPagesDoc));
    writeFileSync(emptyFigureMapPath, JSON.stringify({}));

    const config: ChunkerConfig = {
      inputPath: emptyDocPath,
      figureMapPath: emptyFigureMapPath,
      outputDir: resolve(errorTestDir, "empty_pages_output"),
    };

    // Should handle gracefully - produces 0 chunks
    const result = await runChunker(config);
    expect(result.totalChunks).toBe(0);
    expect(result.chunks).toHaveLength(0);
  });

  test("handles document with no valid blocks (only section headers)", async () => {
    // Create document where all blocks are section headers (which are skipped)
    const onlyHeadersDoc = {
      id: "test-headers-only",
      title: "Test",
      author: "Test Author",
      source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
      pages: [
        {
          page_number: 1,
          blocks: [
            {
              id: "/page/0/SectionHeader/0",
              block_type: "section_header",
              level: 1,
              content: "Section Title",
              raw_html: "<h1>Section Title</h1>",
              parent_hierarchy: [],
              figure_references: [],
              bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
              section_id: "",
            },
          ],
        },
      ],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 1,
        source_markdown_lines: 0,
        total_images: 0,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 0,
      },
    };

    const headersOnlyDocPath = resolve(errorTestDir, "headers_only_document.json");
    const headersOnlyFigureMapPath = resolve(errorTestDir, "headers_only_figure_map.json");
    const headersOnlyOutputDir = resolve(errorTestDir, "headers_only_output");

    writeFileSync(headersOnlyDocPath, JSON.stringify(onlyHeadersDoc));
    writeFileSync(headersOnlyFigureMapPath, JSON.stringify({}));
    mkdirSync(headersOnlyOutputDir, { recursive: true });

    const config: ChunkerConfig = {
      inputPath: headersOnlyDocPath,
      figureMapPath: headersOnlyFigureMapPath,
      outputDir: headersOnlyOutputDir,
    };

    // Should handle gracefully - produces 0 chunks
    const result = await runChunker(config);
    expect(result.totalChunks).toBe(0);
    expect(result.chunks).toHaveLength(0);
  });

  test("handles document with empty content blocks", async () => {
    // Create document with blocks that have empty content
    const emptyContentDoc = {
      id: "test-empty-content",
      title: "Test",
      author: "Test Author",
      source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
      pages: [
        {
          page_number: 1,
          blocks: [
            {
              id: "/page/0/Text/0",
              block_type: "text",
              level: 0,
              content: "",
              raw_html: "",
              parent_hierarchy: [],
              figure_references: [],
              bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
              section_id: "",
            },
            {
              id: "/page/0/Text/1",
              block_type: "text",
              level: 0,
              content: "   ",
              raw_html: "   ",
              parent_hierarchy: [],
              figure_references: [],
              bbox: { x1: 0, y1: 20, x2: 100, y2: 40 },
              section_id: "",
            },
          ],
        },
      ],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 2,
        source_markdown_lines: 0,
        total_images: 0,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 0,
      },
    };

    const emptyContentDocPath = resolve(errorTestDir, "empty_content_document.json");
    const emptyContentFigureMapPath = resolve(errorTestDir, "empty_content_figure_map.json");
    const emptyContentOutputDir = resolve(errorTestDir, "empty_content_output");

    writeFileSync(emptyContentDocPath, JSON.stringify(emptyContentDoc));
    writeFileSync(emptyContentFigureMapPath, JSON.stringify({}));
    mkdirSync(emptyContentOutputDir, { recursive: true });

    const config: ChunkerConfig = {
      inputPath: emptyContentDocPath,
      figureMapPath: emptyContentFigureMapPath,
      outputDir: emptyContentOutputDir,
    };

    // Should handle gracefully - empty blocks are skipped
    const result = await runChunker(config);
    expect(result.totalChunks).toBe(0);
    expect(result.chunks).toHaveLength(0);
  });

  test("handles malformed JSON in document file", async () => {
    const malformedDocPath = resolve(errorTestDir, "malformed_document.json");
    writeFileSync(malformedDocPath, "{ this is not valid json }");

    const config: ChunkerConfig = {
      inputPath: malformedDocPath,
      figureMapPath: resolve(errorTestDir, "dummy_figure_map.json"),
      outputDir: errorTestDir,
    };

    await expect(runChunker(config)).rejects.toThrow();
  });

  test("handles malformed JSON in figure map file", async () => {
    // Create valid document
    const validDoc = {
      id: "test-doc",
      title: "Test",
      author: "Test Author",
      source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
      pages: [{ page_number: 1, blocks: [] }],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 0,
        source_markdown_lines: 0,
        total_images: 0,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 0,
      },
    };
    const validDocPath = resolve(errorTestDir, "valid_for_malformed_figmap.json");
    writeFileSync(validDocPath, JSON.stringify(validDoc));

    const malformedFigMapPath = resolve(errorTestDir, "malformed_figure_map.json");
    writeFileSync(malformedFigMapPath, "{ this is not valid json }");

    const config: ChunkerConfig = {
      inputPath: validDocPath,
      figureMapPath: malformedFigMapPath,
      outputDir: errorTestDir,
    };

    await expect(runChunker(config)).rejects.toThrow();
  });

  test("creates output directory if it does not exist", async () => {
    // Create valid minimal inputs
    const validDoc = {
      id: "test-mkdir",
      title: "Test",
      author: "Test Author",
      source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
      pages: [{ page_number: 1, blocks: [] }],
      figure_map: {},
      metadata: {
        processed_at: new Date().toISOString(),
        pipeline_version: "1.0.0",
        source_json_lines: 0,
        source_markdown_lines: 0,
        total_images: 0,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 0,
      },
    };

    const docPath = resolve(errorTestDir, "mkdir_test_document.json");
    const figMapPath = resolve(errorTestDir, "mkdir_test_figure_map.json");
    const newOutputDir = resolve(errorTestDir, "new_output_directory");

    // Ensure output directory does not exist
    if (existsSync(newOutputDir)) {
      rmSync(newOutputDir, { recursive: true });
    }

    writeFileSync(docPath, JSON.stringify(validDoc));
    writeFileSync(figMapPath, JSON.stringify({}));

    const config: ChunkerConfig = {
      inputPath: docPath,
      figureMapPath: figMapPath,
      outputDir: newOutputDir,
    };

    // Should create the directory automatically
    await runChunker(config);
    expect(existsSync(newOutputDir)).toBe(true);
  });
});

// ============================================================================
// Parallel Invocation Race Condition Protection Tests (Issue #214)
// ============================================================================

describe("Parallel Invocation Protection", () => {
  const projectRoot = resolve(import.meta.dir, "../..");
  const raceTestDir = resolve(projectRoot, "processed/02_chunks_race_test");

  // Create valid minimal test data
  const createMinimalDoc = (id: string) => ({
    id,
    title: "Test",
    author: "Test Author",
    source_files: { json: "a.json", markdown: "a.md", image_dir: "images/" },
    pages: [{ page_number: 1, blocks: [] }],
    figure_map: {},
    metadata: {
      processed_at: new Date().toISOString(),
      pipeline_version: "1.0.0",
      source_json_lines: 0,
      source_markdown_lines: 0,
      total_images: 0,
      parse_rate: 100,
      ligature_count: 0,
      figure_coverage: 0,
    },
  });

  test("throws error when output files already exist (race condition protection)", async () => {
    const outputDir = resolve(raceTestDir, "existing_output");
    const docPath = resolve(raceTestDir, "race_doc.json");
    const figMapPath = resolve(raceTestDir, "race_figmap.json");

    // Clean up and create test directory
    if (existsSync(raceTestDir)) {
      rmSync(raceTestDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });

    // Write input files
    writeFileSync(docPath, JSON.stringify(createMinimalDoc("race-test")));
    writeFileSync(figMapPath, JSON.stringify({}));

    // Create a pre-existing output file to simulate incomplete/parallel run
    writeFileSync(resolve(outputDir, "chunks.json"), "{}");

    const config: ChunkerConfig = {
      inputPath: docPath,
      figureMapPath: figMapPath,
      outputDir: outputDir,
    };

    // Should throw with descriptive error
    await expect(runChunker(config)).rejects.toThrow(/Output files already exist/);
    await expect(runChunker(config)).rejects.toThrow(/--force/);
  });

  test("allows overwrite when force: true is specified", async () => {
    const outputDir = resolve(raceTestDir, "force_overwrite");
    const docPath = resolve(raceTestDir, "force_doc.json");
    const figMapPath = resolve(raceTestDir, "force_figmap.json");

    // Clean up and create test directory
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });

    // Write input files
    writeFileSync(docPath, JSON.stringify(createMinimalDoc("force-test")));
    writeFileSync(figMapPath, JSON.stringify({}));

    // Create pre-existing output files
    writeFileSync(resolve(outputDir, "chunks.json"), "{}");
    writeFileSync(resolve(outputDir, "chunk_index.json"), "{}");

    const config: ChunkerConfig = {
      inputPath: docPath,
      figureMapPath: figMapPath,
      outputDir: outputDir,
      force: true, // Explicit force flag
    };

    // Should succeed and overwrite
    const result = await runChunker(config);
    expect(result.totalChunks).toBe(0);
  });

  test("succeeds when output directory is empty", async () => {
    const outputDir = resolve(raceTestDir, "empty_output");
    const docPath = resolve(raceTestDir, "empty_doc.json");
    const figMapPath = resolve(raceTestDir, "empty_figmap.json");

    // Clean up and create empty test directory
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });

    // Write input files
    writeFileSync(docPath, JSON.stringify(createMinimalDoc("empty-test")));
    writeFileSync(figMapPath, JSON.stringify({}));

    const config: ChunkerConfig = {
      inputPath: docPath,
      figureMapPath: figMapPath,
      outputDir: outputDir,
    };

    // Should succeed - no existing output files
    const result = await runChunker(config);
    expect(result.totalChunks).toBe(0);
  });

  test("error message lists all existing output files", async () => {
    const outputDir = resolve(raceTestDir, "multiple_existing");
    const docPath = resolve(raceTestDir, "multi_doc.json");
    const figMapPath = resolve(raceTestDir, "multi_figmap.json");

    // Clean up and create test directory
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });

    // Write input files
    writeFileSync(docPath, JSON.stringify(createMinimalDoc("multi-test")));
    writeFileSync(figMapPath, JSON.stringify({}));

    // Create multiple pre-existing output files
    writeFileSync(resolve(outputDir, "chunks.json"), "{}");
    writeFileSync(resolve(outputDir, "chunk_index.json"), "{}");
    writeFileSync(resolve(outputDir, "preview.html"), "");

    const config: ChunkerConfig = {
      inputPath: docPath,
      figureMapPath: figMapPath,
      outputDir: outputDir,
    };

    // Error should list all existing files
    try {
      await runChunker(config);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("chunks.json");
      expect(message).toContain("chunk_index.json");
      expect(message).toContain("preview.html");
    }
  });
});
