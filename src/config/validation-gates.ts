/**
 * Declarative configuration for validation gates.
 *
 * This module centralizes all validation gate definitions, making it easy to:
 * - Understand all quality gates at a glance
 * - Modify thresholds without changing validator logic
 * - Add new gates with consistent structure
 * - Test gate configurations in isolation
 *
 * GATE CONFIGURATION ARCHITECTURE:
 *
 *   Each gate has a name, threshold value, and comparator that defines
 *   how the actual value is compared against the threshold:
 *
 *   - 'gte': actual >= threshold (e.g., parse_rate must be >= 100%)
 *   - 'gt':  actual > threshold  (e.g., figure_coverage must be > 90%)
 *   - 'lte': actual <= threshold (e.g., ligature_count must be <= 0)
 *   - 'eq':  actual === threshold (exact match)
 *
 *   Message generators receive the actual and threshold values to produce
 *   human-readable descriptions for pass/fail states.
 *
 * @see src/services/validator/ - Validators that consume this configuration
 */

/**
 * Comparator types for gate evaluation.
 */
export type GateComparator = "gte" | "gt" | "lte" | "eq";

/**
 * Configuration for a single validation gate.
 */
export interface GateConfig {
  /** Unique identifier for the gate (snake_case, matches schema keys) */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Threshold value for comparison */
  threshold: number;
  /** How to format threshold for display (e.g., "100%", "0", ">90%") */
  thresholdDisplay: string;
  /** Comparison operator */
  comparator: GateComparator;
  /** Generate message for passing state */
  getPassMessage: (actual: number, threshold: number) => string;
  /** Generate message for failing state */
  getFailMessage: (actual: number, threshold: number) => string;
}

/**
 * Evaluate whether a gate passes based on its comparator.
 */
export function evaluateGate(
  actual: number,
  config: GateConfig
): boolean {
  const { threshold, comparator } = config;

  switch (comparator) {
    case "gte":
      return actual >= threshold;
    case "gt":
      return actual > threshold;
    case "lte":
      return actual <= threshold;
    case "eq":
      return actual === threshold;
    default:
      throw new Error(`Unknown comparator: ${comparator}`);
  }
}

/**
 * Parse Rate Gate Configuration
 *
 * Ensures 100% of source blocks are represented in output.
 * Rate >= 100% means all blocks were preserved (or expanded).
 */
export const PARSE_RATE_GATE: GateConfig = {
  id: "parse_rate",
  displayName: "Parse Rate",
  threshold: 100,
  thresholdDisplay: "100%",
  comparator: "gte",
  getPassMessage: (actual, _threshold) =>
    `Parse rate ${actual.toFixed(1)}% meets threshold`,
  getFailMessage: (actual, threshold) =>
    `Parse rate ${actual.toFixed(1)}% below ${threshold}% threshold`,
};

/**
 * Ligature Count Gate Configuration
 *
 * Ensures zero ligature characters remain after normalization.
 * Count must be exactly 0 for the gate to pass.
 */
export const LIGATURE_COUNT_GATE: GateConfig = {
  id: "ligature_count",
  displayName: "Ligature Count",
  threshold: 0,
  thresholdDisplay: "0",
  comparator: "eq",
  getPassMessage: (_actual, _threshold) => "No ligature characters found",
  getFailMessage: (actual, _threshold) =>
    `Found ${actual} ligature characters`,
};

/**
 * Figure Coverage Gate Configuration
 *
 * Ensures >90% of figures are mapped to images.
 * Uses 'gt' comparator: exactly 90% fails, 90.1% passes.
 */
export const FIGURE_COVERAGE_GATE: GateConfig = {
  id: "figure_coverage",
  displayName: "Figure Coverage",
  threshold: 90,
  thresholdDisplay: ">90%",
  comparator: "gt",
  getPassMessage: (actual, _threshold) =>
    `Coverage ${actual.toFixed(1)}% exceeds threshold`,
  getFailMessage: (actual, threshold) =>
    `Coverage ${actual.toFixed(1)}% below ${threshold}% threshold`,
};

/**
 * All validation gates in evaluation order.
 *
 * This array is the single source of truth for which gates exist
 * and their configurations. Add new gates here to have them
 * automatically included in validation.
 */
export const VALIDATION_GATES: readonly GateConfig[] = [
  PARSE_RATE_GATE,
  LIGATURE_COUNT_GATE,
  FIGURE_COVERAGE_GATE,
] as const;

/**
 * Lookup a gate configuration by ID.
 *
 * @throws Error if gate ID is not found
 */
export function getGateConfig(gateId: string): GateConfig {
  const gate = VALIDATION_GATES.find((g) => g.id === gateId);
  if (!gate) {
    throw new Error(
      `Unknown gate ID: ${gateId}. Valid gates: ${VALIDATION_GATES.map((g) => g.id).join(", ")}`
    );
  }
  return gate;
}
