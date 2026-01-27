/**
 * Writes RhotonDocument to JSON file.
 */

import type { RhotonDocument } from "../../models/document.ts";
import { RhotonDocumentSchema } from "../../models/schemas.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("document-writer");

/**
 * Validates and writes document to JSON file.
 */
export async function writeDocument(
  document: RhotonDocument,
  outputPath: string
): Promise<void> {
  log.info("Validating document schema");

  // Validate against schema (Constitution Principle II)
  const validated = RhotonDocumentSchema.parse(document);

  log.info("Writing document to file", { path: outputPath });

  const json = JSON.stringify(validated, null, 2);
  await Bun.write(outputPath, json);

  log.info("Document written successfully", {
    path: outputPath,
    size: json.length,
    pages: document.pages.length,
  });
}
