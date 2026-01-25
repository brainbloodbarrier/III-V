/**
 * Text normalization orchestrator.
 * Composes all normalizers into a single pipeline.
 */

import { replaceLigatures, countLigatures, hasLigatures } from "./ligature.ts";
import { rejoinHyphenatedWords } from "./hyphenation.ts";
import { normalizeWhitespace, collapseWhitespace, removeControlCharacters, normalizeLineBreaks } from "./whitespace.ts";
import { normalizePunctuation, normalizeQuotes, normalizeDashes } from "./punctuation.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("normalizer");

export interface NormalizationResult {
  text: string;
  ligaturesBefore: number;
  ligaturesAfter: number;
}

/**
 * Full text normalization pipeline.
 * Order matters:
 * 1. Line breaks first (for hyphenation detection)
 * 2. Hyphenation rejoining
 * 3. Ligature replacement
 * 4. Punctuation normalization
 * 5. Whitespace cleanup (last)
 */
export function normalizeText(text: string): NormalizationResult {
  if (!text) {
    return { text: "", ligaturesBefore: 0, ligaturesAfter: 0 };
  }

  const ligaturesBefore = countLigatures(text);

  // Step 1: Normalize line endings
  let result = normalizeLineBreaks(text);

  // Step 2: Rejoin hyphenated words
  result = rejoinHyphenatedWords(result);

  // Step 3: Replace ligatures
  result = replaceLigatures(result);

  // Step 4: Normalize punctuation
  result = normalizePunctuation(result);

  // Step 5: Clean up whitespace
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
} from "./ligature.ts";

export {
  rejoinHyphenatedWords,
  isValidWord,
} from "./hyphenation.ts";

export {
  normalizeWhitespace,
  collapseWhitespace,
  removeControlCharacters,
  normalizeLineBreaks,
} from "./whitespace.ts";

export {
  normalizePunctuation,
  normalizeQuotes,
  normalizeDashes,
} from "./punctuation.ts";
