/**
 * Markdown parser for Rhoton PDF text content.
 * Detects page boundaries and extracts text for each page.
 */

import { createLogger } from "../../lib/logger.ts";

const log = createLogger("markdown-parser");

/**
 * A page boundary detected in markdown.
 */
export interface PageBoundary {
  pageNumber: number;
  startIndex: number;
}

/**
 * A page extracted from markdown.
 */
export interface MarkdownPage {
  pageNumber: number;
  content: string;
}

/**
 * Result of parsing markdown file.
 */
export interface MarkdownParseResult {
  pages: MarkdownPage[];
  totalLines: number;
}

/**
 * Page boundary pattern: {N}--- where N is page number.
 * The dashes continue for the full separator width.
 */
const PAGE_BOUNDARY_PATTERN = /^\{(\d+)\}-{2,}/gm;

/**
 * Detects all page boundaries in the markdown content.
 */
export function detectPageBoundaries(content: string): PageBoundary[] {
  const boundaries: PageBoundary[] = [];
  let match;

  // Reset lastIndex for global regex
  PAGE_BOUNDARY_PATTERN.lastIndex = 0;

  while ((match = PAGE_BOUNDARY_PATTERN.exec(content)) !== null) {
    const pageNumberStr = match[1];
    if (pageNumberStr !== undefined) {
      boundaries.push({
        pageNumber: parseInt(pageNumberStr, 10),
        startIndex: match.index,
      });
    }
  }

  return boundaries;
}

/**
 * Extracts content for each page between boundaries.
 */
export function extractPageContent(content: string): MarkdownPage[] {
  const boundaries = detectPageBoundaries(content);
  const pages: MarkdownPage[] = [];

  if (boundaries.length === 0) {
    return pages;
  }

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    if (!boundary) continue;

    const nextBoundary = boundaries[i + 1];
    const startIndex = boundary.startIndex;
    const endIndex = nextBoundary ? nextBoundary.startIndex : content.length;

    // Extract content after the boundary line
    const slice = content.slice(startIndex, endIndex);
    // Remove the boundary line itself
    const boundaryLineEnd = slice.indexOf("\n");
    const pageContent =
      boundaryLineEnd >= 0 ? slice.slice(boundaryLineEnd + 1) : "";

    pages.push({
      pageNumber: boundary.pageNumber,
      content: pageContent.trim(),
    });
  }

  return pages;
}

/**
 * Parses markdown content into structured pages.
 */
export function parseMarkdown(content: string): MarkdownParseResult {
  const totalLines = content.split("\n").length;
  const pages = extractPageContent(content);

  log.info("Parsed markdown content", {
    totalLines,
    pageCount: pages.length,
  });

  return { pages, totalLines };
}

/**
 * Loads and parses a markdown file.
 */
export async function parseMarkdownFile(
  filePath: string
): Promise<MarkdownParseResult> {
  log.info("Loading markdown file", { path: filePath });

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`Markdown file not found: ${filePath}`);
  }

  const content = await file.text();
  return parseMarkdown(content);
}
