/**
 * Protected abbreviations that should not be treated as sentence endings.
 * These are common in medical/scientific text.
 */
export const PROTECTED_ABBREVIATIONS = [
  "Fig.",
  "Dr.",
  "Mr.",
  "Mrs.",
  "Ms.",
  "Prof.",
  "Sr.",
  "Jr.",
  "No.",
  "Vol.",
  "vs.",
  "etc.",
  "i.e.",
  "e.g.",
  "et al.",
  "cf.",
  "ca.",
  "approx.",
];

// Placeholder token for protected abbreviations
const PLACEHOLDER_PREFIX = "\u0000ABBR";

/**
 * Splits text into sentences, protecting common abbreviations.
 *
 * Algorithm:
 * 1. Replace protected abbreviations with placeholders
 * 2. Split on sentence-ending punctuation followed by space and capital letter
 * 3. Restore placeholders to original abbreviations
 *
 * @param text - The text to split into sentences
 * @returns Array of sentences (empty array for empty string)
 */
export function splitSentences(text: string): string[] {
  if (!text || text.trim() === "") {
    return [];
  }

  let processed = text;
  const placeholderMap = new Map<string, string>();

  // Step 1: Replace protected abbreviations with placeholders
  PROTECTED_ABBREVIATIONS.forEach((abbr, index) => {
    const placeholder = `${PLACEHOLDER_PREFIX}${index}\u0000`;
    placeholderMap.set(placeholder, abbr);
    // Use case-insensitive replacement for abbreviations
    const regex = new RegExp(escapeRegExp(abbr), "gi");
    processed = processed.replace(regex, placeholder);
  });

  // Step 2: Also protect decimal numbers (e.g., 3.14)
  const decimalRegex = /(\d+)\.(\d+)/g;
  processed = processed.replace(decimalRegex, `$1${PLACEHOLDER_PREFIX}DEC\u0000$2`);

  // Step 3: Split on sentence-ending punctuation
  // Match: . or ? or ! followed by space(s) and a capital letter
  const sentenceRegex = /([.!?])\s+(?=[A-Z])/g;

  const parts = processed.split(sentenceRegex);

  // Recombine parts (split captures the delimiter separately)
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    let sentence = parts[i];
    // Add the punctuation back if it exists
    if (i + 1 < parts.length) {
      sentence += parts[i + 1];
    }
    sentence = sentence.trim();
    if (sentence) {
      sentences.push(sentence);
    }
  }

  // Step 4: Restore placeholders
  const restored = sentences.map(sentence => {
    let result = sentence;
    // Restore abbreviations
    placeholderMap.forEach((original, placeholder) => {
      result = result.split(placeholder).join(original);
    });
    // Restore decimal numbers
    result = result.replace(new RegExp(`${PLACEHOLDER_PREFIX}DEC\u0000`, "g"), ".");
    return result;
  });

  return restored;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get the last N sentences from text.
 * Used for generating chunk overlap.
 */
export function getLastSentences(text: string, count: number): string[] {
  const sentences = splitSentences(text);
  return sentences.slice(-count);
}
