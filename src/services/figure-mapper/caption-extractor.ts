/**
 * Extracts figure information from caption blocks.
 * Handles inline image references in markdown format.
 */

/**
 * Pattern for markdown image syntax: ![alt](_page_N_Figure_M.jpeg)
 */
const INLINE_IMAGE_PATTERN = /!\[[^\]]*\]\(([^)]+)\)/;

/**
 * Pattern for figure ID: FIGURE X.Y or Fig. X.Y
 */
const FIGURE_ID_PATTERN = /(?:FIGURE|Fig\.)\s*(\d+\.\d+)/i;

/**
 * Extracts inline image filename from caption.
 */
export function extractInlineImage(caption: string): string | null {
  const match = caption.match(INLINE_IMAGE_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Extracts figure ID (normalized to "Fig. X.Y" format).
 */
export function extractFigureId(caption: string): string | null {
  const match = caption.match(FIGURE_ID_PATTERN);
  if (match?.[1]) {
    return `Fig. ${match[1]}`;
  }
  return null;
}

/**
 * Extracts the caption text, removing image reference and figure ID prefix.
 */
export function extractCaptionText(caption: string): string {
  let text = caption;

  // Remove inline image reference
  text = text.replace(INLINE_IMAGE_PATTERN, "");

  // Remove figure ID prefix (FIGURE X.Y. or Fig. X.Y.)
  text = text.replace(/^(?:FIGURE|Fig\.)\s*\d+\.\d+\.?\s*/im, "");

  // Clean up extra whitespace and newlines at start
  text = text.replace(/^\s+/, "");

  return text.trim();
}

/**
 * Full caption extraction result.
 */
export interface CaptionInfo {
  figureId: string | null;
  imageFile: string | null;
  captionText: string;
  rawCaption: string;
}

/**
 * Extracts all information from a caption block.
 */
export function extractCaption(caption: string): CaptionInfo {
  return {
    figureId: extractFigureId(caption),
    imageFile: extractInlineImage(caption),
    captionText: extractCaptionText(caption),
    rawCaption: caption,
  };
}
