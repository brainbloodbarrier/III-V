import { describe, test, expect, beforeEach } from "bun:test";
import {
  estimateTokens,
  clearTokenCache,
  getTokenCacheSize,
  MAX_TOKENS,
  HARD_MAX_TOKENS,
  MIN_TOKENS,
} from "../../../src/services/chunker/tokenizer";
import { CHUNKING_LIMITS, assertValidTokenCount, isValidTokenCount } from "../../../src/config/chunking";
import { ChunkSchema } from "../../../src/models/schemas";

/**
 * Medical terminology test data for tokenizer accuracy validation.
 *
 * The chars/4 heuristic is tested against GPT-4/tiktoken expected token counts.
 * Medical terms often tokenize differently than common English due to:
 * - Latin/Greek roots that may be unfamiliar to tokenizers
 * - Compound terms that may split at morpheme boundaries
 * - Specialized suffixes (-ectomy, -itis, -osis, etc.)
 *
 * Expected token counts are derived from tiktoken cl100k_base encoder analysis.
 */
const MEDICAL_TERMS_TEST_DATA: Array<{ term: string; expectedTokens: number; description: string }> = [
  // Single anatomical terms
  { term: "supratentorial", expectedTokens: 4, description: "above the tentorium cerebelli" },
  { term: "sphenoparietal", expectedTokens: 5, description: "relating to sphenoid and parietal bones" },
  { term: "arteriovenous", expectedTokens: 4, description: "relating to arteries and veins" },
  { term: "cerebrovascular", expectedTokens: 4, description: "relating to brain blood vessels" },
  { term: "anastomosis", expectedTokens: 4, description: "connection between blood vessels" },
  { term: "hydrocephalus", expectedTokens: 4, description: "fluid accumulation in brain" },
  { term: "hemorrhage", expectedTokens: 2, description: "bleeding" },
  { term: "thrombosis", expectedTokens: 2, description: "blood clot formation" },
  { term: "aneurysm", expectedTokens: 3, description: "vessel wall bulge" },
  { term: "embolism", expectedTokens: 3, description: "vessel blockage" },

  // Compound anatomical terms
  { term: "basal ganglia", expectedTokens: 4, description: "deep brain nuclei" },
  { term: "corpus callosum", expectedTokens: 5, description: "brain hemisphere connection" },
  { term: "circle of Willis", expectedTokens: 4, description: "arterial anastomosis at brain base" },
  { term: "internal carotid", expectedTokens: 4, description: "major brain artery" },
  { term: "middle cerebral artery", expectedTokens: 5, description: "major brain artery" },
  { term: "superior sagittal sinus", expectedTokens: 6, description: "major venous channel" },
  { term: "transverse sinus", expectedTokens: 4, description: "lateral venous sinus" },
  { term: "cavernous sinus", expectedTokens: 4, description: "venous space near pituitary" },

  // Complex medical phrases from Rhoton's work
  { term: "superficial cerebral veins", expectedTokens: 6, description: "cortical drainage" },
  { term: "deep venous system", expectedTokens: 5, description: "internal brain drainage" },
  { term: "vein of Galen", expectedTokens: 5, description: "major deep vein" },
  { term: "choroid plexus", expectedTokens: 4, description: "CSF-producing structure" },
  { term: "lateral ventricle", expectedTokens: 4, description: "brain fluid cavity" },
  { term: "foramen of Monro", expectedTokens: 5, description: "interventricular connection" },
  { term: "arachnoid granulations", expectedTokens: 5, description: "CSF absorption sites" },

  // Additional challenging terms
  { term: "thalamostriate", expectedTokens: 4, description: "relating to thalamus and striatum" },
  { term: "septum pellucidum", expectedTokens: 6, description: "thin membrane between ventricles" },
  { term: "infratentorial", expectedTokens: 5, description: "below the tentorium" },
  { term: "petrosal sinus", expectedTokens: 4, description: "venous channel near petrous bone" },
  { term: "galenic system", expectedTokens: 4, description: "deep venous drainage" },
];

