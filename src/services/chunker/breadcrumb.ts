import type { RhotonDocument } from "../../models/document";

/**
 * Builds an index mapping block IDs to header text.
 * Scans all section_header blocks in the document.
 */
export function buildHeaderIndex(document: RhotonDocument): Map<string, string> {
  const index = new Map<string, string>();

  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.block_type === "section_header") {
        index.set(block.id, block.content);
      }
    }
  }

  return index;
}

/**
 * Resolves an array of block IDs to text labels using the header index.
 * Skips any unresolved IDs (logs warning in production).
 */
export function resolveBreadcrumb(
  blockIds: string[],
  headerIndex: Map<string, string>
): string[] {
  const labels: string[] = [];

  for (const blockId of blockIds) {
    const label = headerIndex.get(blockId);
    if (label) {
      labels.push(label);
    }
    // In production, would log warning for unresolved IDs
  }

  return labels;
}

/**
 * Formats breadcrumb labels into context string.
 * Format: "[Context: Label1 > Label2 > Label3]"
 * Returns "[Context: Document Root]" for empty labels.
 */
export function formatBreadcrumb(labels: string[]): string {
  if (labels.length === 0) {
    return "[Context: Document Root]";
  }
  return `[Context: ${labels.join(" > ")}]`;
}

/**
 * Convenience function to resolve and format breadcrumb in one call.
 */
export function getBreadcrumbText(
  blockIds: string[],
  headerIndex: Map<string, string>
): { labels: string[]; text: string } {
  const labels = resolveBreadcrumb(blockIds, headerIndex);
  const text = formatBreadcrumb(labels);
  return { labels, text };
}
