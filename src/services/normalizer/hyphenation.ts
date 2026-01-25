/**
 * Hyphenation normalization - rejoins words split across lines.
 * PDFs often have hard line breaks that split words with hyphens.
 */

/**
 * Common medical and anatomical terms that should be rejoined.
 * This is a simplified approach - a full dictionary would be more accurate.
 */
const MEDICAL_TERMS = new Set([
  "cerebral",
  "venous",
  "arterial",
  "superficial",
  "supratentorial",
  "infratentorial",
  "anastomoses",
  "anastomosis",
  "neurosurgical",
  "neurological",
  "hemorrhage",
  "hemorrhagic",
  "infarction",
  "embolism",
  "thrombosis",
  "aneurysm",
  "malformation",
  "hydrocephalus",
  "hemiplegia",
  "hemisphere",
  "ventricle",
  "ventricular",
  "structures",
  "cortical",
  "subcortical",
  "parietal",
  "occipital",
  "temporal",
  "frontal",
  "posterior",
  "anterior",
  "lateral",
  "medial",
  "superior",
  "inferior",
  "afferent",
  "efferent",
]);

/**
 * Common compound words that should keep their hyphens.
 */
const HYPHENATED_COMPOUNDS = new Set([
  "deep-seated",
  "well-known",
  "long-term",
  "short-term",
  "high-grade",
  "low-grade",
  "pre-operative",
  "post-operative",
  "intra-operative",
  "extra-axial",
  "intra-axial",
  "venous-arterial",
  "arterio-venous",
]);

/**
 * Pattern for hyphenated line breaks.
 * Matches: word-\n or word-\r\n followed by continuation
 */
const HYPHEN_LINEBREAK_PATTERN = /(\w+)-\r?\n(\w+)/g;

/**
 * Validates if a word looks reasonable (basic heuristic).
 */
export function isValidWord(word: string): boolean {
  if (!word || word.length < 2) return false;

  // Check against known terms
  if (MEDICAL_TERMS.has(word.toLowerCase())) return true;

  // Basic heuristic: contains vowels and reasonable length
  const hasVowel = /[aeiou]/i.test(word);
  const reasonableLength = word.length >= 3 && word.length <= 30;
  const noWeirdChars = /^[a-zA-Z]+$/.test(word);

  return hasVowel && reasonableLength && noWeirdChars;
}

/**
 * Rejoins words that were hyphenated across line breaks.
 */
export function rejoinHyphenatedWords(text: string): string {
  if (!text) return text;

  return text.replace(HYPHEN_LINEBREAK_PATTERN, (match, before, after) => {
    const combined = before + after;
    const hyphenated = `${before}-${after}`;

    // Check if this is a known compound word that should keep the hyphen
    if (HYPHENATED_COMPOUNDS.has(hyphenated.toLowerCase())) {
      return hyphenated;
    }

    // Check if the combined word looks valid
    if (isValidWord(combined)) {
      return combined;
    }

    // If neither looks right, assume it's a compound and keep hyphen
    if (isValidWord(before) && isValidWord(after)) {
      return hyphenated;
    }

    // Default to joining without hyphen
    return combined;
  });
}