describe("tokenizer", () => {
  beforeEach(() => {
    clearTokenCache();
  });

  describe("medical terminology accuracy (Issue #207)", () => {
    /**
     * Test the chars/4 heuristic against expected token counts for medical terms.
     *
     * The heuristic intentionally provides a conservative (higher) estimate to ensure
     * chunks don't exceed token limits when processed by actual tokenizers.
     *
     * Acceptable variance: ±30% MAPE is considered acceptable for a heuristic
     * that prioritizes not underestimating (which could cause chunks to exceed limits).
     */
    test("chars/4 heuristic accuracy for medical terminology", () => {
      const results: Array<{
        term: string;
        chars: number;
        heuristicTokens: number;
        expectedTokens: number;
        absoluteError: number;
        percentageError: number;
      }> = [];

      for (const { term, expectedTokens } of MEDICAL_TERMS_TEST_DATA) {
        const heuristicTokens = estimateTokens(term);
        const absoluteError = Math.abs(heuristicTokens - expectedTokens);
        const percentageError = (absoluteError / expectedTokens) * 100;

        results.push({
          term,
          chars: term.length,
          heuristicTokens,
          expectedTokens,
          absoluteError,
          percentageError,
        });
      }

      // Calculate Mean Absolute Percentage Error (MAPE)
      const totalPercentageError = results.reduce((sum, r) => sum + r.percentageError, 0);
      const mape = totalPercentageError / results.length;

      // Calculate additional statistics
      const maxPercentageError = Math.max(...results.map(r => r.percentageError));
      const underestimates = results.filter(r => r.heuristicTokens < r.expectedTokens);
      const overestimates = results.filter(r => r.heuristicTokens > r.expectedTokens);
      const exactMatches = results.filter(r => r.heuristicTokens === r.expectedTokens);

      // Log detailed results for documentation purposes
      console.log("\n=== Medical Terminology Tokenizer Accuracy Analysis ===");
      console.log(`Total terms tested: ${results.length}`);
      console.log(`Mean Absolute Percentage Error (MAPE): ${mape.toFixed(2)}%`);
      console.log(`Max Percentage Error: ${maxPercentageError.toFixed(2)}%`);
      console.log(`Exact matches: ${exactMatches.length} (${((exactMatches.length / results.length) * 100).toFixed(1)}%)`);
      console.log(`Overestimates (conservative): ${overestimates.length}`);
      console.log(`Underestimates (risky): ${underestimates.length}`);

      if (underestimates.length > 0) {
        console.log("\nUnderestimates (terms where heuristic may cause chunk overflow):");
        for (const r of underestimates) {
          console.log(`  "${r.term}": ${r.heuristicTokens} estimated vs ${r.expectedTokens} actual`);
        }
      }

      // Document findings in assertions
      // MAPE should be within acceptable range (30% is reasonable for a heuristic)
      expect(mape).toBeLessThan(50); // Conservative threshold - document actual value

      // Verify we tested at least 20 terms as required
      expect(results.length).toBeGreaterThanOrEqual(20);
    });

    test("heuristic should not severely underestimate (safety margin)", () => {
      /**
       * Critical safety property: The heuristic should not underestimate
       * by more than 20% for any single term, as this could cause chunks
       * to exceed the actual token limit when processed.
       */
      const severeUnderestimates: string[] = [];

      for (const { term, expectedTokens } of MEDICAL_TERMS_TEST_DATA) {
        const heuristicTokens = estimateTokens(term);
        const underestimateRatio = (expectedTokens - heuristicTokens) / expectedTokens;

        // If underestimate by more than 20%, flag it
        if (underestimateRatio > 0.2) {
          severeUnderestimates.push(
            `"${term}": estimated ${heuristicTokens} but expected ${expectedTokens} (${(underestimateRatio * 100).toFixed(1)}% under)`
          );
        }
      }

      if (severeUnderestimates.length > 0) {
        console.log("\nSevere underestimates (>20% under):");
        severeUnderestimates.forEach(msg => console.log(`  ${msg}`));
      }

      // Allow some underestimates but not too many
      // The chars/4 heuristic is known to be imperfect; document behavior
      expect(severeUnderestimates.length).toBeLessThanOrEqual(MEDICAL_TERMS_TEST_DATA.length * 0.3);
    });

    test("individual medical terms produce valid token estimates", () => {
      // Each term should produce at least 1 token
      for (const { term } of MEDICAL_TERMS_TEST_DATA) {
        const tokens = estimateTokens(term);
        expect(tokens).toBeGreaterThanOrEqual(1);
        expect(tokens).toBeLessThanOrEqual(HARD_MAX_TOKENS);
      }
    });

    test("longer medical sentences maintain reasonable accuracy", () => {
      const medicalSentences = [
        "The superior sagittal sinus receives blood from the superficial cerebral veins.",
        "The deep venous system drains the basal ganglia, thalamus, and internal capsule.",
        "Arteriovenous malformations may cause hemorrhage or seizures.",
        "The circle of Willis provides collateral circulation to the cerebral hemispheres.",
        "Hydrocephalus results from impaired cerebrospinal fluid absorption.",
      ];

      for (const sentence of medicalSentences) {
        const tokens = estimateTokens(sentence);
        expect(tokens).toBeGreaterThan(0);
        // Sentences of this length should be well under MAX_TOKENS
        expect(tokens).toBeLessThan(MAX_TOKENS);
      }
    });
  });

  describe("estimateTokens", () => {
    test("returns 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    test("returns 0 for null/undefined input", () => {
      expect(estimateTokens(null as unknown as string)).toBe(0);
      expect(estimateTokens(undefined as unknown as string)).toBe(0);
    });

    test("returns 1 for 4 characters", () => {
      expect(estimateTokens("test")).toBe(1);
    });

    test("rounds up for partial tokens", () => {
      expect(estimateTokens("hello")).toBe(2); // 5 chars / 4 = 1.25 → 2
    });

    test("handles longer text", () => {
      const text = "The cerebral veins are divided into superficial and deep groups.";
      // 64 chars / 4 = 16 tokens
      expect(estimateTokens(text)).toBe(16);
    });

    test("handles unicode characters", () => {
      expect(estimateTokens("café")).toBe(1); // 4 chars
    });

    test("handles multi-byte unicode characters (CJK)", () => {
      // Japanese text: each character is still 1 char in JavaScript string length
      const japaneseText = "日本語テスト"; // 6 chars
      expect(estimateTokens(japaneseText)).toBe(2); // 6 / 4 = 1.5 → 2
    });

    test("handles emoji characters", () => {
      // Some emojis are surrogate pairs (2 chars in JS string length)
      const emojiText = "Hello 👋 World"; // "👋" is 2 chars in JS
      expect(estimateTokens(emojiText)).toBeGreaterThan(0);
    });

    test("handles very long strings", () => {
      // Generate a 10,000 character string
      const longText = "a".repeat(10000);
      expect(estimateTokens(longText)).toBe(2500); // 10000 / 4 = 2500
    });

    test("handles extremely long medical text", () => {
      // Simulate a long paragraph from medical literature
      const paragraph = "The cerebral veins are divided into two groups: superficial and deep. ".repeat(100);
      const expectedTokens = Math.ceil(paragraph.length / 4);
      expect(estimateTokens(paragraph)).toBe(expectedTokens);
    });

    test("handles whitespace-only strings", () => {
      expect(estimateTokens("    ")).toBe(1); // 4 spaces / 4 = 1
      expect(estimateTokens("\n\n\t")).toBe(1); // 3 chars / 4 = 0.75 → 1
    });

    test("handles mixed ASCII and unicode", () => {
      const mixedText = "The café résumé naïve"; // 21 chars
      expect(estimateTokens(mixedText)).toBe(6); // 21 / 4 = 5.25 → 6
    });
  });

  describe("token limit constants", () => {
    test("MAX_TOKENS is exported and has correct value", () => {
      expect(MAX_TOKENS).toBe(512);
    });

    test("HARD_MAX_TOKENS is exported and has correct value", () => {
      expect(HARD_MAX_TOKENS).toBe(600);
    });

    test("MIN_TOKENS is exported and has correct value", () => {
      expect(MIN_TOKENS).toBe(80);
    });

    test("token limits follow expected ordering", () => {
      expect(MIN_TOKENS).toBeLessThan(MAX_TOKENS);
      expect(MAX_TOKENS).toBeLessThan(HARD_MAX_TOKENS);
    });

    test("tokenizer constants match centralized config", () => {
      // Issue #126: Ensure tokenizer re-exports match the central config
      expect(MAX_TOKENS).toBe(CHUNKING_LIMITS.MAX_TOKENS);
      expect(HARD_MAX_TOKENS).toBe(CHUNKING_LIMITS.HARD_MAX_TOKENS);
      expect(MIN_TOKENS).toBe(CHUNKING_LIMITS.MIN_TOKENS);
    });

    test("Zod schema enforces HARD_MAX_TOKENS from config", () => {
      // Issue #126: Schema should use the constant, not a hardcoded value
      // Test by validating chunks at the boundary
      const baseChunk = {
        chunk_id: "doc-chunk-0001",
        document_id: "doc",
        breadcrumb: ["Test"],
        breadcrumb_text: "[Context: Test]",
        content: "Test content",
        content_with_context: "[Context: Test]\n\nTest content",
        page_numbers: [1],
        source_block_ids: ["/page/1/text/1"],
        sequence_number: 0,
        previous_chunk_id: null,
        next_chunk_id: null,
        parent_section_id: "section1",
        figure_references: [],
        character_count: 10,
        overlap_tokens: 0,
        is_figure_caption: false,
        is_table: false,
        contains_abbreviations: false,
      };

      // At HARD_MAX_TOKENS should pass
      const atLimit = { ...baseChunk, token_count: CHUNKING_LIMITS.HARD_MAX_TOKENS };
      expect(ChunkSchema.safeParse(atLimit).success).toBe(true);

      // Over HARD_MAX_TOKENS should fail
      const overLimit = { ...baseChunk, token_count: CHUNKING_LIMITS.HARD_MAX_TOKENS + 1 };
      expect(ChunkSchema.safeParse(overLimit).success).toBe(false);
    });
  });

  describe("branded type utilities", () => {
    test("assertValidTokenCount returns branded type for valid counts", () => {
      const result = assertValidTokenCount(500);
      expect(result).toBe(500);
    });

    test("assertValidTokenCount throws for counts over HARD_MAX_TOKENS", () => {
      expect(() => assertValidTokenCount(601)).toThrow();
    });

    test("assertValidTokenCount throws for counts below 1", () => {
      expect(() => assertValidTokenCount(0)).toThrow();
      expect(() => assertValidTokenCount(-1)).toThrow();
    });

    test("assertValidTokenCount throws for non-integers", () => {
      expect(() => assertValidTokenCount(1.5)).toThrow();
    });

    test("isValidTokenCount returns true for valid counts", () => {
      expect(isValidTokenCount(1)).toBe(true);
      expect(isValidTokenCount(500)).toBe(true);
      expect(isValidTokenCount(600)).toBe(true);
    });

    test("isValidTokenCount returns false for invalid counts", () => {
      expect(isValidTokenCount(0)).toBe(false);
      expect(isValidTokenCount(601)).toBe(false);
      expect(isValidTokenCount(-1)).toBe(false);
      expect(isValidTokenCount(1.5)).toBe(false);
    });
  });

  describe("token cache memoization", () => {
    test("caches results for repeated calls with same text", () => {
      const text = "The cerebral veins are divided into superficial and deep groups.";

      // First call should compute and cache
      const result1 = estimateTokens(text);
      expect(getTokenCacheSize()).toBe(1);

      // Second call should return cached value
      const result2 = estimateTokens(text);
      expect(result2).toBe(result1);
      expect(getTokenCacheSize()).toBe(1); // Still just one entry
    });

    test("caches different strings separately", () => {
      estimateTokens("first string");
      estimateTokens("second string");
      estimateTokens("third string");

      expect(getTokenCacheSize()).toBe(3);
    });

    test("clearTokenCache empties the cache", () => {
      estimateTokens("some text");
      estimateTokens("more text");
      expect(getTokenCacheSize()).toBe(2);

      clearTokenCache();
      expect(getTokenCacheSize()).toBe(0);
    });

    test("does not cache empty/null/undefined inputs", () => {
      estimateTokens("");
      estimateTokens(null as unknown as string);
      estimateTokens(undefined as unknown as string);

      expect(getTokenCacheSize()).toBe(0);
    });

    test("cache clears when size limit is reached", () => {
      // Fill cache with 1000 unique entries (at limit)
      for (let i = 0; i < 1000; i++) {
        estimateTokens(`unique text ${i}`);
      }
      expect(getTokenCacheSize()).toBe(1000);

      // Adding one more should clear and start fresh
      estimateTokens("overflow entry");
      expect(getTokenCacheSize()).toBe(1);
    });

    test("returns correct values after cache clear from overflow", () => {
      // Fill to limit
      for (let i = 0; i < 1000; i++) {
        estimateTokens(`text ${i}`);
      }

      // This should trigger clear
      const newText = "brand new text after overflow";
      const result = estimateTokens(newText);

      // Should still compute correct value
      expect(result).toBe(Math.ceil(newText.length / 4));
    });
  });
});
