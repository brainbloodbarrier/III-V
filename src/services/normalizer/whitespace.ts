/**
 * Whitespace normalization - handles spaces, tabs, control characters.
 */

/**
 * Pattern for multiple whitespace characters.
 */
const MULTIPLE_WHITESPACE = /[ \t]+/g;

/**
 * Control characters to remove (excluding newlines and tabs).
 */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Zero-width and invisible characters.
 */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF\u00AD]/g;

/**
 * Collapses multiple spaces/tabs to single space and trims.
 */
export function collapseWhitespace(text: string): string {
  if (!text) return text;
  return text.replace(MULTIPLE_WHITESPACE, " ").trim();
}

/**
 * Removes control characters that shouldn't appear in text.
 * Preserves newlines (\n) and tabs (\t) as they may be intentional.
 */
export function removeControlCharacters(text: string): string {
  if (!text) return text;
  return text
    .replace(CONTROL_CHARS, "")
    .replace(ZERO_WIDTH_CHARS, "");
}

/**
 * Normalizes line endings to Unix-style LF.
 */
export function normalizeLineBreaks(text: string): string {
  if (!text) return text;
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Full whitespace normalization pipeline.
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return text;
  return collapseWhitespace(
    removeControlCharacters(
      normalizeLineBreaks(text)
    )
  );
}
