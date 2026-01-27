import { describe, test, expect } from "bun:test";
import { ChunkAccumulator, accumulateItems } from "../../../src/services/chunker/accumulator";

describe("ChunkAccumulator", () => {
  describe("basic operations", () => {
    test("initializes with default values", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });
      expect(accumulator.hasContent()).toBe(false);
      expect(accumulator.getTokenCount()).toBe(0);
      expect(accumulator.getItemCount()).toBe(0);
    });

    test("add() accumulates items within limit", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });

      const result = accumulator.add("hello", 5);

      expect(result).toBeUndefined();
      expect(accumulator.hasContent()).toBe(true);
      expect(accumulator.getItemCount()).toBe(1);
      expect(accumulator.getTokenCount()).toBe(5);
    });

    test("add() includes separator tokens for subsequent items", () => {
      const accumulator = new ChunkAccumulator({
        maxTokens: 100,
        separator: " ",
        separatorTokens: 1,
      });

      accumulator.add("word1", 5);
      accumulator.add("word2", 5);

      // First item: 5 tokens, second item: 5 + 1 separator = 6
      expect(accumulator.getTokenCount()).toBe(11);
    });

    test("flush() returns accumulated content", () => {
      const accumulator = new ChunkAccumulator({
        maxTokens: 100,
        separator: " ",
      });

      accumulator.add("hello", 5);
      accumulator.add("world", 5);

      const result = accumulator.flush();

      expect(result).toBeDefined();
      expect(result!.content).toBe("hello world");
      expect(result!.tokens).toBe(11); // 5 + 5 + 1 separator
    });

    test("flush() resets accumulator state", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });

      accumulator.add("hello", 5);
      accumulator.flush();

      expect(accumulator.hasContent()).toBe(false);
      expect(accumulator.getTokenCount()).toBe(0);
      expect(accumulator.getItemCount()).toBe(0);
    });

    test("flush() returns undefined when empty", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });

      const result = accumulator.flush();

      expect(result).toBeUndefined();
    });
  });

  describe("limit behavior", () => {
    test("add() flushes when limit would be exceeded", () => {
      const accumulator = new ChunkAccumulator({
        maxTokens: 10,
        separator: " ",
        separatorTokens: 1,
      });

      // Add first item (5 tokens)
      const result1 = accumulator.add("word1", 5);
      expect(result1).toBeUndefined();

      // Add second item (5 + 1 = 6 tokens, total would be 11 > 10)
      const result2 = accumulator.add("word2", 5);

      expect(result2).toBeDefined();
      expect(result2!.content).toBe("word1");
      expect(result2!.tokens).toBe(5);

      // New item should be in accumulator
      expect(accumulator.getItemCount()).toBe(1);
    });

    test("add() handles item exactly at limit", () => {
      const accumulator = new ChunkAccumulator({
        maxTokens: 10,
        separator: " ",
        separatorTokens: 1,
      });

      // Add item exactly at limit
      const result = accumulator.add("exact", 10);

      expect(result).toBeUndefined();
      expect(accumulator.getTokenCount()).toBe(10);
    });

    test("first item can exceed limit (no flush if empty)", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 5 });

      // Add item that exceeds limit when accumulator is empty
      const result = accumulator.add("verylongword", 15);

      // Should not flush since there was nothing to flush
      expect(result).toBeUndefined();
      expect(accumulator.getItemCount()).toBe(1);
    });
  });

  describe("custom separators", () => {
    test("uses paragraph separator", () => {
      const accumulator = new ChunkAccumulator({
        maxTokens: 100,
        separator: "\n\n",
        separatorTokens: 2,
      });

      accumulator.add("paragraph1", 10);
      accumulator.add("paragraph2", 10);

      const result = accumulator.flush();

      expect(result!.content).toBe("paragraph1\n\nparagraph2");
      expect(result!.tokens).toBe(22); // 10 + 10 + 2 separator
    });

    test("uses default separator and tokens", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });

      accumulator.add("a", 1);
      accumulator.add("b", 1);

      const result = accumulator.flush();

      // Default separator is " " with 1 token
      expect(result!.content).toBe("a b");
      expect(result!.tokens).toBe(3);
    });
  });

  describe("token estimation", () => {
    test("uses provided token count", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });

      accumulator.add("hello", 42);

      expect(accumulator.getTokenCount()).toBe(42);
    });

    test("estimates tokens when not provided", () => {
      const accumulator = new ChunkAccumulator({ maxTokens: 100 });

      // "hello" is 5 chars, estimated at 5/4 = 2 tokens (ceil)
      accumulator.add("hello");

      expect(accumulator.getTokenCount()).toBe(2);
    });
  });
});

describe("accumulateItems", () => {
  test("processes items and returns all results", () => {
    const items = ["word1", "word2", "word3", "word4"];

    const results = accumulateItems(
      items,
      { maxTokens: 10, separator: " ", separatorTokens: 1 },
      (item) => 5 // Each word is 5 tokens
    );

    // word1 (5) + word2 (5+1) = 11 > 10, so flush after word1
    // word2 (5) + word3 (5+1) = 11 > 10, so flush after word2
    // word3 (5) + word4 (5+1) = 11 > 10, so flush after word3
    // word4 (5) remains, flushed at end
    expect(results).toHaveLength(4);
    expect(results[0]!.content).toBe("word1");
    expect(results[1]!.content).toBe("word2");
    expect(results[2]!.content).toBe("word3");
    expect(results[3]!.content).toBe("word4");
  });

  test("returns empty array for empty input", () => {
    const results = accumulateItems([], { maxTokens: 100 });

    expect(results).toHaveLength(0);
  });

  test("returns single result when all items fit", () => {
    const items = ["a", "b", "c"];

    const results = accumulateItems(
      items,
      { maxTokens: 100, separator: " ", separatorTokens: 1 },
      () => 1
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe("a b c");
  });

  test("uses default estimateTokens when getTokens not provided", () => {
    const items = ["hi"]; // 2 chars = 1 token (ceil(2/4))

    const results = accumulateItems(items, { maxTokens: 100 });

    expect(results).toHaveLength(1);
    expect(results[0]!.tokens).toBe(1);
  });
});
