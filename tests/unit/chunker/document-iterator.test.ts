import { describe, test, expect } from "bun:test";
import { iterateBlocks, iterateBlocksWithPage, type BlockWithPage } from "../../../src/services/chunker/document-iterator";
import type { RhotonDocument } from "../../../src/models/document";

describe("document-iterator", () => {
  function createMockDocument(): RhotonDocument {
    return {
      id: "test-doc",
      title: "Test Document",
      author: "Test Author",
      source_files: { json: "test.json", markdown: "test.md", image_dir: "images" },
      pages: [
        {
          page_number: 0,
          blocks: [
            {
              id: "/page/0/SectionHeader/1",
              block_type: "section_header",
              level: 1,
              content: "Chapter 1",
              raw_html: "<h1>Chapter 1</h1>",
              parent_hierarchy: [],
              figure_references: [],
              bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
              section_id: "sec-1",
            },
            {
              id: "/page/0/Text/2",
              block_type: "text",
              level: 0,
              content: "First paragraph.",
              raw_html: "<p>First paragraph.</p>",
              parent_hierarchy: ["/page/0/SectionHeader/1"],
              figure_references: [],
              bbox: { x1: 0, y1: 20, x2: 100, y2: 40 },
              section_id: "sec-1",
            },
          ],
        },
        {
          page_number: 1,
          blocks: [
            {
              id: "/page/1/Text/1",
              block_type: "text",
              level: 0,
              content: "Second page text.",
              raw_html: "<p>Second page text.</p>",
              parent_hierarchy: ["/page/0/SectionHeader/1"],
              figure_references: [],
              bbox: { x1: 0, y1: 0, x2: 100, y2: 20 },
              section_id: "sec-1",
            },
            {
              id: "/page/1/FigureCaption/2",
              block_type: "figure_caption",
              level: 0,
              content: "Fig. 1.1 Example figure.",
              raw_html: "<p>Fig. 1.1 Example figure.</p>",
              parent_hierarchy: ["/page/0/SectionHeader/1"],
              figure_references: ["Fig. 1.1"],
              bbox: { x1: 0, y1: 20, x2: 100, y2: 40 },
              section_id: "sec-1",
            },
          ],
        },
      ],
      figure_map: {},
      metadata: {
        processed_at: "2024-01-01T00:00:00.000Z",
        pipeline_version: "1.0.0",
        source_json_lines: 100,
        source_markdown_lines: 50,
        total_images: 1,
        parse_rate: 100,
        ligature_count: 0,
        figure_coverage: 100,
      },
    };
  }

  describe("iterateBlocks", () => {
    test("yields all blocks across all pages in order", () => {
      const document = createMockDocument();
      const blocks = Array.from(iterateBlocks(document));

      expect(blocks).toHaveLength(4);
      expect(blocks[0]?.id).toBe("/page/0/SectionHeader/1");
      expect(blocks[1]?.id).toBe("/page/0/Text/2");
      expect(blocks[2]?.id).toBe("/page/1/Text/1");
      expect(blocks[3]?.id).toBe("/page/1/FigureCaption/2");
    });

    test("yields empty for document with no pages", () => {
      const document: RhotonDocument = {
        ...createMockDocument(),
        pages: [],
      };
      const blocks = Array.from(iterateBlocks(document));
      expect(blocks).toHaveLength(0);
    });

    test("yields empty for pages with no blocks", () => {
      const document: RhotonDocument = {
        ...createMockDocument(),
        pages: [{ page_number: 0, blocks: [] }],
      };
      const blocks = Array.from(iterateBlocks(document));
      expect(blocks).toHaveLength(0);
    });

    test("is lazy - does not evaluate until consumed", () => {
      const document = createMockDocument();
      const generator = iterateBlocks(document);

      // Generator exists but hasn't yielded yet
      expect(typeof generator.next).toBe("function");

      // Consume one block
      const first = generator.next();
      expect(first.done).toBe(false);
      expect(first.value?.id).toBe("/page/0/SectionHeader/1");
    });

    test("can filter blocks by type using functional composition", () => {
      const document = createMockDocument();
      const headers = Array.from(iterateBlocks(document))
        .filter(block => block.block_type === "section_header");

      expect(headers).toHaveLength(1);
      expect(headers[0]?.content).toBe("Chapter 1");
    });

    test("can count blocks by type using reduce", () => {
      const document = createMockDocument();
      const textCount = Array.from(iterateBlocks(document))
        .filter(block => block.block_type === "text")
        .length;

      expect(textCount).toBe(2);
    });
  });

  describe("iterateBlocksWithPage", () => {
    test("yields blocks with page context", () => {
      const document = createMockDocument();
      const blocksWithPage: BlockWithPage[] = Array.from(iterateBlocksWithPage(document));

      expect(blocksWithPage).toHaveLength(4);

      // First page blocks
      expect(blocksWithPage[0]?.block.id).toBe("/page/0/SectionHeader/1");
      expect(blocksWithPage[0]?.pageIndex).toBe(0);
      expect(blocksWithPage[0]?.pageNumber).toBe(0);

      expect(blocksWithPage[1]?.block.id).toBe("/page/0/Text/2");
      expect(blocksWithPage[1]?.pageIndex).toBe(0);
      expect(blocksWithPage[1]?.pageNumber).toBe(0);

      // Second page blocks
      expect(blocksWithPage[2]?.block.id).toBe("/page/1/Text/1");
      expect(blocksWithPage[2]?.pageIndex).toBe(1);
      expect(blocksWithPage[2]?.pageNumber).toBe(1);

      expect(blocksWithPage[3]?.block.id).toBe("/page/1/FigureCaption/2");
      expect(blocksWithPage[3]?.pageIndex).toBe(1);
      expect(blocksWithPage[3]?.pageNumber).toBe(1);
    });

    test("pageIndex is 0-based, pageNumber matches page.page_number", () => {
      const document = createMockDocument();
      // Modify page_number to be different from index
      document.pages[0]!.page_number = 5;
      document.pages[1]!.page_number = 7;

      const blocksWithPage = Array.from(iterateBlocksWithPage(document));

      expect(blocksWithPage[0]?.pageIndex).toBe(0);
      expect(blocksWithPage[0]?.pageNumber).toBe(5);

      expect(blocksWithPage[2]?.pageIndex).toBe(1);
      expect(blocksWithPage[2]?.pageNumber).toBe(7);
    });

    test("yields empty for document with no pages", () => {
      const document: RhotonDocument = {
        ...createMockDocument(),
        pages: [],
      };
      const blocksWithPage = Array.from(iterateBlocksWithPage(document));
      expect(blocksWithPage).toHaveLength(0);
    });

    test("can group blocks by page using functional composition", () => {
      const document = createMockDocument();
      const blocksByPage = new Map<number, string[]>();

      for (const { block, pageNumber } of iterateBlocksWithPage(document)) {
        const ids = blocksByPage.get(pageNumber) ?? [];
        ids.push(block.id);
        blocksByPage.set(pageNumber, ids);
      }

      expect(blocksByPage.get(0)).toEqual(["/page/0/SectionHeader/1", "/page/0/Text/2"]);
      expect(blocksByPage.get(1)).toEqual(["/page/1/Text/1", "/page/1/FigureCaption/2"]);
    });
  });
});
