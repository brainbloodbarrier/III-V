/**
 * Figure coverage validator - ensures >90% of figures are mapped.
 */

import type { GateResult } from "../../models/schemas.ts";
import type { FigureSummary } from "../../models/figure.ts";

const COVERAGE_THRESHOLD = 90;

/**
 * Validates figure coverage meets >90% threshold.
 */
export function validateFigureCoverage(summary: FigureSummary): GateResult {
  const { total_figures, mapped_count, coverage_percentage } = summary;

  const passed = coverage_percentage > COVERAGE_THRESHOLD;

  return {
    name: "Figure Coverage",
    threshold: `>${COVERAGE_THRESHOLD}%`,
    actual: Math.round(coverage_percentage * 10) / 10,
    status: passed ? "pass" : "fail",
    details: `${mapped_count}/${total_figures} figures mapped (${coverage_percentage.toFixed(1)}%)`,
  };
}

/**
 * Validates figure coverage from percentage value.
 */
export function validateFigureCoverageValue(percentage: number): GateResult {
  const passed = percentage > COVERAGE_THRESHOLD;

  return {
    name: "Figure Coverage",
    threshold: `>${COVERAGE_THRESHOLD}%`,
    actual: Math.round(percentage * 10) / 10,
    status: passed ? "pass" : "fail",
    details: passed
      ? `Coverage ${percentage.toFixed(1)}% exceeds threshold`
      : `Coverage ${percentage.toFixed(1)}% below ${COVERAGE_THRESHOLD}% threshold`,
  };
}
