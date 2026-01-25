/**
 * Tests for punctuation normalization.
 * TDD: Tests written first to define expected behavior.
 */

import { describe, it, expect } from "bun:test";
import {
  normalizePunctuation,
  normalizeQuotes,
  normalizeDashes,
} from "../../../src/services/normalizer/punctuation.ts";

describe("Punctuation Normalizer", () => {
  describe("normalizeQuotes", () => {
    it("converts left double quote to ASCII", () => {
      expect(normalizeQuotes("\u201Ctest\u201D")).toBe('"test"');
    });

    it("converts left single quote to ASCII", () => {
      expect(normalizeQuotes("\u2018test\u2019")).toBe("'test'");
    });

    it("converts guillemets to ASCII quotes", () => {
      expect(normalizeQuotes("\u00ABtest\u00BB")).toBe('"test"');
    });

    it("preserves ASCII quotes", () => {
      expect(normalizeQuotes('"test"')).toBe('"test"');
      expect(normalizeQuotes("'test'")).toBe("'test'");
    });

    it("handles mixed quotes", () => {
      expect(normalizeQuotes("\u201CHe said \u2018hello\u2019\u201D")).toBe(
        '"He said \'hello\'"'
      );
    });
  });

  describe("normalizeDashes", () => {
    it("converts en dash to hyphen in ranges", () => {
      expect(normalizeDashes("Figs. 4.1\u20134.5")).toBe("Figs. 4.1-4.5");
    });

    it("preserves em dash for punctuation", () => {
      // Em dash is commonly used for parenthetical statements
      expect(normalizeDashes("veins\u2014like arteries\u2014drain")).toBe(
        "veins--like arteries--drain"
      );
    });

    it("converts figure dash to hyphen", () => {
      expect(normalizeDashes("page\u2012123")).toBe("page-123");
    });

    it("preserves regular hyphens", () => {
      expect(normalizeDashes("deep-seated")).toBe("deep-seated");
    });
  });

  describe("normalizePunctuation", () => {
    it("normalizes all punctuation types", () => {
      const input = "\u201CFigs. 4.1\u20134.5\u201D show the \u2018veins\u2019";
      const expected = '"Figs. 4.1-4.5" show the \'veins\'';
      expect(normalizePunctuation(input)).toBe(expected);
    });

    it("handles real document text", () => {
      const input =
        "The basal vein of Rosenthal\u2014named after the German anatomist\u2014was described in 1824.";
      const expected =
        "The basal vein of Rosenthal--named after the German anatomist--was described in 1824.";
      expect(normalizePunctuation(input)).toBe(expected);
    });

    it("preserves ASCII punctuation", () => {
      const text = "The cerebral veins (Fig. 4.1) drain the cortex.";
      expect(normalizePunctuation(text)).toBe(text);
    });

    it("handles empty string", () => {
      expect(normalizePunctuation("")).toBe("");
    });
  });
});
