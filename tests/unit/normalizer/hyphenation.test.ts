/**
 * Tests for hyphenation normalization (rejoining line-broken words).
 * TDD: Tests written first to define expected behavior.
 */

import { describe, it, expect } from "bun:test";
import {
  rejoinHyphenatedWords,
  isValidWord,
} from "../../../src/services/normalizer/hyphenation.ts";

describe("Hyphenation Normalizer", () => {
  describe("rejoinHyphenatedWords", () => {
    it("rejoins simple hyphenated line break", () => {
      expect(rejoinHyphenatedWords("cere-\nbral")).toBe("cerebral");
    });

    it("rejoins with carriage return and newline", () => {
      expect(rejoinHyphenatedWords("neuro-\r\nsurgical")).toBe("neurosurgical");
    });

    it("preserves intentional hyphens", () => {
      // compound words that should keep hyphens
      expect(rejoinHyphenatedWords("deep-seated")).toBe("deep-seated");
    });

    it("handles multiple hyphenations in text", () => {
      const input = "The super-\nficial veins drain the cere-\nbral cortex.";
      const expected = "The superficial veins drain the cerebral cortex.";
      expect(rejoinHyphenatedWords(input)).toBe(expected);
    });

    it("preserves non-hyphenated text", () => {
      const text = "The basal vein of Rosenthal.";
      expect(rejoinHyphenatedWords(text)).toBe(text);
    });

    it("handles empty string", () => {
      expect(rejoinHyphenatedWords("")).toBe("");
    });

    it("handles medical terms correctly", () => {
      expect(rejoinHyphenatedWords("anasto-\nmoses")).toBe("anastomoses");
      expect(rejoinHyphenatedWords("venous-\narterial")).toBe("venous-arterial");
    });

    it("handles multiple line breaks", () => {
      const input = "supra-\ntentorial struc-\ntures";
      expect(rejoinHyphenatedWords(input)).toBe("supratentorial structures");
    });
  });

  describe("isValidWord", () => {
    it("validates common English words", () => {
      expect(isValidWord("cerebral")).toBe(true);
      expect(isValidWord("vein")).toBe(true);
    });

    it("validates medical terminology", () => {
      expect(isValidWord("supratentorial")).toBe(true);
      expect(isValidWord("anastomoses")).toBe(true);
    });

    it("rejects gibberish", () => {
      expect(isValidWord("xyzqwk")).toBe(false);
    });

    it("handles empty string", () => {
      expect(isValidWord("")).toBe(false);
    });
  });
});
