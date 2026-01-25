/**
 * Parse rate validator - ensures 100% of source blocks are represented.
 */

import type { GateResult } from "../../models/schemas.ts";

export interface ParseRateInput {
  sourceBlockCount: number;
  outputBlockCount: number;
}

/**
 * Validates parse rate meets 100% threshold.
 */
export function validateParseRate(input: ParseRateInput): GateResult {
  const { sourceBlockCount, outputBlockCount } = input;

  const rate = sourceBlockCount > 0
    ? (outputBlockCount / sourceBlockCount) * 100
    : 0;

  const passed = rate >= 100;

  return {
    name: "Parse Rate",
    threshold: "100%",
    actual: Math.round(rate * 100) / 100,
    status: passed ? "pass" : "fail",
    details: `${outputBlockCount}/${sourceBlockCount} blocks (${rate.toFixed(1)}%)`,
  };
}
