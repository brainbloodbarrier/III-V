import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  loadDocument,
  processBlocks,
  buildChunkIndex,
  relinkChunks,
  countSourceBlocks,
  countFigureCaptions,
} from "../../../src/services/chunker/index";
import type { Chunk, FigureRef, ChunkBuilder } from "../../../src/models/chunk";
import type { RhotonDocument, RhotonPage, ContentBlock } from "../../../src/models/document";
import type { FigureMapEntry } from "../../../src/services/chunker/figure-linker";
import { generateChunkId } from "../../../src/services/chunker/splitter";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a minimal valid RhotonDocument for testing.
 */
function createMockDocument(overrides: Partial<RhotonDocument> = {}): RhotonDocument {
  return {
    id: "test-doc",
    title: "Test Document",
    author: "Test Author",
    source_files: {
      json: "/path/to/source.json",
      markdown: "/path/to/source.md",
      image_dir: "/path/to/images",
    },
    pages: [],
    figure_map: {},
    metadata: {
      processed_at: new Date().toISOString(),
      pipeline_version: "1.0.0",
      source_json_lines: 100,
      source_markdown_lines: 200,
      total_images: 10,
      parse_rate: 95,
      ligature_count: 0,
      figure_coverage: 80,
    },
    ...overrides,
  };
}

/**
 * Creates a mock content block.
 * Note: page_number is added to blocks by the JSON parser but not in the ContentBlock interface.
 */
function createMockBlock(overrides: Partial<ContentBlock & { page_number: number }> = {}): ContentBlock & { page_number: number } {
  return {
    id: "/page/1/Text/1",
    block_type: "text",
    level: 0,
    content: "Test content for block.",
    raw_html: "<p>Test content for block.</p>",
    parent_hierarchy: [],
    figure_references: [],
    bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
    section_id: "section-1",
    page_number: 0,
    ...overrides,
  };
}

/**
 * Creates a mock page with blocks.
 * Automatically sets page_number on each block to match the page.
 */
function createMockPage(pageNumber: number, blocks: Array<ContentBlock & { page_number?: number }>): RhotonPage {
  // Set page_number on blocks (as the JSON parser does)
  const blocksWithPageNumber = blocks.map((block) => ({
    ...block,
    page_number: pageNumber,
  }));
  return {
    page_number: pageNumber,
    blocks: blocksWithPageNumber,
  };
}

/**
 * Creates a mock chunk for testing index building.
 */
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

/**
 * Creates a mock header index for breadcrumb resolution.
 */
function createMockHeaderIndex(): Map<string, string> {
  const index = new Map<string, string>();
  index.set("/page/1/SectionHeader/1", "THE CEREBRAL VEINS");
  index.set("/page/1/SectionHeader/2", "SUPERFICIAL VEINS");
  return index;
}

/**
 * Creates a mock figure map for testing.
 */
function createMockFigureMap(): Map<string, FigureMapEntry> {
  const map = new Map<string, FigureMapEntry>();
  map.set("/page/5/FigureCaption/1", {
    figure_id: "Fig. 4.1",
    page_number: 5,
    caption: "The superficial cerebral veins.",
    caption_block_id: "/page/5/FigureCaption/1",
    abbreviations: {},
    status: "mapped",
    image_file: "image-012.jpg",
    image_path: "./images/image-012.jpg",
  });
  map.set("/page/7/FigureCaption/1", {
    figure_id: "Fig. 4.2",
    page_number: 7,
    caption: "Deep venous system overview.",
    caption_block_id: "/page/7/FigureCaption/1",
    abbreviations: {},
    status: "mapped",
    image_file: "image-015.jpg",
    image_path: "./images/image-015.jpg",
  });
  return map;
}

// =============================================================================
// Tests
// =============================================================================

