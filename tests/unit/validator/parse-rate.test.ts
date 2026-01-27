/**
 * Tests for parse rate validator.
 * Ensures 100% of source blocks are represented in output.
 */

import { describe, it, expect } from "bun:test";
import { validateParseRate, type ParseRateInput } from "../../../src/services/validator/parse-rate.ts";

describe("Parse Rate Validator", () => {
  describe("validateParseRate", () => {
    describe("passing cases", () => {
      it("should pass when output equals source (100%)", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 100,
          outputBlockCount: 100,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(100);
        expect(result.name).toBe("Parse Rate");
        expect(result.threshold).toBe("100%");
      });

      it("should pass when output exceeds source (>100%)", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 100,
          outputBlockCount: 150,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(150);
      });

      it("should pass at exactly 100%", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 50,
          outputBlockCount: 50,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(100);
      });
    });

    describe("failing cases", () => {
      it("should fail when output is less than source (<100%)", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 100,
          outputBlockCount: 99,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(99);
      });

      it("should fail at 50% rate", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 100,
          outputBlockCount: 50,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(50);
      });

      it("should fail when output is zero", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 100,
          outputBlockCount: 0,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(0);
      });
    });

    describe("edge cases", () => {
      it("should return 0% rate when source is zero", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 0,
          outputBlockCount: 0,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(0);
      });

      it("should handle very large numbers", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 1000000,
          outputBlockCount: 1000000,
        };
        const result = validateParseRate(input);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(100);
      });

      it("should round actual percentage to 2 decimal places", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 3,
          outputBlockCount: 1,
        };
        const result = validateParseRate(input);

        // 1/3 = 33.333... should round to 33.33
        expect(result.actual).toBe(33.33);
      });
    });

    describe("details field", () => {
      it("should include block count details", () => {
        const input: ParseRateInput = {
          sourceBlockCount: 100,
          outputBlockCount: 95,
        };
        const result = validateParseRate(input);

        expect(result.details).toContain("95/100 blocks");
        expect(result.details).toContain("95.0%");
      });
    });
  });
});
