/**
 * Ligature scan validator - ensures zero ligature characters remain.
 */

import type { GateResult } from "../../models/schemas.ts";
import { countLigatures } from "../normalizer/ligature.ts";

/**
 * Scans text for remaining ligature characters.
 */
export function scanForLigatures(content: string): number {
  return countLigatures(content);
}

/**
 * Validates ligature count is zero.
 */
export function validateLigatureCount(content: string): GateResult {
  const count = scanForLigatures(content);
  const passed = count === 0;

  return {
    name: "Ligature Count",
    threshold: "0",
    actual: count,
    status: passed ? "pass" : "fail",
    details: passed
      ? "No ligature characters found"
      : `Found ${count} ligature characters`,
  };
}

/**
 * Validates ligature count from pre-calculated value.
 */
export function validateLigatureCountValue(count: number): GateResult {
  const passed = count === 0;

  return {
    name: "Ligature Count",
    threshold: "0",
    actual: count,
    status: passed ? "pass" : "fail",
    details: passed
      ? "No ligature characters found"
      : `Found ${count} ligature characters`,
  };
}
