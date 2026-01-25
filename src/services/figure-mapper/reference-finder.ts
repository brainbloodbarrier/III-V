/**
 * Finds figure references in text content.
 * Handles various formats: Fig. X.Y, Figs. X.Y-X.Z, $Fig. X.Y$, etc.
 */

/**
 * Parsed figure number.
 */
export interface FigureNumber {
  chapter: number;
  figure: number;
}

/**
 * Parses a figure number string like "4.1" into components.
 */
export function parseFigureNumber(numStr: string): FigureNumber | null {
  const match = numStr.match(/^(\d+)\.(\d+)$/);
  if (!match?.[1] || !match?.[2]) return null;
  return {
    chapter: parseInt(match[1], 10),
    figure: parseInt(match[2], 10),
  };
}

/**
 * Expands a figure range into individual figure IDs.
 */
export function expandFigureRange(
  start: string,
  endNum: string | null
): string[] {
  if (!endNum) {
    return [start];
  }

  const startMatch = start.match(/Fig\.\s*(\d+)\.(\d+)/);
  if (!startMatch?.[1] || !startMatch?.[2]) {
    return [start];
  }

  const chapter = parseInt(startMatch[1], 10);
  const startFig = parseInt(startMatch[2], 10);

  // Parse end number - might be just "5" or "4.5"
  let endFig: number;
  if (endNum.includes(".")) {
    const parsed = parseFigureNumber(endNum);
    if (!parsed || parsed.chapter !== chapter) {
      return [start];
    }
    endFig = parsed.figure;
  } else {
    endFig = parseInt(endNum, 10);
  }

  const figures: string[] = [];
  for (let i = startFig; i <= endFig; i++) {
    figures.push(`Fig. ${chapter}.${i}`);
  }
  return figures;
}

/**
 * Finds all figure references in text.
 * Returns deduplicated list of figure IDs in "Fig. X.Y" format.
 */
export function findFigureReferences(text: string): string[] {
  const references = new Set<string>();

  // Pattern for single Fig. X.Y (with optional $ or * wrappers)
  const singlePattern = /\$?Fig\.\s*(\d+\.\d+)\$?/gi;
  let match;
  while ((match = singlePattern.exec(text)) !== null) {
    if (match[1]) {
      references.add(`Fig. ${match[1]}`);
    }
  }

  // Pattern for Figs. X.Y-X.Z range with optional "and X.Y" suffix
  const rangeWithAndPattern =
    /\*?Figs\.\s*(\d+\.\d+)\s*[-–]\s*(\d+\.?\d*)(?:\s+and\s+(\d+\.\d+))?\*?/gi;
  while ((match = rangeWithAndPattern.exec(text)) !== null) {
    if (match[1] && match[2]) {
      const expanded = expandFigureRange(`Fig. ${match[1]}`, match[2]);
      for (const fig of expanded) {
        references.add(fig);
      }
      // Handle "and X.Y" suffix
      if (match[3]) {
        references.add(`Fig. ${match[3]}`);
      }
    }
  }

  // Pattern for Figs. X.Y, X.Z, and X.W (comma-separated)
  const commaPattern = /Figs\.\s*([\d.,\s]+(?:and\s+\d+\.\d+)?)/gi;
  while ((match = commaPattern.exec(text)) !== null) {
    if (match[1]) {
      const numbers = match[1].match(/\d+\.\d+/g);
      if (numbers) {
        for (const num of numbers) {
          references.add(`Fig. ${num}`);
        }
      }
    }
  }

  return Array.from(references).sort();
}
