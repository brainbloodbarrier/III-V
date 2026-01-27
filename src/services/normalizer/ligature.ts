/**
 * Ligature normalization - replaces Unicode ligatures with ASCII equivalents.
 * Common in PDF extraction where fonts use ligature characters.
 */

/**
 * Map of Unicode ligature characters to their ASCII equivalents.
 */
export const LIGATURE_MAP: Record<string, string> = {
  "\uFB00": "ff", // ﬀ
  "\uFB01": "fi", // ﬁ
  "\uFB02": "fl", // ﬂ
  "\uFB03": "ffi", // ﬃ
  "\uFB04": "ffl", // ﬄ
  "\uFB05": "st", // ﬅ (long s + t)
  "\uFB06": "st", // ﬆ
};

/**
 * Pattern to match all ligature characters.
 */
const LIGATURE_PATTERN = new RegExp(
  Object.keys(LIGATURE_MAP).join("|"),
  "g"
);

/**
 * Replaces Unicode ligature characters with their ASCII equivalents.
 */
export function replaceLigatures(text: string): string {
  if (!text) return text;
  return text.replace(LIGATURE_PATTERN, (match) => LIGATURE_MAP[match] ?? match);
}

/**
 * Counts the number of ligature characters in text.
 */
export function countLigatures(text: string): number {
  if (!text) return 0;
  const matches = text.match(LIGATURE_PATTERN);
  return matches ? matches.length : 0;
}

/**
 * Checks if text contains any ligature characters.
 */
export function hasLigatures(text: string): boolean {
  return countLigatures(text) > 0;
}
