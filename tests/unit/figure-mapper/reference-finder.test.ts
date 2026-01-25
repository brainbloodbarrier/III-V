/**
 * Tests for finding figure references in text.
 * Handles various figure reference formats.
 */

import { describe, it, expect } from "bun:test";
import {
  findFigureReferences,
  expandFigureRange,
  parseFigureNumber,
} from "../../../src/services/figure-mapper/reference-finder.ts";

describe("Reference Finder", () => {
  describe("parseFigureNumber", () => {
    it("parses simple figure number", () => {
      expect(parseFigureNumber("4.1")).toEqual({ chapter: 4, figure: 1 });
    });

    it("parses double-digit figure", () => {
      expect(parseFigureNumber("4.15")).toEqual({ chapter: 4, figure: 15 });
    });

    it("returns null for invalid format", () => {
      expect(parseFigureNumber("invalid")).toBeNull();
    });
  });

  describe("expandFigureRange", () => {
    it("expands range within same chapter", () => {
      const figures = expandFigureRange("Fig. 4.1", "4.3");
      expect(figures).toEqual(["Fig. 4.1", "Fig. 4.2", "Fig. 4.3"]);
    });

    it("expands range with chapter prefix on end", () => {
      const figures = expandFigureRange("Fig. 4.1", "4.5");
      expect(figures).toEqual([
        "Fig. 4.1",
        "Fig. 4.2",
        "Fig. 4.3",
        "Fig. 4.4",
        "Fig. 4.5",
      ]);
    });

    it("handles single figure (no range)", () => {
      const figures = expandFigureRange("Fig. 4.1", null);
      expect(figures).toEqual(["Fig. 4.1"]);
    });
  });

  describe("findFigureReferences", () => {
    it("finds single Fig. reference", () => {
      const text = "See Fig. 4.1 for details.";
      const refs = findFigureReferences(text);
      expect(refs).toContain("Fig. 4.1");
    });

    it("finds Figs. range reference", () => {
      const text = "Refer to Figs. 4.1-4.3 and 4.5.";
      const refs = findFigureReferences(text);
      expect(refs).toContain("Fig. 4.1");
      expect(refs).toContain("Fig. 4.2");
      expect(refs).toContain("Fig. 4.3");
      expect(refs).toContain("Fig. 4.5");
    });

    it("finds $Fig. X.Y$ format (LaTeX-style)", () => {
      const text = "as shown in $Fig. 4.1$ and $Fig. 4.2$.";
      const refs = findFigureReferences(text);
      expect(refs).toContain("Fig. 4.1");
      expect(refs).toContain("Fig. 4.2");
    });

    it("finds *Figs. X.Y-X.Z* format (markdown emphasis)", () => {
      const text = "(*Figs. 4.1-4.3*) show the veins.";
      const refs = findFigureReferences(text);
      expect(refs).toContain("Fig. 4.1");
      expect(refs).toContain("Fig. 4.2");
      expect(refs).toContain("Fig. 4.3");
    });

    it("finds comma-separated figures", () => {
      const text = "Figs. 4.2, 4.3, and 4.8";
      const refs = findFigureReferences(text);
      expect(refs).toContain("Fig. 4.2");
      expect(refs).toContain("Fig. 4.3");
      expect(refs).toContain("Fig. 4.8");
    });

    it("deduplicates references", () => {
      const text = "Fig. 4.1 shows... (see also Fig. 4.1)";
      const refs = findFigureReferences(text);
      const count = refs.filter((r) => r === "Fig. 4.1").length;
      expect(count).toBe(1);
    });

    it("returns empty array for no references", () => {
      const text = "No figure references here.";
      expect(findFigureReferences(text)).toEqual([]);
    });
  });
});
