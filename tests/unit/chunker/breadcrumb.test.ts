import { describe, test, expect } from "bun:test";
import {
  buildHeaderIndex,
  resolveBreadcrumb,
  formatBreadcrumb,
} from "../../../src/services/chunker/breadcrumb";
import { estimateTokens } from "../../../src/services/chunker/tokenizer";
import { CHUNKING_LIMITS } from "../../../src/config/chunking";

describe("breadcrumb", () => {
  // Sample document structure for testing
  const mockDocument = {
    pages: [
      {
        page_number: 1,
        blocks: [
          { id: "/page/1/SectionHeader/1", block_type: "section_header", content: "THE CEREBRAL VEINS" },
          { id: "/page/1/SectionHeader/2", block_type: "section_header", content: "SUPERFICIAL VEINS" },
          { id: "/page/1/Text/3", block_type: "text", content: "Some text..." },
        ],
      },
    ],
  };

  describe("buildHeaderIndex", () => {
    test("builds map of block IDs to header text", () => {
      const index = buildHeaderIndex(mockDocument as any);
      expect(index.get("/page/1/SectionHeader/1")).toBe("THE CEREBRAL VEINS");
      expect(index.get("/page/1/SectionHeader/2")).toBe("SUPERFICIAL VEINS");
    });

    test("excludes non-header blocks", () => {
      const index = buildHeaderIndex(mockDocument as any);
      expect(index.has("/page/1/Text/3")).toBe(false);
    });
  });

  describe("resolveBreadcrumb", () => {
    test("resolves single block ID to label", () => {
      const index = new Map([["/page/1/SectionHeader/1", "THE CEREBRAL VEINS"]]);
      const labels = resolveBreadcrumb(["/page/1/SectionHeader/1"], index);
      expect(labels).toEqual(["THE CEREBRAL VEINS"]);
    });

    test("resolves multiple block IDs to hierarchy", () => {
      const index = new Map([
        ["/page/1/SectionHeader/1", "THE CEREBRAL VEINS"],
        ["/page/1/SectionHeader/2", "SUPERFICIAL VEINS"],
      ]);
      const labels = resolveBreadcrumb(
        ["/page/1/SectionHeader/1", "/page/1/SectionHeader/2"],
        index
      );
      expect(labels).toEqual(["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"]);
    });

    test("skips unresolved block IDs", () => {
      const index = new Map([["/page/1/SectionHeader/1", "THE CEREBRAL VEINS"]]);
      const labels = resolveBreadcrumb(
        ["/page/1/SectionHeader/1", "/page/99/Unknown/1"],
        index
      );
      expect(labels).toEqual(["THE CEREBRAL VEINS"]);
    });

    test("returns empty array for empty hierarchy", () => {
      const index = new Map();
      const labels = resolveBreadcrumb([], index);
      expect(labels).toEqual([]);
    });
  });

  describe("formatBreadcrumb", () => {
    test("formats single label", () => {
      expect(formatBreadcrumb(["THE CEREBRAL VEINS"])).toBe(
        "[Context: THE CEREBRAL VEINS]"
      );
    });

    test("formats multiple labels with separator", () => {
      expect(formatBreadcrumb(["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"])).toBe(
        "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS]"
      );
    });

    test("formats empty labels as Document Root", () => {
      expect(formatBreadcrumb([])).toBe("[Context: Document Root]");
    });
  });

  describe("Deep nesting edge cases (Issue #218)", () => {
    /**
     * Tests for very deep section nesting (10+ levels) to ensure:
     * 1. Breadcrumb generation doesn't break
     * 2. Token overhead remains reasonable
     * 3. Adequate content space remains in chunks (>400 of 512 tokens)
     *
     * Token budget analysis:
     * - Target chunk size: 512 tokens (MAX_TOKENS)
     * - Minimum content space goal: ~400 tokens (78% of budget)
     * - Maximum acceptable breadcrumb overhead: ~100 tokens (20% of budget)
     */

    // Helper to create hierarchy of N levels with consistent naming
    function createDeepHierarchy(depth: number, labelPrefix = "Section"): string[] {
      return Array.from({ length: depth }, (_, i) => `${labelPrefix} ${i + 1}`);
    }

    // Helper to create deep hierarchy with realistic medical section names
    function createMedicalHierarchy(depth: number): string[] {
      const names = [
        "THE CEREBRAL VEINS",
        "SUPERFICIAL VEINS",
        "Superior Group",
        "Lateral Surface",
        "Frontal Region",
        "Motor Cortex Area",
        "Precentral Gyrus",
        "Venous Drainage",
        "Anastomotic Channels",
        "Trolard's Vein",
        "Anterior Branch",
        "Terminal Portion",
      ];
      return names.slice(0, Math.min(depth, names.length));
    }

    describe("breadcrumb generation stability", () => {
      test("handles 10-level nesting without error", () => {
        const labels = createDeepHierarchy(10);
        const breadcrumb = formatBreadcrumb(labels);

        expect(breadcrumb).toContain("[Context:");
        expect(breadcrumb).toContain("Section 1");
        expect(breadcrumb).toContain("Section 10");
        expect(breadcrumb.split(" > ").length).toBe(10);
      });

      test("handles 12-level nesting without error", () => {
        const labels = createDeepHierarchy(12);
        const breadcrumb = formatBreadcrumb(labels);

        expect(breadcrumb).toContain("[Context:");
        expect(breadcrumb.split(" > ").length).toBe(12);
      });

      test("handles 20-level nesting (extreme case)", () => {
        const labels = createDeepHierarchy(20);
        const breadcrumb = formatBreadcrumb(labels);

        expect(breadcrumb).toContain("[Context:");
        expect(breadcrumb.split(" > ").length).toBe(20);
      });

      test("handles realistic 12-level medical hierarchy", () => {
        const labels = createMedicalHierarchy(12);
        const breadcrumb = formatBreadcrumb(labels);

        expect(breadcrumb).toContain("THE CEREBRAL VEINS");
        expect(breadcrumb).toContain("Terminal Portion");
      });
    });

    describe("token budget impact", () => {
      /**
       * Token estimation: Math.ceil(text.length / 4)
       *
       * Breadcrumb format: "[Context: Label1 > Label2 > ...]"
       * - Fixed overhead: "[Context: " (10 chars) + "]" (1 char) = 11 chars = ~3 tokens
       * - Per-level overhead: " > " (3 chars) = ~1 token per separator
       * - Label tokens: depends on label length
       */

      test("calculates token overhead for 3-level nesting (typical)", () => {
        const labels = ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS", "Superior Group"];
        const breadcrumb = formatBreadcrumb(labels);
        const tokens = estimateTokens(breadcrumb);

        // Expected: "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS > Superior Group]"
        // Length: ~70 chars = ~18 tokens
        expect(tokens).toBeLessThan(25);
        expect(tokens).toBeGreaterThan(10);
      });

      test("calculates token overhead for 6-level nesting", () => {
        const labels = createMedicalHierarchy(6);
        const breadcrumb = formatBreadcrumb(labels);
        const tokens = estimateTokens(breadcrumb);

        // 6 levels with realistic names should be ~35-50 tokens
        expect(tokens).toBeLessThan(60);
      });

      test("calculates token overhead for 10-level nesting", () => {
        const labels = createMedicalHierarchy(10);
        const breadcrumb = formatBreadcrumb(labels);
        const tokens = estimateTokens(breadcrumb);

        // 10 levels with realistic names
        expect(tokens).toBeLessThan(100);
      });

      test("calculates token overhead for 12-level nesting", () => {
        const labels = createMedicalHierarchy(12);
        const breadcrumb = formatBreadcrumb(labels);
        const tokens = estimateTokens(breadcrumb);

        // Document the actual overhead for 12 levels
        // This helps future developers understand the budget impact
        expect(tokens).toBeLessThan(120);
      });

      test("token overhead scales linearly with depth", () => {
        const tokens3 = estimateTokens(formatBreadcrumb(createDeepHierarchy(3)));
        const tokens6 = estimateTokens(formatBreadcrumb(createDeepHierarchy(6)));
        const tokens9 = estimateTokens(formatBreadcrumb(createDeepHierarchy(9)));

        // Verify roughly linear scaling (within 30% tolerance)
        const rate3to6 = (tokens6 - tokens3) / 3;
        const rate6to9 = (tokens9 - tokens6) / 3;

        expect(Math.abs(rate3to6 - rate6to9)).toBeLessThan(rate3to6 * 0.3);
      });
    });

    describe("content space verification", () => {
      const TARGET_TOKENS = CHUNKING_LIMITS.MAX_TOKENS; // 512
      const MIN_CONTENT_TOKENS = 400; // ~78% of budget for actual content

      test("3-level nesting leaves adequate content space", () => {
        const labels = createMedicalHierarchy(3);
        const breadcrumb = formatBreadcrumb(labels);
        const overhead = estimateTokens(breadcrumb);
        const availableContent = TARGET_TOKENS - overhead;

        expect(availableContent).toBeGreaterThan(MIN_CONTENT_TOKENS);
      });

      test("6-level nesting leaves adequate content space", () => {
        const labels = createMedicalHierarchy(6);
        const breadcrumb = formatBreadcrumb(labels);
        const overhead = estimateTokens(breadcrumb);
        const availableContent = TARGET_TOKENS - overhead;

        expect(availableContent).toBeGreaterThan(MIN_CONTENT_TOKENS);
      });

      test("10-level nesting leaves adequate content space", () => {
        const labels = createMedicalHierarchy(10);
        const breadcrumb = formatBreadcrumb(labels);
        const overhead = estimateTokens(breadcrumb);
        const availableContent = TARGET_TOKENS - overhead;

        // At 10 levels, we may have reduced content space but still viable
        expect(availableContent).toBeGreaterThan(350); // Slightly relaxed for deep nesting
      });

      test("12-level nesting still allows meaningful content", () => {
        const labels = createMedicalHierarchy(12);
        const breadcrumb = formatBreadcrumb(labels);
        const overhead = estimateTokens(breadcrumb);
        const availableContent = TARGET_TOKENS - overhead;

        // Document the available space at maximum practical depth
        // Should still have >300 tokens for content
        expect(availableContent).toBeGreaterThan(300);
      });
    });

    describe("very long section names", () => {
      test("handles long labels at each level (50 chars each)", () => {
        const longLabel = "A".repeat(50); // 50 char label
        const labels = Array.from({ length: 5 }, () => longLabel);
        const breadcrumb = formatBreadcrumb(labels);

        // Should not throw
        expect(breadcrumb).toContain("[Context:");

        // Calculate token overhead
        const tokens = estimateTokens(breadcrumb);
        // 5 x 50 char labels + separators + wrapper = ~275 chars = ~69 tokens
        expect(tokens).toBeLessThan(100);
      });

      test("handles extremely long labels (100 chars) at multiple levels", () => {
        const veryLongLabel = "B".repeat(100); // 100 char label
        const labels = Array.from({ length: 3 }, () => veryLongLabel);
        const breadcrumb = formatBreadcrumb(labels);

        // Should not throw
        expect(breadcrumb).toContain("[Context:");

        const tokens = estimateTokens(breadcrumb);
        // This will be significant: ~315 chars = ~79 tokens
        expect(tokens).toBeLessThan(120);
      });

      test("worst case: 10 levels x 50 char labels consumes significant budget", () => {
        const longLabel = "C".repeat(50);
        const labels = Array.from({ length: 10 }, () => longLabel);
        const breadcrumb = formatBreadcrumb(labels);
        const tokens = estimateTokens(breadcrumb);

        // Document the worst realistic case
        // 10 x 50 chars + 9 x 3 chars (separators) + 11 chars (wrapper) = ~538 chars = ~135 tokens
        // This is 26% of the 512 token budget
        expect(tokens).toBeLessThan(150);

        const availableContent = CHUNKING_LIMITS.MAX_TOKENS - tokens;
        // Even worst case should leave >350 tokens for content
        expect(availableContent).toBeGreaterThan(350);
      });

      test("mixed long and short labels work correctly", () => {
        const labels = [
          "Short",
          "A very long section name that could appear in medical texts",
          "Medium length name",
          "X".repeat(80), // Very long
          "End",
        ];
        const breadcrumb = formatBreadcrumb(labels);

        expect(breadcrumb).toContain("Short");
        expect(breadcrumb).toContain("End");
        expect(breadcrumb.split(" > ").length).toBe(5);
      });
    });

    describe("documentation of limits (informational)", () => {
      /**
       * These tests document the practical limits of breadcrumb nesting.
       * They are informational and help future developers understand
       * the trade-offs involved.
       */

      test("documents token overhead at various depths", () => {
        const overheadByDepth: Record<number, number> = {};

        for (const depth of [1, 3, 5, 7, 10, 12, 15]) {
          const labels = createMedicalHierarchy(Math.min(depth, 12));
          // Pad with generic names if needed
          while (labels.length < depth) {
            labels.push(`Level ${labels.length + 1}`);
          }
          overheadByDepth[depth] = estimateTokens(formatBreadcrumb(labels));
        }

        // Document observed values (these are informational assertions)
        expect(overheadByDepth[1]).toBeLessThan(15); // Single level: ~5-10 tokens
        expect(overheadByDepth[3]).toBeLessThan(30); // 3 levels: ~15-25 tokens
        expect(overheadByDepth[5]).toBeLessThan(50); // 5 levels: ~30-40 tokens
        expect(overheadByDepth[10]).toBeLessThan(100); // 10 levels: ~65-80 tokens
        expect(overheadByDepth[12]).toBeLessThan(120); // 12 levels: ~80-100 tokens
      });

      test("practical depth limit recommendation: 10 levels", () => {
        /**
         * RECOMMENDATION: Keep nesting depth <= 10 levels
         *
         * Rationale:
         * - 10 levels with typical names uses ~65-80 tokens (~15% of budget)
         * - Leaves ~430-450 tokens for content (84-88% of budget)
         * - Deeper nesting is rare in medical literature
         * - Beyond 10 levels, consider flattening the hierarchy
         */
        const labels = createMedicalHierarchy(10);
        const breadcrumb = formatBreadcrumb(labels);
        const tokens = estimateTokens(breadcrumb);

        // 10 levels should use < 20% of token budget
        const budgetPercentage = (tokens / CHUNKING_LIMITS.MAX_TOKENS) * 100;
        expect(budgetPercentage).toBeLessThan(20);
      });
    });
  });
});
