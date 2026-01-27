import { describe, test, expect } from "bun:test";
import {
  normalizeUnicode,
  hasDecomposedCharacters,
  countCombiningMarks,
} from "../../../src/services/normalizer/unicode";
import { normalizeText } from "../../../src/services/normalizer";

describe("unicode normalization", () => {
  describe("normalizeUnicode", () => {
    test("normalizes decomposed é to composed form", () => {
      // U+0065 (e) + U+0301 (combining acute accent) -> U+00E9 (é)
      const decomposed = "caf\u0065\u0301"; // "café" with decomposed é
      const composed = "caf\u00E9"; // "café" with composed é

      const result = normalizeUnicode(decomposed);

      expect(result).toBe(composed);
      expect(result.length).toBe(4); // 4 characters, not 5
    });

    test("preserves already-composed characters", () => {
      const composed = "café";
      const result = normalizeUnicode(composed);

      expect(result).toBe(composed);
    });

    test("handles multiple decomposed characters", () => {
      // "naïve" with decomposed ï and "résumé" with decomposed é
      const decomposed = "nai\u0308ve re\u0301sume\u0301"; // naïve résumé
      const result = normalizeUnicode(decomposed);

      // Should be composed forms
      expect(result).toBe("naïve résumé");
      expect(result.length).toBe(12); // "naïve résumé" = 12 characters
    });

    test("handles medical terms with diacritics", () => {
      // Common medical terms that might have diacritics
      const terms = [
        { input: "cafe\u0301ine", expected: "caféine" }, // caffeine variant
        { input: "a\u0300", expected: "à" }, // grave accent
        { input: "u\u0308", expected: "ü" }, // umlaut
        { input: "n\u0303", expected: "ñ" }, // tilde
        { input: "c\u0327", expected: "ç" }, // cedilla
      ];

      for (const { input, expected } of terms) {
        expect(normalizeUnicode(input)).toBe(expected);
      }
    });

    test("handles empty string", () => {
      expect(normalizeUnicode("")).toBe("");
    });

    test("handles string with no diacritics", () => {
      const plain = "The quick brown fox";
      expect(normalizeUnicode(plain)).toBe(plain);
    });

    test("handles Greek characters", () => {
      // Greek often uses combining marks
      const text = "Ω ω α β γ";
      const result = normalizeUnicode(text);
      expect(result).toBe(text); // Already composed
    });

    test("normalizes combining ring above", () => {
      // "å" can be decomposed
      const decomposed = "a\u030A"; // a + combining ring above
      const composed = "å";

      expect(normalizeUnicode(decomposed)).toBe(composed);
    });

    test("handles mixed composed and decomposed in same string", () => {
      // "café" (composed) + " " + "naïve" (decomposed)
      const mixed = "café nai\u0308ve";
      const result = normalizeUnicode(mixed);

      expect(result).toBe("café naïve");
    });
  });

  describe("hasDecomposedCharacters", () => {
    test("returns true for decomposed characters", () => {
      const decomposed = "caf\u0065\u0301"; // café with decomposed é
      expect(hasDecomposedCharacters(decomposed)).toBe(true);
    });

    test("returns false for composed characters", () => {
      const composed = "café";
      expect(hasDecomposedCharacters(composed)).toBe(false);
    });

    test("returns false for plain ASCII", () => {
      expect(hasDecomposedCharacters("hello world")).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(hasDecomposedCharacters("")).toBe(false);
    });
  });

  describe("countCombiningMarks", () => {
    test("counts combining marks in decomposed string", () => {
      const decomposed = "caf\u0065\u0301"; // café with combining acute
      expect(countCombiningMarks(decomposed)).toBe(1);
    });

    test("returns 0 for composed string", () => {
      const composed = "café";
      expect(countCombiningMarks(composed)).toBe(0);
    });

    test("counts multiple combining marks", () => {
      // e + combining acute + combining grave (stacked marks)
      const multiMark = "e\u0301\u0300";
      expect(countCombiningMarks(multiMark)).toBe(2);
    });

    test("handles empty string", () => {
      expect(countCombiningMarks("")).toBe(0);
    });

    test("counts combining marks across words", () => {
      const text = "caf\u0301e nai\u0308ve"; // café naïve decomposed
      expect(countCombiningMarks(text)).toBe(2);
    });
  });

  describe("integration with normalizeText pipeline", () => {
    test("normalizeText applies Unicode NFC normalization", () => {
      const decomposed = "The caf\u0065\u0301 serves nai\u0308ve patients.";
      const result = normalizeText(decomposed);

      // Should be composed after normalization
      expect(result.text).toBe("The café serves naïve patients.");
      expect(result.text.length).toBe(31); // Proper length without combining marks
    });

    test("normalizeText handles empty input", () => {
      const result = normalizeText("");
      expect(result.text).toBe("");
    });

    test("normalizeText preserves composed Unicode", () => {
      const composed = "The café serves naïve patients.";
      const result = normalizeText(composed);

      expect(result.text).toBe("The café serves naïve patients.");
    });

    test("Unicode normalization happens before other normalizations", () => {
      // Text with decomposed characters and ligatures
      // Use proper decomposed form: e + combining acute
      const input = "The ﬁrst cafe\u0301";
      const result = normalizeText(input);

      // Should have both: composed é and fi ligature replaced
      expect(result.text).toBe("The first café");
    });

    test("handles medical text with diacritics", () => {
      // Simulated medical text that might have inconsistent Unicode
      const medicalText = "The cafe\u0301ine was administered to the nai\u0308ve patient.";
      const result = normalizeText(medicalText);

      expect(result.text).toBe("The caféine was administered to the naïve patient.");
    });
  });

  describe("edge cases", () => {
    test("handles Unicode beyond BMP", () => {
      // Emoji and other characters outside Basic Multilingual Plane
      const emoji = "Hello 👋 World";
      expect(normalizeUnicode(emoji)).toBe(emoji);
    });

    test("handles null-like values gracefully", () => {
      // @ts-expect-error Testing null handling
      expect(normalizeUnicode(null)).toBe("");
      // @ts-expect-error Testing undefined handling
      expect(normalizeUnicode(undefined)).toBe("");
    });

    test("handles very long strings with decomposed characters", () => {
      // Create a long string with decomposed characters throughout
      const base = "caf\u0065\u0301 ";
      const longString = base.repeat(1000);

      const result = normalizeUnicode(longString);

      // Should have consistent composed form
      expect(result).toBe("café ".repeat(1000));
    });

    test("normalizes Korean Hangul jamo", () => {
      // Hangul can also be composed/decomposed
      // This tests that NFC handles non-Latin scripts
      const text = "한글";
      const result = normalizeUnicode(text);
      expect(result).toBe(text); // Should remain unchanged if already NFC
    });
  });
});
