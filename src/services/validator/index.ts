/**
 * Validator module - runs all quality gate checks.
 */

import type { ValidationReport, GateResult, FailureDetail } from "../../models/schemas.ts";
import { ValidationReportSchema } from "../../models/schemas.ts";
import type { RhotonDocument } from "../../models/document.ts";
import type { FigureSummary } from "../../models/figure.ts";
import { validateParseRate, type ParseRateInput } from "./parse-rate.ts";
import { validateLigatureCountValue } from "./ligature-scan.ts";
import { validateFigureCoverageValue } from "./coverage.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("validator");

export interface ValidationInput {
  documentId: string;
  parseRateInput: ParseRateInput;
  ligatureCount: number;
  figureCoverage: number;
}

/**
 * Runs all quality gate validations.
 */
export function runValidation(input: ValidationInput): ValidationReport {
  log.info("Running quality gate validation", { documentId: input.documentId });

  const parseRate = validateParseRate(input.parseRateInput);
  const ligatureCount = validateLigatureCountValue(input.ligatureCount);
  const figureCoverage = validateFigureCoverageValue(input.figureCoverage);

  const gates = {
    parse_rate: parseRate,
    ligature_count: ligatureCount,
    figure_coverage: figureCoverage,
  };

  const allPassed = [parseRate, ligatureCount, figureCoverage].every(
    (g) => g.status === "pass"
  );

  const failures: FailureDetail[] = [];
  if (!allPassed) {
    for (const [name, gate] of Object.entries(gates)) {
      if (gate.status === "fail") {
        failures.push({
          gate: name,
          reason: gate.details ?? `Gate ${name} failed`,
        });
      }
    }
  }

  const report: ValidationReport = {
    document_id: input.documentId,
    timestamp: new Date().toISOString(),
    gates,
    overall_status: allPassed ? "pass" : "fail",
  };

  if (failures.length > 0) {
    report.failures = failures;
  }

  log.info("Validation complete", {
    overall: report.overall_status,
    parseRate: parseRate.status,
    ligatureCount: ligatureCount.status,
    figureCoverage: figureCoverage.status,
  });

  return report;
}

/**
 * Validates and writes validation report.
 */
export async function writeValidationReport(
  report: ValidationReport,
  outputPath: string
): Promise<void> {
  log.info("Writing validation report", { path: outputPath });

  // Validate schema (Constitution Principle II)
  const validated = ValidationReportSchema.parse(report);

  const json = JSON.stringify(validated, null, 2);
  await Bun.write(outputPath, json);

  log.info("Validation report written");
}

/**
 * Prints validation report to console.
 */
export function printValidationReport(report: ValidationReport): void {
  const { gates, overall_status } = report;

  console.log("\n=== Quality Gate Validation ===\n");

  const statusIcon = (status: string) => (status === "pass" ? "✓" : "✗");

  console.log(
    `${statusIcon(gates.parse_rate.status)} Parse Rate: ${gates.parse_rate.actual}% (threshold: ${gates.parse_rate.threshold})`
  );
  console.log(
    `${statusIcon(gates.ligature_count.status)} Ligatures: ${gates.ligature_count.actual} (threshold: ${gates.ligature_count.threshold})`
  );
  console.log(
    `${statusIcon(gates.figure_coverage.status)} Figure Coverage: ${gates.figure_coverage.actual}% (threshold: ${gates.figure_coverage.threshold})`
  );

  console.log(`\nOverall: ${overall_status.toUpperCase()}`);

  if (report.failures && report.failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of report.failures) {
      console.log(`  - ${failure.gate}: ${failure.reason}`);
    }
  }

  console.log("");
}

// Re-export individual validators
export { validateParseRate } from "./parse-rate.ts";
export { validateLigatureCount, validateLigatureCountValue, scanForLigatures } from "./ligature-scan.ts";
export { validateFigureCoverage, validateFigureCoverageValue } from "./coverage.ts";
