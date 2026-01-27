/**
 * Tests for ligature normalization.
 * TDD: Tests written first to define expected behavior.
 */

import { describe, it, expect } from "bun:test";
import {
  replaceLigatures,
  LIGATURE_MAP,
  countLigatures,
} from "../../../src/services/normalizer/ligature.ts";

describe("Ligature Normalizer", () => {
  describe("LIGATURE_MAP", () => {
    it("contains all standard ligatures", () => {
      expect(LIGATURE_MAP).toHaveProperty("\uFB00"); // ﬀ
      expect(LIGATURE_MAP).toHaveProperty("\uFB01"); // ﬁ
      expect(LIGATURE_MAP).toHaveProperty("\uFB02"); // ﬂ
      expect(LIGATURE_MAP).toHaveProperty("\uFB03"); // ﬃ
      expect(LIGATURE_MAP).toHaveProperty("\uFB04"); // ﬄ
    });
  });

  describe("replaceLigatures", () => {
    it("replaces ﬀ with ff", () => {
      expect(replaceLigatures("e\uFB00ect")).toBe("effect");
    });

    it("replaces ﬁ with fi", () => {
      expect(replaceLigatures("\uFB01ber")).toBe("fiber");
    });

    it("replaces ﬂ with fl", () => {
      expect(replaceLigatures("\uFB02ow")).toBe("flow");
    });

    it("replaces ﬃ with ffi", () => {
      expect(replaceLigatures("a\uFB03rmation")).toBe("affirmation");
    });

    it("replaces ﬄ with ffl", () => {
      expect(replaceLigatures("ba\uFB04e")).toBe("baffle");
    });

    it("handles multiple ligatures in same string", () => {
      expect(replaceLigatures("\uFB01rst e\uFB00ort")).toBe("first effort");
    });

    it("preserves non-ligature text", () => {
      const text = "The cerebral veins";
      expect(replaceLigatures(text)).toBe(text);
    });

    it("handles empty string", () => {
      expect(replaceLigatures("")).toBe("");
    });

    it("handles medical terminology with ligatures", () => {
      // Real examples from Rhoton text
      expect(replaceLigatures("a\uFB00erent")).toBe("afferent");
      expect(replaceLigatures("e\uFB00erent")).toBe("efferent");
      expect(replaceLigatures("super\uFB01cial")).toBe("superficial");
    });
  });

  describe("countLigatures", () => {
    it("counts single ligature", () => {
      expect(countLigatures("\uFB01ber")).toBe(1);
    });

    it("counts multiple ligatures", () => {
      expect(countLigatures("\uFB01rst e\uFB00ort")).toBe(2);
    });

    it("returns 0 for no ligatures", () => {
      expect(countLigatures("no ligatures here")).toBe(0);
    });

    it("returns 0 for empty string", () => {
      expect(countLigatures("")).toBe(0);
    });
  });
});
