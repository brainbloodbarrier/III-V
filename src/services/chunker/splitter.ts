import type { ContentBlock } from "../../models/document";
import type { Chunk } from "../../models/chunk";
import { estimateTokens, MAX_TOKENS, HARD_MAX_TOKENS } from "./tokenizer";
import { splitSentences } from "./sentence";

/**
 * Splits a content block into chunks.
 * Uses recursive splitting: paragraphs first, then sentences.
 */
export function splitBlock(
  block: ContentBlock,
  breadcrumb: string[],
  breadcrumbText: string,
  documentId: string
): Partial<Chunk>[] {
  const content = block.content;
  const breadcrumbTokens = estimateTokens(breadcrumbText + "\n\n");
  const availableTokens = MAX_TOKENS - breadcrumbTokens;

  // Check if content fits in a single chunk
  const contentTokens = estimateTokens(content);
  if (contentTokens <= availableTokens) {
    return [createChunk(content, block, breadcrumb, breadcrumbText, documentId)];
  }

  // Need to split - try paragraphs first
  const paragraphs = content.split(/\n\n+/);
  if (paragraphs.length > 1) {
    return splitByParagraphs(paragraphs, block, breadcrumb, breadcrumbText, documentId, availableTokens);
  }

  // No paragraphs - split by sentences
  return splitBySentences(content, block, breadcrumb, breadcrumbText, documentId, availableTokens);
}

/**
 * Split content by paragraph breaks, accumulating until max tokens.
 */
function splitByParagraphs(
  paragraphs: string[],
  block: ContentBlock,
  breadcrumb: string[],
  breadcrumbText: string,
  documentId: string,
  availableTokens: number
): Partial<Chunk>[] {
  const chunks: Partial<Chunk>[] = [];
  let currentContent = "";
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // Check if single paragraph exceeds limit
    if (paragraphTokens > availableTokens) {
      // Flush current content first
      if (currentContent) {
        chunks.push(createChunk(currentContent.trim(), block, breadcrumb, breadcrumbText, documentId));
        currentContent = "";
        currentTokens = 0;
      }
      // Split this large paragraph by sentences
      const sentenceChunks = splitBySentences(paragraph, block, breadcrumb, breadcrumbText, documentId, availableTokens);
      chunks.push(...sentenceChunks);
      continue;
    }

    // Check if adding this paragraph would exceed limit
    if (currentTokens + paragraphTokens + 2 > availableTokens && currentContent) {
      chunks.push(createChunk(currentContent.trim(), block, breadcrumb, breadcrumbText, documentId));
      currentContent = "";
      currentTokens = 0;
    }

    // Add paragraph to current chunk
    currentContent += (currentContent ? "\n\n" : "") + paragraph;
    currentTokens += paragraphTokens + (currentContent ? 2 : 0);
  }

  // Don't forget remaining content
  if (currentContent.trim()) {
    chunks.push(createChunk(currentContent.trim(), block, breadcrumb, breadcrumbText, documentId));
  }

  return chunks;
}

/**
 * Split content by sentence boundaries.
 */
function splitBySentences(
  content: string,
  block: ContentBlock,
  breadcrumb: string[],
  breadcrumbText: string,
  documentId: string,
  availableTokens: number
): Partial<Chunk>[] {
  const sentences = splitSentences(content);
  const chunks: Partial<Chunk>[] = [];
  let currentSentences: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // Handle very long single sentence (fallback to character split)
    if (sentenceTokens > availableTokens) {
      // Flush current
      if (currentSentences.length > 0) {
        chunks.push(createChunk(currentSentences.join(" "), block, breadcrumb, breadcrumbText, documentId));
        currentSentences = [];
        currentTokens = 0;
      }
      // Split by whitespace
      const wordChunks = splitByWhitespace(sentence, block, breadcrumb, breadcrumbText, documentId, availableTokens);
      chunks.push(...wordChunks);
      continue;
    }

    // Check if adding this sentence would exceed limit
    if (currentTokens + sentenceTokens + 1 > availableTokens && currentSentences.length > 0) {
      chunks.push(createChunk(currentSentences.join(" "), block, breadcrumb, breadcrumbText, documentId));
      currentSentences = [];
      currentTokens = 0;
    }

    currentSentences.push(sentence);
    currentTokens += sentenceTokens + 1;
  }

  // Don't forget remaining sentences
  if (currentSentences.length > 0) {
    chunks.push(createChunk(currentSentences.join(" "), block, breadcrumb, breadcrumbText, documentId));
  }

  return chunks;
}

/**
 * Fallback: split by whitespace for very long sentences.
 */
function splitByWhitespace(
  content: string,
  block: ContentBlock,
  breadcrumb: string[],
  breadcrumbText: string,
  documentId: string,
  availableTokens: number
): Partial<Chunk>[] {
  const words = content.split(/\s+/);
  const chunks: Partial<Chunk>[] = [];
  let currentWords: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = estimateTokens(word);

    if (currentTokens + wordTokens + 1 > availableTokens && currentWords.length > 0) {
      chunks.push(createChunk(currentWords.join(" "), block, breadcrumb, breadcrumbText, documentId));
      currentWords = [];
      currentTokens = 0;
    }

    currentWords.push(word);
    currentTokens += wordTokens + 1;
  }

  if (currentWords.length > 0) {
    chunks.push(createChunk(currentWords.join(" "), block, breadcrumb, breadcrumbText, documentId));
  }

  return chunks;
}

/**
 * Create a partial chunk with all metadata.
 */
function createChunk(
  content: string,
  block: ContentBlock,
  breadcrumb: string[],
  breadcrumbText: string,
  documentId: string
): Partial<Chunk> {
  const contentWithContext = `${breadcrumbText}\n\n${content}`;

  // Convert 0-based page number to 1-based for chunks
  const pageNumber = (block.page_number ?? 0) + 1;

  return {
    document_id: documentId,
    breadcrumb: breadcrumb.length > 0 ? breadcrumb : ["Document Root"],
    breadcrumb_text: breadcrumbText,
    content: content,
    content_with_context: contentWithContext,
    page_numbers: [pageNumber],
    source_block_ids: [block.id],
    parent_section_id: block.parent_hierarchy?.[block.parent_hierarchy.length - 1] || "",
    figure_references: [],
    token_count: estimateTokens(contentWithContext),
    character_count: content.length,
    overlap_tokens: 0,
    is_figure_caption: block.block_type === "figure_caption",
    is_table: block.block_type === "table",
    contains_abbreviations: false,
  };
}

/**
 * Generates chunk ID from document ID and sequence number.
 */
export function generateChunkId(documentId: string, sequenceNumber: number): string {
  return `${documentId}-chunk-${sequenceNumber.toString().padStart(4, "0")}`;
}
