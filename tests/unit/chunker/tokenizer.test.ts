import { describe, test, expect } from "bun:test";
import { estimateTokens } from "../../../src/services/chunker/tokenizer";

describe("tokenizer", () => {
  describe("estimateTokens", () => {
    test("returns 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    test("returns 1 for 4 characters", () => {
      expect(estimateTokens("test")).toBe(1);
    });

    test("rounds up for partial tokens", () => {
      expect(estimateTokens("hello")).toBe(2); // 5 chars / 4 = 1.25 → 2
    });

    test("handles longer text", () => {
      const text = "The cerebral veins are divided into superficial and deep groups.";
      // 64 chars / 4 = 16 tokens
      expect(estimateTokens(text)).toBe(16);
    });

    test("handles unicode characters", () => {
      expect(estimateTokens("café")).toBe(1); // 4 chars
    });
  });
});
