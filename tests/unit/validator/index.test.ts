/**
 * Tests for main validator module (index.ts).
 * Tests the runValidation orchestration function.
 */

import { describe, it, expect } from "bun:test";
import {
  runValidation,
  type ValidationInput,
} from "../../../src/services/validator/index.ts";

describe("Validator Module", () => {
  describe("runValidation", () => {
    const createValidInput = (overrides?: Partial<ValidationInput>): ValidationInput => ({
      documentId: "test-doc",
      parseRateInput: {
        sourceBlockCount: 100,
        outputBlockCount: 100,
      },
      ligatureCount: 0,
      figureCoverage: 95,
      ...overrides,
    });

    describe("overall pass", () => {
      it("should pass when all gates pass", () => {
        const input = createValidInput();
        const result = runValidation(input);

        expect(result.overall_status).toBe("pass");
        expect(result.gates.parse_rate.status).toBe("pass");
        expect(result.gates.ligature_count.status).toBe("pass");
        expect(result.gates.figure_coverage.status).toBe("pass");
        expect(result.failures).toBeUndefined();
      });

      it("should include document_id in report", () => {
        const input = createValidInput({ documentId: "my-custom-doc-123" });
        const result = runValidation(input);

        expect(result.document_id).toBe("my-custom-doc-123");
      });

      it("should include timestamp in report", () => {
        const input = createValidInput();
        const result = runValidation(input);

        expect(result.timestamp).toBeDefined();
        // Verify it's a valid ISO timestamp
        expect(() => new Date(result.timestamp)).not.toThrow();
      });
    });

    describe("overall fail", () => {
      it("should fail when parse_rate fails", () => {
        const input = createValidInput({
          parseRateInput: {
            sourceBlockCount: 100,
            outputBlockCount: 50,
          },
        });
        const result = runValidation(input);

        expect(result.overall_status).toBe("fail");
        expect(result.gates.parse_rate.status).toBe("fail");
        expect(result.gates.ligature_count.status).toBe("pass");
        expect(result.gates.figure_coverage.status).toBe("pass");
      });

      it("should fail when ligature_count fails", () => {
        const input = createValidInput({
          ligatureCount: 5,
        });
        const result = runValidation(input);

        expect(result.overall_status).toBe("fail");
        expect(result.gates.parse_rate.status).toBe("pass");
        expect(result.gates.ligature_count.status).toBe("fail");
        expect(result.gates.figure_coverage.status).toBe("pass");
      });

      it("should fail when figure_coverage fails", () => {
        const input = createValidInput({
          figureCoverage: 80,
        });
        const result = runValidation(input);

        expect(result.overall_status).toBe("fail");
        expect(result.gates.parse_rate.status).toBe("pass");
        expect(result.gates.ligature_count.status).toBe("pass");
        expect(result.gates.figure_coverage.status).toBe("fail");
      });

      it("should fail when multiple gates fail", () => {
        const input = createValidInput({
          parseRateInput: {
            sourceBlockCount: 100,
            outputBlockCount: 50,
          },
          ligatureCount: 10,
          figureCoverage: 50,
        });
        const result = runValidation(input);

        expect(result.overall_status).toBe("fail");
        expect(result.gates.parse_rate.status).toBe("fail");
        expect(result.gates.ligature_count.status).toBe("fail");
        expect(result.gates.figure_coverage.status).toBe("fail");
      });
    });

    describe("failures array", () => {
      it("should not include failures array when all gates pass", () => {
        const input = createValidInput();
        const result = runValidation(input);

        expect(result.failures).toBeUndefined();
      });

      it("should include failure details for single failing gate", () => {
        const input = createValidInput({
          ligatureCount: 5,
        });
        const result = runValidation(input);

        expect(result.failures).toBeDefined();
        expect(result.failures).toHaveLength(1);
        expect(result.failures![0].gate).toBe("ligature_count");
        expect(result.failures![0].reason).toBeDefined();
      });

      it("should include failure details for multiple failing gates", () => {
        const input = createValidInput({
          parseRateInput: {
            sourceBlockCount: 100,
            outputBlockCount: 50,
          },
          ligatureCount: 10,
        });
        const result = runValidation(input);

        expect(result.failures).toBeDefined();
        expect(result.failures).toHaveLength(2);

        const gateNames = result.failures!.map((f) => f.gate);
        expect(gateNames).toContain("parse_rate");
        expect(gateNames).toContain("ligature_count");
      });

      it("should include all three gates in failures when all fail", () => {
        const input = createValidInput({
          parseRateInput: {
            sourceBlockCount: 100,
            outputBlockCount: 50,
          },
          ligatureCount: 10,
          figureCoverage: 50,
        });
        const result = runValidation(input);

        expect(result.failures).toHaveLength(3);

        const gateNames = result.failures!.map((f) => f.gate);
        expect(gateNames).toContain("parse_rate");
        expect(gateNames).toContain("ligature_count");
        expect(gateNames).toContain("figure_coverage");
      });
    });

    describe("gate result structure", () => {
      it("should include all required gate result fields", () => {
        const input = createValidInput();
        const result = runValidation(input);

        // Check parse_rate gate
        expect(result.gates.parse_rate).toHaveProperty("name");
        expect(result.gates.parse_rate).toHaveProperty("threshold");
        expect(result.gates.parse_rate).toHaveProperty("actual");
        expect(result.gates.parse_rate).toHaveProperty("status");

        // Check ligature_count gate
        expect(result.gates.ligature_count).toHaveProperty("name");
        expect(result.gates.ligature_count).toHaveProperty("threshold");
        expect(result.gates.ligature_count).toHaveProperty("actual");
        expect(result.gates.ligature_count).toHaveProperty("status");

        // Check figure_coverage gate
        expect(result.gates.figure_coverage).toHaveProperty("name");
        expect(result.gates.figure_coverage).toHaveProperty("threshold");
        expect(result.gates.figure_coverage).toHaveProperty("actual");
        expect(result.gates.figure_coverage).toHaveProperty("status");
      });
    });

    describe("edge cases", () => {
      it("should handle zero source blocks", () => {
        const input = createValidInput({
          parseRateInput: {
            sourceBlockCount: 0,
            outputBlockCount: 0,
          },
        });
        const result = runValidation(input);

        expect(result.gates.parse_rate.status).toBe("fail");
        expect(result.gates.parse_rate.actual).toBe(0);
      });

      it("should handle boundary values for figure coverage", () => {
        // Test at exactly 90% (should fail since threshold is >90%)
        const input90 = createValidInput({ figureCoverage: 90 });
        expect(runValidation(input90).gates.figure_coverage.status).toBe("fail");

        // Test at 90.1% (should pass)
        const input901 = createValidInput({ figureCoverage: 90.1 });
        expect(runValidation(input901).gates.figure_coverage.status).toBe("pass");
      });
    });
  });
});
