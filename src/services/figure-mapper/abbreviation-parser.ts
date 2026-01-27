/**
 * Parses abbreviation blocks in figure captions.
 * Format: "Ant., anterior; Post., posterior; V., vein."
 */

/**
 * Pattern for a single abbreviation: "Abbr., expansion"
 */
const ABBREV_PATTERN = /([A-Z][a-z]*\.),\s*([^;.]+)/g;

/**
 * Pattern to detect if a line contains abbreviations.
 * Looks for multiple "X., word" patterns separated by semicolons.
 */
const ABBREV_LINE_PATTERN = /[A-Z][a-z]*\.,\s*[a-z]+(?:\s+[a-z]+)*;/;

/**
 * Checks if a line appears to be an abbreviation line.
 */
export function isAbbreviationLine(line: string): boolean {
  // Must have at least one semicolon-separated abbreviation OR end with period after abbreviation
  return (
    ABBREV_LINE_PATTERN.test(line) ||
    /[A-Z][a-z]*\.,\s*[a-z]+(?:\s+[a-z]+)*\.?$/.test(line.trim())
  );
}

/**
 * Parses abbreviation text into key-value pairs.
 */
export function parseAbbreviations(text: string): Record<string, string> {
  const abbreviations: Record<string, string> = {};

  // Reset pattern index
  ABBREV_PATTERN.lastIndex = 0;

  let match;
  while ((match = ABBREV_PATTERN.exec(text)) !== null) {
    const abbrev = match[1];
    const expansion = match[2]?.trim();
    if (abbrev && expansion) {
      abbreviations[abbrev] = expansion;
    }
  }

  return abbreviations;
}

/**
 * Finds the abbreviation block at the end of a caption.
 * Abbreviation blocks typically appear as the last paragraph(s).
 */
export function findAbbreviationBlock(caption: string): string | null {
  const lines = caption.split("\n");
  const abbrevLines: string[] = [];

  // Work backwards from end to find abbreviation lines
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;

    if (isAbbreviationLine(line)) {
      abbrevLines.unshift(line);
    } else {
      // Stop when we hit a non-abbreviation line
      break;
    }
  }

  if (abbrevLines.length === 0) {
    return null;
  }

  return abbrevLines.join("\n");
}

/**
 * Extracts abbreviations from a caption.
 */
export function extractAbbreviationsFromCaption(
  caption: string
): Record<string, string> {
  const block = findAbbreviationBlock(caption);
  if (!block) {
    return {};
  }
  return parseAbbreviations(block);
}
