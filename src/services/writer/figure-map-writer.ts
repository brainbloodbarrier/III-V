/**
 * Writes FigureMap to JSON file.
 */

import type { FigureMap } from "../../models/figure.ts";
import { FigureMapSchema } from "../../models/schemas.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("figure-map-writer");

/**
 * Validates and writes figure map to JSON file.
 */
export async function writeFigureMap(
  figureMap: FigureMap,
  outputPath: string
): Promise<void> {
  log.info("Validating figure map schema");

  // Validate against schema (Constitution Principle II)
  const validated = FigureMapSchema.parse(figureMap);

  log.info("Writing figure map to file", { path: outputPath });

  const json = JSON.stringify(validated, null, 2);
  await Bun.write(outputPath, json);

  log.info("Figure map written successfully", {
    path: outputPath,
    totalFigures: figureMap.summary.total_figures,
    coverage: figureMap.summary.coverage_percentage,
  });
}
