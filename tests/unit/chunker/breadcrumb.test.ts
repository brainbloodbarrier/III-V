import { describe, test, expect } from "bun:test";
import {
  buildHeaderIndex,
  resolveBreadcrumb,
  formatBreadcrumb,
} from "../../../src/services/chunker/breadcrumb";

describe("breadcrumb", () => {
  // Sample document structure for testing
  const mockDocument = {
    pages: [
      {
        page_number: 1,
        blocks: [
          { id: "/page/1/SectionHeader/1", block_type: "section_header", content: "THE CEREBRAL VEINS" },
          { id: "/page/1/SectionHeader/2", block_type: "section_header", content: "SUPERFICIAL VEINS" },
          { id: "/page/1/Text/3", block_type: "text", content: "Some text..." },
        ],
      },
    ],
  };

  describe("buildHeaderIndex", () => {
    test("builds map of block IDs to header text", () => {
      const index = buildHeaderIndex(mockDocument as any);
      expect(index.get("/page/1/SectionHeader/1")).toBe("THE CEREBRAL VEINS");
      expect(index.get("/page/1/SectionHeader/2")).toBe("SUPERFICIAL VEINS");
    });

    test("excludes non-header blocks", () => {
      const index = buildHeaderIndex(mockDocument as any);
      expect(index.has("/page/1/Text/3")).toBe(false);
    });
  });

  describe("resolveBreadcrumb", () => {
    test("resolves single block ID to label", () => {
      const index = new Map([["/page/1/SectionHeader/1", "THE CEREBRAL VEINS"]]);
      const labels = resolveBreadcrumb(["/page/1/SectionHeader/1"], index);
      expect(labels).toEqual(["THE CEREBRAL VEINS"]);
    });

    test("resolves multiple block IDs to hierarchy", () => {
      const index = new Map([
        ["/page/1/SectionHeader/1", "THE CEREBRAL VEINS"],
        ["/page/1/SectionHeader/2", "SUPERFICIAL VEINS"],
      ]);
      const labels = resolveBreadcrumb(
        ["/page/1/SectionHeader/1", "/page/1/SectionHeader/2"],
        index
      );
      expect(labels).toEqual(["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"]);
    });

    test("skips unresolved block IDs", () => {
      const index = new Map([["/page/1/SectionHeader/1", "THE CEREBRAL VEINS"]]);
      const labels = resolveBreadcrumb(
        ["/page/1/SectionHeader/1", "/page/99/Unknown/1"],
        index
      );
      expect(labels).toEqual(["THE CEREBRAL VEINS"]);
    });

    test("returns empty array for empty hierarchy", () => {
      const index = new Map();
      const labels = resolveBreadcrumb([], index);
      expect(labels).toEqual([]);
    });
  });

  describe("formatBreadcrumb", () => {
    test("formats single label", () => {
      expect(formatBreadcrumb(["THE CEREBRAL VEINS"])).toBe(
        "[Context: THE CEREBRAL VEINS]"
      );
    });

    test("formats multiple labels with separator", () => {
      expect(formatBreadcrumb(["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"])).toBe(
        "[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS]"
      );
    });

    test("formats empty labels as Document Root", () => {
      expect(formatBreadcrumb([])).toBe("[Context: Document Root]");
    });
  });
});
