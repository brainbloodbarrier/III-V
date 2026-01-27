/**
 * Punctuation normalization - converts fancy quotes and dashes to ASCII.
 */

/**
 * Quote character mappings.
 */
const QUOTE_MAP: Record<string, string> = {
  "\u201C": '"', // Left double quotation mark "
  "\u201D": '"', // Right double quotation mark "
  "\u201E": '"', // Double low-9 quotation mark „
  "\u201F": '"', // Double high-reversed-9 quotation mark
  "\u2018": "'", // Left single quotation mark '
  "\u2019": "'", // Right single quotation mark '
  "\u201A": "'", // Single low-9 quotation mark ‚
  "\u201B": "'", // Single high-reversed-9 quotation mark
  "\u00AB": '"', // Left guillemet «
  "\u00BB": '"', // Right guillemet »
  "\u2039": "'", // Single left guillemet ‹
  "\u203A": "'", // Single right guillemet ›
};

/**
 * Dash character mappings.
 */
const DASH_MAP: Record<string, string> = {
  "\u2013": "-", // En dash –
  "\u2014": "--", // Em dash —
  "\u2012": "-", // Figure dash ‒
  "\u2015": "--", // Horizontal bar ―
};

/**
 * Pattern for quote characters.
 */
const QUOTE_PATTERN = new RegExp(Object.keys(QUOTE_MAP).join("|"), "g");

/**
 * Pattern for dash characters.
 */
const DASH_PATTERN = new RegExp(Object.keys(DASH_MAP).join("|"), "g");

/**
 * Normalizes fancy quotes to ASCII quotes.
 */
export function normalizeQuotes(text: string): string {
  if (!text) return text;
  return text.replace(QUOTE_PATTERN, (match) => QUOTE_MAP[match] ?? match);
}

/**
 * Normalizes fancy dashes to ASCII equivalents.
 */
export function normalizeDashes(text: string): string {
  if (!text) return text;
  return text.replace(DASH_PATTERN, (match) => DASH_MAP[match] ?? match);
}

/**
 * Full punctuation normalization.
 */
export function normalizePunctuation(text: string): string {
  if (!text) return text;
  return normalizeDashes(normalizeQuotes(text));
}
