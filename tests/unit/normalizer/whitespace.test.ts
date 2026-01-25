/**
 * Tests for whitespace normalization.
 * TDD: Tests written first to define expected behavior.
 */

import { describe, it, expect } from "bun:test";
import {
  collapseWhitespace,
  removeControlCharacters,
  normalizeLineBreaks,
} from "../../../src/services/normalizer/whitespace.ts";

describe("Whitespace Normalizer", () => {
  describe("collapseWhitespace", () => {
    it("collapses multiple spaces to single space", () => {
      expect(collapseWhitespace("the   cerebral    veins")).toBe(
        "the cerebral veins"
      );
    });

    it("collapses tabs and spaces", () => {
      expect(collapseWhitespace("the\t\tcerebral\t veins")).toBe(
        "the cerebral veins"
      );
    });

    it("trims leading and trailing whitespace", () => {
      expect(collapseWhitespace("  cerebral veins  ")).toBe("cerebral veins");
    });

    it("preserves single spaces", () => {
      expect(collapseWhitespace("cerebral veins")).toBe("cerebral veins");
    });

    it("handles empty string", () => {
      expect(collapseWhitespace("")).toBe("");
    });

    it("handles whitespace-only string", () => {
      expect(collapseWhitespace("   \t\t   ")).toBe("");
    });
  });

  describe("removeControlCharacters", () => {
    it("removes null characters", () => {
      expect(removeControlCharacters("cerebral\x00veins")).toBe("cerebralveins");
    });

    it("removes form feed characters", () => {
      expect(removeControlCharacters("cerebral\x0Cveins")).toBe("cerebralveins");
    });

    it("preserves normal characters", () => {
      expect(removeControlCharacters("cerebral veins")).toBe("cerebral veins");
    });

    it("preserves newlines and tabs", () => {
      // These are often intentional
      expect(removeControlCharacters("line1\nline2")).toBe("line1\nline2");
    });

    it("removes zero-width characters", () => {
      expect(removeControlCharacters("cerebral\u200Bveins")).toBe("cerebralveins");
      expect(removeControlCharacters("cerebral\uFEFFveins")).toBe("cerebralveins");
    });
  });

  describe("normalizeLineBreaks", () => {
    it("converts CRLF to LF", () => {
      expect(normalizeLineBreaks("line1\r\nline2")).toBe("line1\nline2");
    });

    it("converts CR to LF", () => {
      expect(normalizeLineBreaks("line1\rline2")).toBe("line1\nline2");
    });

    it("preserves LF", () => {
      expect(normalizeLineBreaks("line1\nline2")).toBe("line1\nline2");
    });

    it("handles mixed line endings", () => {
      expect(normalizeLineBreaks("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
    });
  });
});
