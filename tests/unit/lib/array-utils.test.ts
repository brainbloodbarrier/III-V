import { describe, test, expect } from "bun:test";
import { mergeUnique, mergeSortedUnique, dedupe } from "../../../src/lib/array-utils";

describe("array-utils", () => {
  describe("mergeUnique", () => {
    test("merges two arrays with unique values", () => {
      const result = mergeUnique([1, 2, 3], [4, 5, 6]);
      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test("deduplicates overlapping values", () => {
      const result = mergeUnique([1, 2, 3], [2, 3, 4]);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test("preserves order from target first, then source additions", () => {
      const result = mergeUnique(["a", "b"], ["c", "b", "d"]);
      expect(result).toEqual(["a", "b", "c", "d"]);
    });

    test("handles empty target", () => {
      const result = mergeUnique([], [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    test("handles empty source", () => {
      const result = mergeUnique([1, 2, 3], []);
      expect(result).toEqual([1, 2, 3]);
    });

    test("handles both empty", () => {
      const result = mergeUnique([], []);
      expect(result).toEqual([]);
    });

    test("handles complete overlap", () => {
      const result = mergeUnique([1, 2, 3], [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    test("does not mutate input arrays", () => {
      const target = [1, 2];
      const source = [2, 3];
      mergeUnique(target, source);
      expect(target).toEqual([1, 2]);
      expect(source).toEqual([2, 3]);
    });

    test("works with strings", () => {
      const result = mergeUnique(
        ["/page/1/Text/1", "/page/1/Text/2"],
        ["/page/1/Text/2", "/page/1/Text/3"]
      );
      expect(result).toEqual([
        "/page/1/Text/1",
        "/page/1/Text/2",
        "/page/1/Text/3",
      ]);
    });
  });

  describe("mergeSortedUnique", () => {
    test("merges and sorts number arrays", () => {
      const result = mergeSortedUnique([3, 1], [4, 2]);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test("deduplicates and sorts", () => {
      const result = mergeSortedUnique([5, 2, 3], [3, 1, 2]);
      expect(result).toEqual([1, 2, 3, 5]);
    });

    test("handles empty arrays", () => {
      expect(mergeSortedUnique([], [])).toEqual([]);
      expect(mergeSortedUnique([2, 1], [])).toEqual([1, 2]);
      expect(mergeSortedUnique([], [3, 1])).toEqual([1, 3]);
    });

    test("handles page number merge scenario", () => {
      const result = mergeSortedUnique([10, 11], [11, 12, 13]);
      expect(result).toEqual([10, 11, 12, 13]);
    });

    test("handles negative numbers", () => {
      const result = mergeSortedUnique([-1, 2], [-2, 1]);
      expect(result).toEqual([-2, -1, 1, 2]);
    });
  });

  describe("dedupe", () => {
    test("removes duplicates while preserving order", () => {
      const result = dedupe([1, 2, 2, 3, 1, 4, 3]);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test("handles array with no duplicates", () => {
      const result = dedupe([1, 2, 3, 4]);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test("handles empty array", () => {
      const result = dedupe([]);
      expect(result).toEqual([]);
    });

    test("handles single element", () => {
      const result = dedupe([1]);
      expect(result).toEqual([1]);
    });

    test("handles all duplicates", () => {
      const result = dedupe([1, 1, 1, 1]);
      expect(result).toEqual([1]);
    });

    test("works with strings", () => {
      const result = dedupe(["Fig. 1.1", "Fig. 1.2", "Fig. 1.1", "Fig. 1.3"]);
      expect(result).toEqual(["Fig. 1.1", "Fig. 1.2", "Fig. 1.3"]);
    });

    test("does not mutate input array", () => {
      const input = [1, 2, 2, 3];
      dedupe(input);
      expect(input).toEqual([1, 2, 2, 3]);
    });

    test("preserves first occurrence order", () => {
      const result = dedupe(["c", "a", "b", "a", "c"]);
      expect(result).toEqual(["c", "a", "b"]);
    });
  });
});
