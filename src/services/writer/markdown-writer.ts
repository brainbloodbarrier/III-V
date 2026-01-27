/**
 * Writes document content to Markdown file.
 */

import type { RhotonDocument, RhotonPage, ContentBlock } from "../../models/document.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("markdown-writer");

/**
 * Converts heading level to markdown heading syntax.
 */
function headingPrefix(level: number): string {
  if (level <= 0 || level > 6) return "";
  return "#".repeat(level) + " ";
}

/**
 * Formats a content block as markdown.
 */
function formatBlock(block: ContentBlock): string {
  if (block.block_type === "section_header" && block.level > 0) {
    return headingPrefix(block.level) + block.content;
  }
  if (block.block_type === "page_header") {
    return ""; // Skip page headers
  }
  return block.content;
}

/**
 * Formats a page as markdown.
 */
function formatPage(page: RhotonPage): string {
  const lines: string[] = [];

  for (const block of page.blocks) {
    const formatted = formatBlock(block);
    if (formatted) {
      lines.push(formatted);
      lines.push(""); // Blank line after each block
    }
  }

  return lines.join("\n");
}

/**
 * Writes document content to markdown file.
 */
export async function writeMarkdown(
  document: RhotonDocument,
  outputPath: string
): Promise<void> {
  log.info("Generating markdown content");

  const sections: string[] = [];

  // Document header
  sections.push(`# ${document.title}`);
  sections.push("");
  sections.push(`**Author:** ${document.author}`);
  sections.push("");
  sections.push("---");
  sections.push("");

  // Format each page
  for (const page of document.pages) {
    const pageContent = formatPage(page);
    if (pageContent.trim()) {
      sections.push(pageContent);
    }
  }

  const content = sections.join("\n");

  log.info("Writing markdown to file", { path: outputPath });

  await Bun.write(outputPath, content);

  log.info("Markdown written successfully", {
    path: outputPath,
    size: content.length,
    pages: document.pages.length,
  });
}
