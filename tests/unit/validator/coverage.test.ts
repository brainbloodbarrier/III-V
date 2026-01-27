/**
 * Tests for figure coverage validator.
 * Ensures >90% of figures are mapped to images.
 */

import { describe, it, expect } from "bun:test";
import {
  validateFigureCoverage,
  validateFigureCoverageValue,
} from "../../../src/services/validator/coverage";
import type { FigureSummary } from "../../../src/models/figure";

describe("Figure Coverage Validator", () => {
  describe("validateFigureCoverage", () => {
    describe("passing cases", () => {
      it("should pass when coverage exceeds 90%", () => {
        const summary: FigureSummary = {
          total_figures: 100,
          mapped_count: 95,
          unmapped_count: 5,
          coverage_percentage: 95,
        };
        const result = validateFigureCoverage(summary);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(95);
        expect(result.name).toBe("Figure Coverage");
        expect(result.threshold).toBe(">90%");
      });

      it("should pass at 100% coverage", () => {
        const summary: FigureSummary = {
          total_figures: 50,
          mapped_count: 50,
          unmapped_count: 0,
          coverage_percentage: 100,
        };
        const result = validateFigureCoverage(summary);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(100);
      });

      it("should pass at 90.1% coverage", () => {
        const summary: FigureSummary = {
          total_figures: 1000,
          mapped_count: 901,
          unmapped_count: 99,
          coverage_percentage: 90.1,
        };
        const result = validateFigureCoverage(summary);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(90.1);
      });
    });

    describe("failing cases", () => {
      it("should fail at exactly 90% (threshold is >90%)", () => {
        const summary: FigureSummary = {
          total_figures: 100,
          mapped_count: 90,
          unmapped_count: 10,
          coverage_percentage: 90,
        };
        const result = validateFigureCoverage(summary);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(90);
      });

      it("should fail when coverage is below 90%", () => {
        const summary: FigureSummary = {
          total_figures: 100,
          mapped_count: 80,
          unmapped_count: 20,
          coverage_percentage: 80,
        };
        const result = validateFigureCoverage(summary);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(80);
      });

      it("should fail at 0% coverage", () => {
        const summary: FigureSummary = {
          total_figures: 100,
          mapped_count: 0,
          unmapped_count: 100,
          coverage_percentage: 0,
        };
        const result = validateFigureCoverage(summary);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(0);
      });
    });

    describe("details field", () => {
      it("should include figure count details", () => {
        const summary: FigureSummary = {
          total_figures: 100,
          mapped_count: 95,
          unmapped_count: 5,
          coverage_percentage: 95,
        };
        const result = validateFigureCoverage(summary);

        expect(result.details).toContain("95/100 figures mapped");
        expect(result.details).toContain("95.0%");
      });
    });

    describe("edge cases", () => {
      it("should round actual to 1 decimal place", () => {
        const summary: FigureSummary = {
          total_figures: 3,
          mapped_count: 3,
          unmapped_count: 0,
          coverage_percentage: 99.999,
        };
        const result = validateFigureCoverage(summary);

        expect(result.actual).toBe(100);
      });
    });
  });

  describe("validateFigureCoverageValue", () => {
    describe("passing cases", () => {
      it("should pass when percentage exceeds 90%", () => {
        const result = validateFigureCoverageValue(95);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(95);
        expect(result.name).toBe("Figure Coverage");
        expect(result.threshold).toBe(">90%");
      });

      it("should pass at 100%", () => {
        const result = validateFigureCoverageValue(100);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(100);
      });

      it("should pass at 90.1%", () => {
        const result = validateFigureCoverageValue(90.1);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(90.1);
      });
    });

    describe("failing cases", () => {
      it("should fail at exactly 90%", () => {
        const result = validateFigureCoverageValue(90);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(90);
      });

      it("should fail below 90%", () => {
        const result = validateFigureCoverageValue(50);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(50);
      });

      it("should fail at 0%", () => {
        const result = validateFigureCoverageValue(0);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(0);
      });
    });

    describe("details field", () => {
      it("should include success message when passing", () => {
        const result = validateFigureCoverageValue(95);

        expect(result.details).toContain("exceeds threshold");
        expect(result.details).toContain("95.0%");
      });

      it("should include failure message when failing", () => {
        const result = validateFigureCoverageValue(85);

        expect(result.details).toContain("below 90% threshold");
        expect(result.details).toContain("85.0%");
      });
    });

    describe("edge cases", () => {
      it("should round actual to 1 decimal place", () => {
        const result = validateFigureCoverageValue(95.567);

        expect(result.actual).toBe(95.6);
      });

      it("should handle fractional percentages near threshold", () => {
        const result = validateFigureCoverageValue(90.01);

        expect(result.status).toBe("pass");
      });
    });
  });
});
