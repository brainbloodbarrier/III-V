/**
 * Document block iteration utilities.
 *
 * Provides generator functions for iterating over document blocks,
 * eliminating the need for nested loops throughout the codebase.
 * Generators are lazy and do not allocate intermediate arrays.
 */
import type { RhotonDocument, ContentBlock } from "../../models/document";

/**
 * Iterates over all blocks in a document across all pages.
 * Yields blocks in document order (page 0 first, then page 1, etc.).
 */
export function* iterateBlocks(document: RhotonDocument): Generator<ContentBlock> {
  for (const page of document.pages) {
    for (const block of page.blocks) {
      yield block;
    }
  }
}

/**
 * Block with page context for iteration.
 */
export interface BlockWithPage {
  block: ContentBlock;
  pageIndex: number;
  pageNumber: number;
}

/**
 * Iterates over all blocks in a document, yielding page context with each block.
 * Useful when page information is needed during block processing.
 *
 * @param document - The document to iterate over
 * @yields Objects containing the block, 0-based page index, and page number
 */
export function* iterateBlocksWithPage(document: RhotonDocument): Generator<BlockWithPage> {
  for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex++) {
    const page = document.pages[pageIndex];
    if (!page) continue;
    for (const block of page.blocks) {
      yield { block, pageIndex, pageNumber: page.page_number };
    }
  }
}
