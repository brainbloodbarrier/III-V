/**
 * Unicode normalization utilities.
 *
 * Ensures consistent Unicode handling by normalizing text to NFC (Canonical Decomposition,
 * followed by Canonical Composition). This guarantees that equivalent Unicode sequences
 * are represented identically.
 *
 * **Why NFC?**
 * - "é" can be represented as U+00E9 (precomposed) or U+0065 U+0301 (e + combining acute)
 * - Medical text often contains diacritics (e.g., "café", "naïve", "résumé")
 * - Consistent representation is critical for:
 *   - Text comparison and deduplication
 *   - Search and indexing
 *   - Token counting (different representations = different byte lengths)
 *
 * @see https://unicode.org/reports/tr15/ - Unicode Normalization Forms
 */

/**
 * Normalize text to NFC (Canonical Composition) form.
 *
 * This ensures that characters like "é" are consistently represented as a single
 * precomposed character (U+00E9) rather than a base character plus combining mark
 * (U+0065 U+0301).
 *
 * @param text - Input text to normalize
 * @returns Text normalized to NFC form
 *
 * @example
 * // Decomposed form (e + combining acute) -> Composed form (é)
 * normalizeUnicode("café") // "café" but with consistent representation
 */
export function normalizeUnicode(text: string): string {
  if (!text) return "";
  return text.normalize("NFC");
}

/**
 * Check if a string contains any decomposed Unicode characters that would
 * change under NFC normalization.
 *
 * @param text - Input text to check
 * @returns true if text contains decomposed characters
 *
 * @example
 * hasDecomposedCharacters("cafe\u0301") // true - contains combining acute
 * hasDecomposedCharacters("café")       // false - already composed
 */
export function hasDecomposedCharacters(text: string): boolean {
  if (!text) return false;
  return text !== text.normalize("NFC");
}

/**
 * Count the number of combining marks in text.
 * Combining marks (Unicode category "M") are characters that modify other characters.
 *
 * @param text - Input text to analyze
 * @returns Number of combining marks found
 */
export function countCombiningMarks(text: string): number {
  if (!text) return 0;
  // Match Unicode combining marks (category M: Mc, Me, Mn)
  // Range U+0300 to U+036F covers common combining diacritical marks
  // Extended ranges cover additional combining marks
  const combiningMarkPattern = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
  const matches = text.match(combiningMarkPattern);
  return matches ? matches.length : 0;
}
