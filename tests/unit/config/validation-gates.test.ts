/**
 * Tests for validation gates configuration.
 * Ensures gate evaluation and lookup work correctly.
 */

import { describe, it, expect } from "bun:test";
import {
  evaluateGate,
  getGateConfig,
  VALIDATION_GATES,
  PARSE_RATE_GATE,
  LIGATURE_COUNT_GATE,
  FIGURE_COVERAGE_GATE,
  type GateConfig,
} from "../../../src/config/validation-gates";

describe("Validation Gates Configuration", () => {
  describe("VALIDATION_GATES array", () => {
    it("should contain all three gates", () => {
      expect(VALIDATION_GATES).toHaveLength(3);
    });

    it("should have unique gate IDs", () => {
      const ids = VALIDATION_GATES.map((g) => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should include parse_rate, ligature_count, and figure_coverage", () => {
      const ids = VALIDATION_GATES.map((g) => g.id);
      expect(ids).toContain("parse_rate");
      expect(ids).toContain("ligature_count");
      expect(ids).toContain("figure_coverage");
    });
  });

  describe("evaluateGate", () => {
    describe("gte comparator", () => {
      it("should pass when actual equals threshold", () => {
        expect(evaluateGate(100, PARSE_RATE_GATE)).toBe(true);
      });

      it("should pass when actual exceeds threshold", () => {
        expect(evaluateGate(150, PARSE_RATE_GATE)).toBe(true);
      });

      it("should fail when actual is below threshold", () => {
        expect(evaluateGate(99, PARSE_RATE_GATE)).toBe(false);
      });
    });

    describe("gt comparator", () => {
      it("should fail when actual equals threshold", () => {
        expect(evaluateGate(90, FIGURE_COVERAGE_GATE)).toBe(false);
      });

      it("should pass when actual exceeds threshold", () => {
        expect(evaluateGate(90.1, FIGURE_COVERAGE_GATE)).toBe(true);
      });

      it("should fail when actual is below threshold", () => {
        expect(evaluateGate(89, FIGURE_COVERAGE_GATE)).toBe(false);
      });
    });

    describe("eq comparator", () => {
      it("should pass when actual equals threshold", () => {
        expect(evaluateGate(0, LIGATURE_COUNT_GATE)).toBe(true);
      });

      it("should fail when actual exceeds threshold", () => {
        expect(evaluateGate(1, LIGATURE_COUNT_GATE)).toBe(false);
      });

      it("should fail when actual is below threshold", () => {
        // For ligature count with threshold 0, can't go below
        // Test with custom gate
        const customGate: GateConfig = {
          ...LIGATURE_COUNT_GATE,
          threshold: 5,
        };
        expect(evaluateGate(3, customGate)).toBe(false);
      });
    });

    describe("lte comparator", () => {
      const lteGate: GateConfig = {
        id: "test_lte",
        displayName: "Test LTE",
        threshold: 10,
        thresholdDisplay: "<=10",
        comparator: "lte",
        getPassMessage: () => "Pass",
        getFailMessage: () => "Fail",
      };

      it("should pass when actual equals threshold", () => {
        expect(evaluateGate(10, lteGate)).toBe(true);
      });

      it("should pass when actual is below threshold", () => {
        expect(evaluateGate(5, lteGate)).toBe(true);
      });

      it("should fail when actual exceeds threshold", () => {
        expect(evaluateGate(15, lteGate)).toBe(false);
      });
    });
  });

  describe("getGateConfig", () => {
    it("should return parse_rate gate by ID", () => {
      const gate = getGateConfig("parse_rate");
      expect(gate).toBe(PARSE_RATE_GATE);
    });

    it("should return ligature_count gate by ID", () => {
      const gate = getGateConfig("ligature_count");
      expect(gate).toBe(LIGATURE_COUNT_GATE);
    });

    it("should return figure_coverage gate by ID", () => {
      const gate = getGateConfig("figure_coverage");
      expect(gate).toBe(FIGURE_COVERAGE_GATE);
    });

    it("should throw for unknown gate ID", () => {
      expect(() => getGateConfig("unknown_gate")).toThrow(
        /Unknown gate ID: unknown_gate/
      );
    });
  });

  describe("PARSE_RATE_GATE", () => {
    it("should have correct configuration", () => {
      expect(PARSE_RATE_GATE.id).toBe("parse_rate");
      expect(PARSE_RATE_GATE.displayName).toBe("Parse Rate");
      expect(PARSE_RATE_GATE.threshold).toBe(100);
      expect(PARSE_RATE_GATE.thresholdDisplay).toBe("100%");
      expect(PARSE_RATE_GATE.comparator).toBe("gte");
    });

    it("should generate pass message", () => {
      const msg = PARSE_RATE_GATE.getPassMessage(100, 100);
      expect(msg).toContain("100.0%");
    });

    it("should generate fail message", () => {
      const msg = PARSE_RATE_GATE.getFailMessage(95, 100);
      expect(msg).toContain("95.0%");
      expect(msg).toContain("100%");
    });
  });

  describe("LIGATURE_COUNT_GATE", () => {
    it("should have correct configuration", () => {
      expect(LIGATURE_COUNT_GATE.id).toBe("ligature_count");
      expect(LIGATURE_COUNT_GATE.displayName).toBe("Ligature Count");
      expect(LIGATURE_COUNT_GATE.threshold).toBe(0);
      expect(LIGATURE_COUNT_GATE.thresholdDisplay).toBe("0");
      expect(LIGATURE_COUNT_GATE.comparator).toBe("eq");
    });

    it("should generate pass message", () => {
      const msg = LIGATURE_COUNT_GATE.getPassMessage(0, 0);
      expect(msg).toContain("No ligature");
    });

    it("should generate fail message", () => {
      const msg = LIGATURE_COUNT_GATE.getFailMessage(5, 0);
      expect(msg).toContain("5");
      expect(msg).toContain("ligature");
    });
  });

  describe("FIGURE_COVERAGE_GATE", () => {
    it("should have correct configuration", () => {
      expect(FIGURE_COVERAGE_GATE.id).toBe("figure_coverage");
      expect(FIGURE_COVERAGE_GATE.displayName).toBe("Figure Coverage");
      expect(FIGURE_COVERAGE_GATE.threshold).toBe(90);
      expect(FIGURE_COVERAGE_GATE.thresholdDisplay).toBe(">90%");
      expect(FIGURE_COVERAGE_GATE.comparator).toBe("gt");
    });

    it("should generate pass message", () => {
      const msg = FIGURE_COVERAGE_GATE.getPassMessage(95, 90);
      expect(msg).toContain("95.0%");
      expect(msg).toContain("exceeds");
    });

    it("should generate fail message", () => {
      const msg = FIGURE_COVERAGE_GATE.getFailMessage(85, 90);
      expect(msg).toContain("85.0%");
      expect(msg).toContain("90%");
    });
  });
});
