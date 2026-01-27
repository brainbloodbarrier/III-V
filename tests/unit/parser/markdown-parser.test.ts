/**
 * Tests for Markdown parser that detects page boundaries and extracts content.
 * TDD: Write tests first, ensure they FAIL, then implement.
 */

import { describe, it, expect } from "bun:test";
import {
  parseMarkdown,
  detectPageBoundaries,
  extractPageContent,
  type MarkdownPage,
} from "../../../src/services/parser/markdown-parser.ts";

describe("Markdown Parser", () => {
  describe("detectPageBoundaries", () => {
    it("detects {N}--- page boundary pattern", () => {
      const content = `{0}------------------------------------------------
Page 0 content
{1}------------------------------------------------
Page 1 content`;
      const boundaries = detectPageBoundaries(content);
      expect(boundaries).toEqual([
        { pageNumber: 0, startIndex: 0 },
        { pageNumber: 1, startIndex: expect.any(Number) },
      ]);
    });

    it("returns empty array for content without boundaries", () => {
      const content = "No page boundaries here";
      const boundaries = detectPageBoundaries(content);
      expect(boundaries).toEqual([]);
    });

    it("handles multi-digit page numbers", () => {
      const content = `{99}------------------------------------------------
Page 99
{100}------------------------------------------------
Page 100`;
      const boundaries = detectPageBoundaries(content);
      expect(boundaries[0]?.pageNumber).toBe(99);
      expect(boundaries[1]?.pageNumber).toBe(100);
    });
  });

  describe("extractPageContent", () => {
    it("extracts content between page boundaries", () => {
      const content = `{0}------------------------------------------------

# Title

Some content here.

{1}------------------------------------------------

Next page content.`;
      const pages = extractPageContent(content);
      expect(pages.length).toBe(2);
      expect(pages[0]?.pageNumber).toBe(0);
      expect(pages[0]?.content).toContain("# Title");
      expect(pages[0]?.content).toContain("Some content here.");
      expect(pages[1]?.pageNumber).toBe(1);
      expect(pages[1]?.content).toContain("Next page content.");
    });

    it("preserves markdown formatting", () => {
      const content = `{0}------------------------------------------------

## Section Header

**Bold text** and *italic text*

- List item 1
- List item 2`;
      const pages = extractPageContent(content);
      expect(pages[0]?.content).toContain("## Section Header");
      expect(pages[0]?.content).toContain("**Bold text**");
      expect(pages[0]?.content).toContain("- List item 1");
    });

    it("preserves figure references", () => {
      const content = `{0}------------------------------------------------

See Figure 4.1 and Figs. 4.2-4.5 for details.

$Fig. 4.1$ shows the anatomy.`;
      const pages = extractPageContent(content);
      expect(pages[0]?.content).toContain("Figure 4.1");
      expect(pages[0]?.content).toContain("Figs. 4.2-4.5");
      expect(pages[0]?.content).toContain("$Fig. 4.1$");
    });

    it("handles empty pages", () => {
      const content = `{0}------------------------------------------------
{1}------------------------------------------------
Content on page 1`;
      const pages = extractPageContent(content);
      expect(pages.length).toBe(2);
      expect(pages[0]?.content.trim()).toBe("");
    });
  });

  describe("parseMarkdown", () => {
    it("returns structured page array", () => {
      const content = `{0}------------------------------------------------

# THE CEREBRAL VEINS

## Albert L. Rhoton, Jr., M.D.

{1}------------------------------------------------

Continuation text here.`;
      const result = parseMarkdown(content);
      expect(result.pages.length).toBe(2);
      expect(result.totalLines).toBeGreaterThan(0);
    });

    it("counts total lines in source", () => {
      const content = `{0}------------------------------------------------
Line 1
Line 2
Line 3
{1}------------------------------------------------
Line 4
Line 5`;
      const result = parseMarkdown(content);
      expect(result.totalLines).toBe(7);
    });

    it("maps page numbers correctly", () => {
      const content = `{5}------------------------------------------------
Content for page 5
{6}------------------------------------------------
Content for page 6`;
      const result = parseMarkdown(content);
      expect(result.pages[0]?.pageNumber).toBe(5);
      expect(result.pages[1]?.pageNumber).toBe(6);
    });
  });
});
