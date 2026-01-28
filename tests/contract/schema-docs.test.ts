/**
 * Schema Documentation Compliance Tests
 *
 * Ensures all exported Zod schemas have descriptions via .describe().
 * This enforces documentation standards for the codebase.
 */

import { describe, it, expect } from "bun:test";
import * as schemas from "@models/schemas";

// Get all schema exports (names ending with "Schema")
const schemaEntries = Object.entries(schemas).filter(
  ([name]) => name.endsWith("Schema")
);

describe("Schema Documentation Compliance", () => {
  describe("All schemas have top-level descriptions", () => {
    for (const [name, schema] of schemaEntries) {
      it(`${name} should have a description`, () => {
        // Zod schemas expose description via .description property
        const zodSchema = schema as { description?: string };
        expect(zodSchema.description).toBeDefined();
        expect(zodSchema.description).not.toBe("");
      });
    }
  });

  it("should have at least 15 documented schemas", () => {
    const documentedCount = schemaEntries.filter(([, schema]) => {
      const zodSchema = schema as { description?: string };
      return zodSchema.description !== undefined;
    }).length;

    expect(documentedCount).toBeGreaterThanOrEqual(15);
  });

  it("should document critical schemas for RAG consumers", () => {
    const criticalSchemas = [
      "ChunkSchema",
      "ChunkIndexSchema",
      "ChunksOutputSchema",
      "FigureReferenceSchema",
      "ContentBlockSchema",
    ];

    for (const name of criticalSchemas) {
      const schema = schemas[name as keyof typeof schemas] as {
        description?: string;
      };
      expect(schema).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.description!.length).toBeGreaterThan(10);
    }
  });
});
