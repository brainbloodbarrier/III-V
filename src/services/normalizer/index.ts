/**
 * Text normalization orchestrator.
 * Composes all normalizers into a single pipeline.
 */

import { replaceLigatures, countLigatures } from "./ligature";
import { rejoinHyphenatedWords } from "./hyphenation";
import { normalizeWhitespace, normalizeLineBreaks } from "./whitespace";
import { normalizePunctuation } from "./punctuation";
import { normalizeUnicode } from "./unicode";
import { createLogger } from "../../lib/logger";

const log = createLogger("normalizer");

export interface NormalizationResult {
  text: string;
  ligaturesBefore: number;
  ligaturesAfter: number;
}

/**
 * Full text normalization pipeline.
 * Order matters:
 * 1. Unicode NFC normalization first (consistent character representation)
 * 2. Line breaks (for hyphenation detection)
 * 3. Hyphenation rejoining
 * 4. Ligature replacement
 * 5. Punctuation normalization
 * 6. Whitespace cleanup (last)
 */
export function normalizeText(text: string): NormalizationResult {
  if (!text) {
    return { text: "", ligaturesBefore: 0, ligaturesAfter: 0 };
  }

  const ligaturesBefore = countLigatures(text);

  // Step 1: Unicode NFC normalization (ensures consistent character representation)
  // e.g., "é" as U+00E9 vs "e" + combining acute U+0301
  let result = normalizeUnicode(text);

  // Step 2: Normalize line endings
  result = normalizeLineBreaks(result);

  // Step 3: Rejoin hyphenated words
  result = rejoinHyphenatedWords(result);

  // Step 4: Replace ligatures
  result = replaceLigatures(result);

  // Step 5: Normalize punctuation
  result = normalizePunctuation(result);

  // Step 6: Clean up whitespace
  result = normalizeWhitespace(result);

  const ligaturesAfter = countLigatures(result);

  return {
    text: result,
    ligaturesBefore,
    ligaturesAfter,
  };
}

/**
 * Counts total ligatures in a document's content blocks.
 */
export function countDocumentLigatures(
  blocks: { content: string }[]
): number {
  let total = 0;
  for (const block of blocks) {
    total += countLigatures(block.content);
  }
  return total;
}

/**
 * Normalizes all content blocks in place.
 */
export function normalizeBlocks<T extends { content: string; raw_html: string }>(
  blocks: T[]
): { totalLigaturesBefore: number; totalLigaturesAfter: number } {
  let totalLigaturesBefore = 0;
  let totalLigaturesAfter = 0;

  for (const block of blocks) {
    const result = normalizeText(block.content);
    block.content = result.text;
    totalLigaturesBefore += result.ligaturesBefore;
    totalLigaturesAfter += result.ligaturesAfter;
  }

  log.info("Normalized content blocks", {
    blockCount: blocks.length,
    ligaturesBefore: totalLigaturesBefore,
    ligaturesAfter: totalLigaturesAfter,
  });

  return { totalLigaturesBefore, totalLigaturesAfter };
}

// Re-export individual normalizers
export {
  replaceLigatures,
  countLigatures,
  hasLigatures,
} from "./ligature";

export {
  rejoinHyphenatedWords,
  isValidWord,
} from "./hyphenation";

export {
  normalizeWhitespace,
  collapseWhitespace,
  removeControlCharacters,
  normalizeLineBreaks,
} from "./whitespace";

export {
  normalizePunctuation,
  normalizeQuotes,
  normalizeDashes,
} from "./punctuation";

export {
  normalizeUnicode,
  hasDecomposedCharacters,
  countCombiningMarks,
} from "./unicode";
