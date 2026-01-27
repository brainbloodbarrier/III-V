import { describe, test, expect } from "bun:test";
import { FigureIndex } from "../../../src/services/chunker/figure-index";
import type { FigureMapEntry } from "../../../src/services/chunker/figure-linker";

describe("FigureIndex", () => {
  // Sample figure entries for testing
  const mockFigures: FigureMapEntry[] = [
    {
      figure_id: "Fig. 4.1",
      page_number: 5,
      caption: "The superficial cerebral veins showing the superior sagittal sinus.",
      caption_block_id: "/page/5/FigureCaption/1",
      abbreviations: { "A.": "artery" },
      status: "mapped",
      image_file: "image-012.jpg",
      image_path: "./images/image-012.jpg",
    },
    {
      figure_id: "Fig. 4.2",
      page_number: 7,
      caption: "Deep venous system overview.",
      caption_block_id: "/page/7/FigureCaption/1",
      abbreviations: {},
      status: "mapped",
      image_file: "image-015.jpg",
      image_path: "./images/image-015.jpg",
    },
    {
      figure_id: "Fig. 4.3",
      page_number: 10,
      caption: "Figure without image mapping.",
      caption_block_id: "/page/10/FigureCaption/1",
      abbreviations: {},
      status: "no-image-in-caption",
    },
  ];

  describe("constructor", () => {
    test("creates index from array of figures", () => {
      const index = new FigureIndex(mockFigures);
      expect(index.size).toBe(3);
    });

    test("handles empty array", () => {
      const index = new FigureIndex([]);
      expect(index.size).toBe(0);
    });
  });

  describe("getById", () => {
    test("returns figure by figure_id (O(1) lookup)", () => {
      const index = new FigureIndex(mockFigures);

      const fig = index.getById("Fig. 4.1");
      expect(fig).toBeDefined();
      expect(fig?.figure_id).toBe("Fig. 4.1");
      expect(fig?.page_number).toBe(5);
      expect(fig?.caption_block_id).toBe("/page/5/FigureCaption/1");
    });

    test("returns undefined for non-existent figure_id", () => {
      const index = new FigureIndex(mockFigures);

      const fig = index.getById("Fig. 99.99");
      expect(fig).toBeUndefined();
    });

    test("handles all figures in index", () => {
      const index = new FigureIndex(mockFigures);

      expect(index.getById("Fig. 4.1")).toBeDefined();
      expect(index.getById("Fig. 4.2")).toBeDefined();
      expect(index.getById("Fig. 4.3")).toBeDefined();
    });
  });

  describe("getByCaptionBlockId", () => {
    test("returns figure by caption_block_id (O(1) lookup)", () => {
      const index = new FigureIndex(mockFigures);

      const fig = index.getByCaptionBlockId("/page/5/FigureCaption/1");
      expect(fig).toBeDefined();
      expect(fig?.figure_id).toBe("Fig. 4.1");
      expect(fig?.caption_block_id).toBe("/page/5/FigureCaption/1");
    });

    test("returns undefined for non-existent caption_block_id", () => {
      const index = new FigureIndex(mockFigures);

      const fig = index.getByCaptionBlockId("/page/99/Unknown/1");
      expect(fig).toBeUndefined();
    });

    test("handles all caption_block_ids in index", () => {
      const index = new FigureIndex(mockFigures);

      expect(index.getByCaptionBlockId("/page/5/FigureCaption/1")).toBeDefined();
      expect(index.getByCaptionBlockId("/page/7/FigureCaption/1")).toBeDefined();
      expect(index.getByCaptionBlockId("/page/10/FigureCaption/1")).toBeDefined();
    });
  });

  describe("values", () => {
    test("returns iterator of all figures", () => {
      const index = new FigureIndex(mockFigures);

      const values = Array.from(index.values());
      expect(values).toHaveLength(3);

      const figureIds = values.map((f) => f.figure_id);
      expect(figureIds).toContain("Fig. 4.1");
      expect(figureIds).toContain("Fig. 4.2");
      expect(figureIds).toContain("Fig. 4.3");
    });

    test("returns empty iterator for empty index", () => {
      const index = new FigureIndex([]);

      const values = Array.from(index.values());
      expect(values).toHaveLength(0);
    });
  });

  describe("getCaptionBlockIds", () => {
    test("returns all caption_block_ids", () => {
      const index = new FigureIndex(mockFigures);

      const blockIds = index.getCaptionBlockIds();
      expect(blockIds).toHaveLength(3);
      expect(blockIds).toContain("/page/5/FigureCaption/1");
      expect(blockIds).toContain("/page/7/FigureCaption/1");
      expect(blockIds).toContain("/page/10/FigureCaption/1");
    });

    test("returns empty array for empty index", () => {
      const index = new FigureIndex([]);

      const blockIds = index.getCaptionBlockIds();
      expect(blockIds).toHaveLength(0);
    });
  });

  describe("size", () => {
    test("returns correct count", () => {
      const index = new FigureIndex(mockFigures);
      expect(index.size).toBe(3);
    });

    test("returns 0 for empty index", () => {
      const index = new FigureIndex([]);
      expect(index.size).toBe(0);
    });
  });

  describe("dual-index consistency", () => {
    test("getById and getByCaptionBlockId return same entry", () => {
      const index = new FigureIndex(mockFigures);

      const byId = index.getById("Fig. 4.1");
      const byBlockId = index.getByCaptionBlockId("/page/5/FigureCaption/1");

      expect(byId).toBe(byBlockId);
    });
  });
});
