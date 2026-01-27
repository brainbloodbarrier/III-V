/**
 * Tests for caption extraction from figure blocks.
 * Extracts inline image references from captions.
 */

import { describe, it, expect } from "bun:test";
import {
  extractInlineImage,
  extractFigureId,
  extractCaptionText,
} from "../../../src/services/figure-mapper/caption-extractor.ts";

describe("Caption Extractor", () => {
  describe("extractInlineImage", () => {
    it("extracts image from markdown syntax", () => {
      const caption = "![](_page_11_Figure_0.jpeg)\n\nFIGURE 4.3. Caption text.";
      const image = extractInlineImage(caption);
      expect(image).toBe("_page_11_Figure_0.jpeg");
    });

    it("extracts image with alt text", () => {
      const caption = "![Figure](_page_5_Figure_2.jpeg)\n\nFIGURE 4.1. Description.";
      const image = extractInlineImage(caption);
      expect(image).toBe("_page_5_Figure_2.jpeg");
    });

    it("returns null when no image present", () => {
      const caption = "FIGURE 4.5. This figure has no inline image.";
      expect(extractInlineImage(caption)).toBeNull();
    });

    it("handles multiple images (returns first)", () => {
      const caption = "![](_page_1_Figure_0.jpeg)\n![](_page_1_Figure_1.jpeg)";
      expect(extractInlineImage(caption)).toBe("_page_1_Figure_0.jpeg");
    });
  });

  describe("extractFigureId", () => {
    it("extracts figure ID from FIGURE caption", () => {
      const caption = "FIGURE 4.3. Venous lacunae and bridging veins.";
      expect(extractFigureId(caption)).toBe("Fig. 4.3");
    });

    it("extracts figure ID from Fig. format", () => {
      const caption = "Fig. 4.1 shows the anatomy.";
      expect(extractFigureId(caption)).toBe("Fig. 4.1");
    });

    it("handles double-digit numbers", () => {
      const caption = "FIGURE 4.15. Complex structure.";
      expect(extractFigureId(caption)).toBe("Fig. 4.15");
    });

    it("returns null when no figure ID", () => {
      const caption = "Some text without figure reference.";
      expect(extractFigureId(caption)).toBeNull();
    });
  });

  describe("extractCaptionText", () => {
    it("extracts caption text after figure ID", () => {
      const caption = "FIGURE 4.3. Venous lacunae and bridging veins to the superior sagittal sinus.";
      const text = extractCaptionText(caption);
      expect(text).toBe("Venous lacunae and bridging veins to the superior sagittal sinus.");
    });

    it("removes inline image reference", () => {
      const caption = "![](_page_11_Figure_0.jpeg)\n\nFIGURE 4.3. Caption text here.";
      const text = extractCaptionText(caption);
      expect(text).toBe("Caption text here.");
      expect(text).not.toContain("_page_11");
    });

    it("handles multi-paragraph captions", () => {
      const caption = "FIGURE 4.1. First paragraph.\n\nSecond paragraph with details.";
      const text = extractCaptionText(caption);
      expect(text).toContain("First paragraph.");
      expect(text).toContain("Second paragraph");
    });
  });
});