describe("chunker/index orchestrator", () => {
  const testDir = join(__dirname, "test-fixtures-index");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  // ===========================================================================
  // loadDocument tests
  // ===========================================================================

  describe("loadDocument", () => {
    test("loads valid JSON file", () => {
      const testFilePath = join(testDir, "document.json");
      const mockDoc = createMockDocument({ id: "loaded-doc" });
      writeFileSync(testFilePath, JSON.stringify(mockDoc));

      const result = loadDocument(testFilePath);

      expect(result.id).toBe("loaded-doc");
      expect(result.title).toBe("Test Document");
    });

    test("throws error for missing file", () => {
      const nonExistentPath = join(testDir, "nonexistent.json");

      expect(() => loadDocument(nonExistentPath)).toThrow(
        `Document file not found: ${nonExistentPath}`
      );
    });

    test("throws error for invalid JSON", () => {
      const testFilePath = join(testDir, "invalid.json");
      writeFileSync(testFilePath, "{ invalid json }");

      expect(() => loadDocument(testFilePath)).toThrow();
    });

    test("loads document with multiple pages", () => {
      const testFilePath = join(testDir, "multi-page.json");
      const mockDoc = createMockDocument({
        pages: [
          createMockPage(0, [createMockBlock()]),
          createMockPage(1, [createMockBlock({ id: "/page/2/Text/1" })]),
        ],
      });
      writeFileSync(testFilePath, JSON.stringify(mockDoc));

      const result = loadDocument(testFilePath);

      expect(result.pages).toHaveLength(2);
    });

    test("loads document with empty pages array", () => {
      const testFilePath = join(testDir, "empty-pages.json");
      const mockDoc = createMockDocument({ pages: [] });
      writeFileSync(testFilePath, JSON.stringify(mockDoc));

      const result = loadDocument(testFilePath);

      expect(result.pages).toHaveLength(0);
    });
  });

  // ===========================================================================
  // processBlocks tests
  // ===========================================================================

  describe("processBlocks", () => {
    test("skips section_header blocks", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/SectionHeader/1",
              block_type: "section_header",
              content: "CHAPTER TITLE",
            }),
            createMockBlock({
              id: "/page/1/Text/1",
              block_type: "text",
              content: "Regular text content.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      // Should only have one chunk (the text block)
      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.content).toBe("Regular text content.");
    });

    test("skips blocks with empty content", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/PageHeader/1",
              block_type: "page_header",
              content: "",
            }),
            createMockBlock({
              id: "/page/1/Text/1",
              block_type: "text",
              content: "Has content.",
            }),
            createMockBlock({
              id: "/page/1/Text/2",
              block_type: "text",
              content: "   ", // Only whitespace
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      // Should only have one chunk (the text block with content)
      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.content).toBe("Has content.");
    });

    test("correctly links figure captions", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(4, [
            createMockBlock({
              id: "/page/5/FigureCaption/1",
              block_type: "figure_caption",
              content: "Fig. 4.1. The superficial cerebral veins.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.is_figure_caption).toBe(true);
      expect(chunks[0]?.figure_references).toHaveLength(1);
      expect(chunks[0]?.figure_references[0]?.figure_id).toBe("Fig. 4.1");
    });

    test("finds figure references in text content", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              block_type: "text",
              content: "As shown in Fig. 4.1, the veins are connected.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.is_figure_caption).toBe(false);
      expect(chunks[0]?.figure_references).toHaveLength(1);
      expect(chunks[0]?.figure_references[0]?.figure_id).toBe("Fig. 4.1");
    });

    test("sets correct sequence numbers", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              content: "First block.",
            }),
            createMockBlock({
              id: "/page/1/Text/2",
              content: "Second block.",
            }),
            createMockBlock({
              id: "/page/1/Text/3",
              content: "Third block.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]?.sequence_number).toBe(0);
      expect(chunks[1]?.sequence_number).toBe(1);
      expect(chunks[2]?.sequence_number).toBe(2);
    });

    test("sets previous_chunk_id correctly", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              content: "First block.",
            }),
            createMockBlock({
              id: "/page/1/Text/2",
              content: "Second block.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks[0]?.previous_chunk_id).toBeNull();
      expect(chunks[1]?.previous_chunk_id).toBe(chunks[0]?.chunk_id);
    });

    test("sets next_chunk_id correctly", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              content: "First block.",
            }),
            createMockBlock({
              id: "/page/1/Text/2",
              content: "Second block.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks[0]?.next_chunk_id).toBe(chunks[1]?.chunk_id);
      expect(chunks[1]?.next_chunk_id).toBeNull();
    });

    test("handles document with no valid blocks", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/SectionHeader/1",
              block_type: "section_header",
              content: "Only Headers",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks).toHaveLength(0);
    });

    test("processes blocks across multiple pages", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              content: "Page 1 content.",
            }),
          ]),
          createMockPage(1, [
            createMockBlock({
              id: "/page/2/Text/1",
              content: "Page 2 content.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.content).toBe("Page 1 content.");
      expect(chunks[1]?.content).toBe("Page 2 content.");
    });
  });

  // ===========================================================================
  // buildChunkIndex tests
  // ===========================================================================

  describe("buildChunkIndex", () => {
    test("creates chunks_by_section index correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          parent_section_id: "section-1",
        }),
        createMockChunk({
          chunk_id: "doc-chunk-0001",
          parent_section_id: "section-1",
        }),
        createMockChunk({
          chunk_id: "doc-chunk-0002",
          parent_section_id: "section-2",
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.chunks_by_section["section-1"]).toEqual([
        "doc-chunk-0000",
        "doc-chunk-0001",
      ]);
      expect(index.chunks_by_section["section-2"]).toEqual(["doc-chunk-0002"]);
    });

    test("creates chunks_by_page index correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          page_numbers: [1],
        }),
        createMockChunk({
          chunk_id: "doc-chunk-0001",
          page_numbers: [1, 2],
        }),
        createMockChunk({
          chunk_id: "doc-chunk-0002",
          page_numbers: [2],
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.chunks_by_page["1"]).toContain("doc-chunk-0000");
      expect(index.chunks_by_page["1"]).toContain("doc-chunk-0001");
      expect(index.chunks_by_page["2"]).toContain("doc-chunk-0001");
      expect(index.chunks_by_page["2"]).toContain("doc-chunk-0002");
    });

    test("creates figure_to_chunks index correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          figure_references: [
            { figure_id: "Fig. 4.1", image_path: "", caption_snippet: "" },
          ],
        }),
        createMockChunk({
          chunk_id: "doc-chunk-0001",
          figure_references: [
            { figure_id: "Fig. 4.1", image_path: "", caption_snippet: "" },
            { figure_id: "Fig. 4.2", image_path: "", caption_snippet: "" },
          ],
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.figure_to_chunks["Fig. 4.1"]).toEqual([
        "doc-chunk-0000",
        "doc-chunk-0001",
      ]);
      expect(index.figure_to_chunks["Fig. 4.2"]).toEqual(["doc-chunk-0001"]);
    });

    test("handles chunks spanning multiple pages", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          page_numbers: [1, 2, 3],
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.chunks_by_page["1"]).toContain("doc-chunk-0000");
      expect(index.chunks_by_page["2"]).toContain("doc-chunk-0000");
      expect(index.chunks_by_page["3"]).toContain("doc-chunk-0000");
    });

    test("handles chunks with multiple figure references", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          figure_references: [
            { figure_id: "Fig. 1.1", image_path: "", caption_snippet: "" },
            { figure_id: "Fig. 1.2", image_path: "", caption_snippet: "" },
            { figure_id: "Fig. 1.3", image_path: "", caption_snippet: "" },
          ],
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.figure_to_chunks["Fig. 1.1"]).toEqual(["doc-chunk-0000"]);
      expect(index.figure_to_chunks["Fig. 1.2"]).toEqual(["doc-chunk-0000"]);
      expect(index.figure_to_chunks["Fig. 1.3"]).toEqual(["doc-chunk-0000"]);
    });

    test("sets total_chunks correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk({ chunk_id: "doc-chunk-0000" }),
        createMockChunk({ chunk_id: "doc-chunk-0001" }),
        createMockChunk({ chunk_id: "doc-chunk-0002" }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.total_chunks).toBe(3);
    });

    test("sets document_id correctly", () => {
      const chunks: Chunk[] = [createMockChunk()];

      const index = buildChunkIndex(chunks, "my-document");

      expect(index.document_id).toBe("my-document");
    });

    test("handles empty chunks array", () => {
      const chunks: Chunk[] = [];

      const index = buildChunkIndex(chunks, "doc");

      expect(index.total_chunks).toBe(0);
      expect(Object.keys(index.chunks_by_section)).toHaveLength(0);
      expect(Object.keys(index.chunks_by_page)).toHaveLength(0);
      expect(Object.keys(index.figure_to_chunks)).toHaveLength(0);
    });

    test("handles chunks with no figure references", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          figure_references: [],
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      expect(Object.keys(index.figure_to_chunks)).toHaveLength(0);
    });

    test("handles chunks with null parent_section_id", () => {
      const chunks: Chunk[] = [
        createMockChunk({
          chunk_id: "doc-chunk-0000",
          parent_section_id: null as any, // Simulating potential edge case
        }),
      ];

      const index = buildChunkIndex(chunks, "doc");

      // Should use "unknown" as fallback
      expect(index.chunks_by_section["unknown"]).toEqual(["doc-chunk-0000"]);
    });
  });

  // ===========================================================================
  // relinkChunks tests
  // ===========================================================================

  describe("relinkChunks", () => {
    test("reassigns chunk_ids sequentially", () => {
      const chunks: Chunk[] = [
        createMockChunk({ chunk_id: "old-id-1" }),
        createMockChunk({ chunk_id: "old-id-2" }),
        createMockChunk({ chunk_id: "old-id-3" }),
      ];

      relinkChunks(chunks, "doc");

      expect(chunks[0]?.chunk_id).toBe("doc-chunk-0000");
      expect(chunks[1]?.chunk_id).toBe("doc-chunk-0001");
      expect(chunks[2]?.chunk_id).toBe("doc-chunk-0002");
    });

    test("updates sequence_number correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk({ sequence_number: 99 }),
        createMockChunk({ sequence_number: 100 }),
        createMockChunk({ sequence_number: 101 }),
      ];

      relinkChunks(chunks, "doc");

      expect(chunks[0]?.sequence_number).toBe(0);
      expect(chunks[1]?.sequence_number).toBe(1);
      expect(chunks[2]?.sequence_number).toBe(2);
    });

    test("sets previous_chunk_id correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk(),
        createMockChunk(),
        createMockChunk(),
      ];

      relinkChunks(chunks, "doc");

      expect(chunks[0]?.previous_chunk_id).toBeNull();
      expect(chunks[1]?.previous_chunk_id).toBe("doc-chunk-0000");
      expect(chunks[2]?.previous_chunk_id).toBe("doc-chunk-0001");
    });

    test("sets next_chunk_id correctly", () => {
      const chunks: Chunk[] = [
        createMockChunk(),
        createMockChunk(),
        createMockChunk(),
      ];

      relinkChunks(chunks, "doc");

      expect(chunks[0]?.next_chunk_id).toBe("doc-chunk-0001");
      expect(chunks[1]?.next_chunk_id).toBe("doc-chunk-0002");
      expect(chunks[2]?.next_chunk_id).toBeNull();
    });

    test("first chunk has null previous_chunk_id", () => {
      const chunks: Chunk[] = [
        createMockChunk({ previous_chunk_id: "should-be-removed" }),
      ];

      relinkChunks(chunks, "doc");

      expect(chunks[0]?.previous_chunk_id).toBeNull();
    });

    test("last chunk has null next_chunk_id", () => {
      const chunks: Chunk[] = [
        createMockChunk({ next_chunk_id: "should-be-removed" }),
      ];

      relinkChunks(chunks, "doc");

      expect(chunks[0]?.next_chunk_id).toBeNull();
    });

    test("handles single chunk array", () => {
      const chunks: Chunk[] = [createMockChunk()];

      relinkChunks(chunks, "single-doc");

      expect(chunks[0]?.chunk_id).toBe("single-doc-chunk-0000");
      expect(chunks[0]?.sequence_number).toBe(0);
      expect(chunks[0]?.previous_chunk_id).toBeNull();
      expect(chunks[0]?.next_chunk_id).toBeNull();
    });

    test("handles empty chunks array", () => {
      const chunks: Chunk[] = [];

      // Should not throw
      expect(() => relinkChunks(chunks, "doc")).not.toThrow();
    });

    test("uses correct document ID in chunk IDs", () => {
      const chunks: Chunk[] = [
        createMockChunk(),
        createMockChunk(),
      ];

      relinkChunks(chunks, "my-special-document");

      expect(chunks[0]?.chunk_id).toBe("my-special-document-chunk-0000");
      expect(chunks[1]?.chunk_id).toBe("my-special-document-chunk-0001");
    });
  });

  // ===========================================================================
  // countSourceBlocks tests
  // ===========================================================================

  describe("countSourceBlocks", () => {
    test("excludes section_header blocks", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "section_header",
              content: "Header",
            }),
            createMockBlock({
              block_type: "text",
              content: "Text content.",
            }),
          ]),
        ],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(1);
    });

    test("excludes blocks with empty content", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "text",
              content: "",
            }),
            createMockBlock({
              block_type: "text",
              content: "Has content.",
            }),
          ]),
        ],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(1);
    });

    test("excludes blocks with only whitespace content", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "text",
              content: "   \n\t  ",
            }),
            createMockBlock({
              block_type: "text",
              content: "Real content.",
            }),
          ]),
        ],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(1);
    });

    test("counts remaining blocks correctly", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({ block_type: "text", content: "Block 1" }),
            createMockBlock({ block_type: "text", content: "Block 2" }),
            createMockBlock({ block_type: "figure_caption", content: "Fig caption" }),
          ]),
          createMockPage(1, [
            createMockBlock({ block_type: "text", content: "Block 3" }),
          ]),
        ],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(4);
    });

    test("returns zero for document with only headers", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "section_header",
              content: "Header 1",
            }),
            createMockBlock({
              block_type: "section_header",
              content: "Header 2",
            }),
          ]),
        ],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(0);
    });

    test("returns zero for document with empty pages", () => {
      const document = createMockDocument({
        pages: [],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(0);
    });

    test("counts figure_caption blocks", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "figure_caption",
              content: "Figure 1: Description",
            }),
          ]),
        ],
      });

      const count = countSourceBlocks(document);

      expect(count).toBe(1);
    });
  });

  // ===========================================================================
  // countFigureCaptions tests
  // ===========================================================================

  describe("countFigureCaptions", () => {
    test("counts only figure_caption block types", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "figure_caption",
              content: "Fig 1",
            }),
            createMockBlock({
              block_type: "text",
              content: "Text mentioning Fig 1",
            }),
            createMockBlock({
              block_type: "figure_caption",
              content: "Fig 2",
            }),
          ]),
        ],
      });

      const count = countFigureCaptions(document);

      expect(count).toBe(2);
    });

    test("returns zero when no figure captions exist", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "text",
              content: "Just text.",
            }),
            createMockBlock({
              block_type: "section_header",
              content: "Header",
            }),
          ]),
        ],
      });

      const count = countFigureCaptions(document);

      expect(count).toBe(0);
    });

    test("counts figure captions across multiple pages", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "figure_caption",
              content: "Fig 1",
            }),
          ]),
          createMockPage(1, [
            createMockBlock({
              block_type: "figure_caption",
              content: "Fig 2",
            }),
            createMockBlock({
              block_type: "figure_caption",
              content: "Fig 3",
            }),
          ]),
        ],
      });

      const count = countFigureCaptions(document);

      expect(count).toBe(3);
    });

    test("handles empty document", () => {
      const document = createMockDocument({
        pages: [],
      });

      const count = countFigureCaptions(document);

      expect(count).toBe(0);
    });

    test("counts figure captions even with empty content", () => {
      // Note: This tests the actual behavior - figure captions with empty
      // content are still counted by countFigureCaptions
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              block_type: "figure_caption",
              content: "", // Empty but still a figure_caption block type
            }),
          ]),
        ],
      });

      const count = countFigureCaptions(document);

      expect(count).toBe(1);
    });
  });

  // ===========================================================================
  // Integration-style tests for processBlocks + buildChunkIndex
  // ===========================================================================

  describe("processBlocks + buildChunkIndex integration", () => {
    test("index references all chunks from processBlocks", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              content: "First chunk content.",
              section_id: "section-1",
            }),
            createMockBlock({
              id: "/page/1/Text/2",
              content: "Second chunk content.",
              section_id: "section-1",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);
      relinkChunks(chunks, document.id);
      const index = buildChunkIndex(chunks, document.id);

      // Verify all chunk IDs are in the index
      const allIndexedIds = new Set<string>();
      for (const ids of Object.values(index.chunks_by_section)) {
        for (const id of ids) {
          allIndexedIds.add(id);
        }
      }

      for (const chunk of chunks) {
        expect(allIndexedIds.has(chunk.chunk_id)).toBe(true);
      }
    });

    test("page index correctly maps chunks to their page numbers", () => {
      const document = createMockDocument({
        pages: [
          createMockPage(0, [
            createMockBlock({
              id: "/page/1/Text/1",
              content: "Page 1 content.",
            }),
          ]),
          createMockPage(1, [
            createMockBlock({
              id: "/page/2/Text/1",
              content: "Page 2 content.",
            }),
          ]),
        ],
      });
      const headerIndex = createMockHeaderIndex();
      const figureMap = createMockFigureMap();

      const chunks = processBlocks(document, headerIndex, figureMap);
      relinkChunks(chunks, document.id);
      const index = buildChunkIndex(chunks, document.id);

      // Page numbers in chunks are 1-indexed (page_number 0 -> chunk page 1, page_number 1 -> chunk page 2)
      expect(index.chunks_by_page["1"]?.length).toBeGreaterThan(0);
      expect(index.chunks_by_page["2"]?.length).toBeGreaterThan(0);

      // Verify the chunks are assigned to the correct pages
      expect(chunks[0]?.page_numbers).toContain(1);
      expect(chunks[1]?.page_numbers).toContain(2);
    });
  });
});
