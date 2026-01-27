/**
 * Tests for ligature scan validator.
 * Ensures zero ligature characters remain after normalization.
 */

import { describe, it, expect } from "bun:test";
import {
  scanForLigatures,
  validateLigatureCount,
  validateLigatureCountValue,
} from "../../../src/services/validator/ligature-scan";

describe("Ligature Scan Validator", () => {
  describe("scanForLigatures", () => {
    it("should return 0 for text without ligatures", () => {
      const count = scanForLigatures("This is normal text without ligatures");
      expect(count).toBe(0);
    });

    it("should count single ligature character", () => {
      const count = scanForLigatures("The \uFB01rst item");
      expect(count).toBe(1);
    });

    it("should count multiple ligature characters", () => {
      const count = scanForLigatures("\uFB01rst e\uFB00ort a\uFB03rmation");
      expect(count).toBe(3);
    });

    it("should return 0 for empty string", () => {
      const count = scanForLigatures("");
      expect(count).toBe(0);
    });

    it("should handle medical terminology with ligatures", () => {
      // Real examples from medical texts
      const count = scanForLigatures("a\uFB00erent e\uFB00erent super\uFB01cial");
      expect(count).toBe(3);
    });
  });

  describe("validateLigatureCount", () => {
    describe("passing cases", () => {
      it("should pass when no ligatures found", () => {
        const result = validateLigatureCount("Clean text with no ligatures");

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(0);
        expect(result.name).toBe("Ligature Count");
        expect(result.threshold).toBe("0");
        expect(result.details).toBe("No ligature characters found");
      });

      it("should pass for empty string", () => {
        const result = validateLigatureCount("");

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(0);
      });
    });

    describe("failing cases", () => {
      it("should fail when ligatures found", () => {
        const result = validateLigatureCount("The \uFB01rst item");

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(1);
        expect(result.details).toBe("Found 1 ligature characters");
      });

      it("should fail and report count for multiple ligatures", () => {
        const result = validateLigatureCount("\uFB01\uFB02\uFB03");

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(3);
        expect(result.details).toBe("Found 3 ligature characters");
      });
    });
  });

  describe("validateLigatureCountValue", () => {
    describe("passing cases", () => {
      it("should pass when count is 0", () => {
        const result = validateLigatureCountValue(0);

        expect(result.status).toBe("pass");
        expect(result.actual).toBe(0);
        expect(result.name).toBe("Ligature Count");
        expect(result.threshold).toBe("0");
        expect(result.details).toBe("No ligature characters found");
      });
    });

    describe("failing cases", () => {
      it("should fail when count is 1", () => {
        const result = validateLigatureCountValue(1);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(1);
        expect(result.details).toBe("Found 1 ligature characters");
      });

      it("should fail when count is greater than 0", () => {
        const result = validateLigatureCountValue(50);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(50);
        expect(result.details).toBe("Found 50 ligature characters");
      });
    });

    describe("edge cases", () => {
      it("should handle large counts", () => {
        const result = validateLigatureCountValue(10000);

        expect(result.status).toBe("fail");
        expect(result.actual).toBe(10000);
      });
    });
  });
});
