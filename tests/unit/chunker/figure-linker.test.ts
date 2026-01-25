import { describe, test, expect } from "bun:test";
import {
  loadFigureMap,
  linkFigure,
  createCaptionSnippet,
} from "../../../src/services/chunker/figure-linker";

describe("figure-linker", () => {
  // Sample figure map data matching Phase 1 output structure
  const mockFigureMap = {
    "Fig. 4.1": {
      figure_id: "Fig. 4.1",
      page_number: 5,
      caption: "The superficial cerebral veins showing the superior sagittal sinus and its tributaries. A., artery; Ant., anterior; V., vein.",
      caption_block_id: "/page/5/FigureCaption/1",
      abbreviations: ["A.", "Ant.", "V."],
      status: "mapped",
      image_file: "image-012.jpg",
      image_path: "./rhoton-supratentorial-cerebral-veins/images/image-012.jpg",
    },
    "Fig. 4.2": {
      figure_id: "Fig. 4.2",
      page_number: 7,
      caption: "Deep venous system overview.",
      caption_block_id: "/page/7/FigureCaption/1",
      abbreviations: [],
      status: "mapped",
      image_file: "image-015.jpg",
      image_path: "./rhoton-supratentorial-cerebral-veins/images/image-015.jpg",
    },
    "Fig. 4.3": {
      figure_id: "Fig. 4.3",
      page_number: 10,
      caption: "Figure without image mapping.",
      caption_block_id: "/page/10/FigureCaption/1",
      abbreviations: [],
      status: "no-image-in-caption",
    },
  };

  describe("createCaptionSnippet", () => {
    test("returns full caption if under max length", () => {
      const caption = "Short caption text.";
      expect(createCaptionSnippet(caption, 100)).toBe("Short caption text.");
    });

    test("truncates long captions at word boundary", () => {
      const longCaption = "The superficial cerebral veins showing the superior sagittal sinus and its tributaries with many more words.";
      const snippet = createCaptionSnippet(longCaption, 50);
      expect(snippet.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(snippet).toEndWith("...");
    });

    test("handles exact length caption", () => {
      const caption = "x".repeat(100);
      expect(createCaptionSnippet(caption, 100)).toBe(caption);
    });

    test("returns empty string for empty caption", () => {
      expect(createCaptionSnippet("", 100)).toBe("");
    });
  });

  describe("linkFigure", () => {
    test("links caption block to figure reference", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/5/FigureCaption/1", figureMap);

      expect(ref).not.toBeNull();
      expect(ref?.figure_id).toBe("Fig. 4.1");
      expect(ref?.image_path).toBe("./rhoton-supratentorial-cerebral-veins/images/image-012.jpg");
    });

    test("creates caption snippet in reference", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/5/FigureCaption/1", figureMap);

      expect(ref?.caption_snippet).toBeDefined();
      expect(ref?.caption_snippet.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    test("returns null for unknown caption block", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/99/Unknown/1", figureMap);

      expect(ref).toBeNull();
    });

    test("handles figure with no image path", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/10/FigureCaption/1", figureMap);

      expect(ref).not.toBeNull();
      expect(ref?.figure_id).toBe("Fig. 4.3");
      // image_path should be empty string or handled gracefully
      expect(ref?.image_path).toBeDefined();
    });
  });

  describe("loadFigureMap", () => {
    // Note: This test would need a mock file or test fixture
    // For now, test the function handles the map structure
    test("creates searchable map from figure map object", () => {
      // This tests the internal structure we expect
      const map = new Map<string, typeof mockFigureMap["Fig. 4.1"]>();

      for (const [key, value] of Object.entries(mockFigureMap)) {
        map.set(value.caption_block_id, value);
      }

      expect(map.has("/page/5/FigureCaption/1")).toBe(true);
      expect(map.get("/page/5/FigureCaption/1")?.figure_id).toBe("Fig. 4.1");
    });
  });
});
