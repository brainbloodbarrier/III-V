/**
 * Array utility functions for efficient deduplication and merging.
 */

/**
 * Merges two arrays, keeping only unique values.
 * Uses O(1) Set lookups instead of O(n) includes() checks.
 *
 * @param target - The base array (values preserved in order)
 * @param source - Array of values to merge in
 * @returns New array with unique values from both inputs
 */
export function mergeUnique<T>(target: readonly T[], source: readonly T[]): T[] {
  const result = [...target];
  const seen = new Set(target);

  for (const item of source) {
    if (!seen.has(item)) {
      result.push(item);
      seen.add(item);
    }
  }

  return result;
}

/**
 * Merges two number arrays, returning unique values sorted ascending.
 * Optimized for the common case of merging page numbers.
 *
 * @param target - The base array
 * @param source - Array of values to merge in
 * @returns New sorted array with unique values from both inputs
 */
export function mergeSortedUnique(target: readonly number[], source: readonly number[]): number[] {
  return mergeUnique(target, source).sort((a, b) => a - b);
}

/**
 * Deduplicates an array while preserving order.
 * More efficient than [...new Set(array)] when the array is small
 * and avoids spread operator overhead.
 *
 * @param array - Array to deduplicate
 * @returns New array with duplicates removed
 */
export function dedupe<T>(array: readonly T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];

  for (const item of array) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }

  return result;
}
