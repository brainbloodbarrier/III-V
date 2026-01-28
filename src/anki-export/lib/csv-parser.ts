/**
 * Shared CSV parsing utilities for anki-export pipeline.
 * Extracted from classify-difficulty.ts, add-hints.ts, csv-to-anki.ts
 *
 * Issue #256 - Extract duplicated parseCSVLine to shared module
 * Issue #257 - Fix escapeCSV adds unnecessary quotes
 */

/**
 * Parse a CSV line handling quoted fields correctly.
 * Supports:
 * - Quoted fields with commas inside
 * - Escaped quotes (doubled "")
 * - Mixed quoted and unquoted fields
 *
 * @param line - A single CSV line to parse
 * @returns Array of field values
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (only outside quotes)
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last field
  result.push(current);
  return result;
}

/**
 * Escape a field for CSV output.
 * Only adds quotes when necessary (contains comma, quote, or newline).
 *
 * Issue #257 - Fixed to not add unnecessary quotes
 *
 * @param field - The field value to escape
 * @returns Properly escaped CSV field
 */
export function escapeCSV(field: string): string {
  // Only quote if field contains special characters
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Escape a field for CSV output, always quoting.
 * Use this when you want consistent quoting for all fields.
 *
 * @param field - The field value to escape
 * @returns Quoted CSV field
 */
export function escapeCSVQuoted(field: string): string {
  return `"${field.replace(/"/g, '""')}"`;
}

/**
 * Parse an entire CSV content string.
 *
 * @param content - Full CSV content with header
 * @param hasHeader - Whether first line is header (default: true)
 * @returns Object with header array and data rows
 */
export function parseCSV(content: string, hasHeader = true): {
  header: string[];
  rows: string[][];
} {
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    return { header: [], rows: [] };
  }

  const header = hasHeader ? parseCSVLine(lines[0] ?? '') : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: string[][] = [];
  for (const line of dataLines) {
    if (line.trim()) {
      rows.push(parseCSVLine(line));
    }
  }

  return { header, rows };
}

/**
 * Convert array of fields to CSV line.
 *
 * @param fields - Array of field values
 * @param alwaysQuote - Whether to always quote fields (default: false)
 * @returns CSV line string
 */
export function toCSVLine(fields: string[], alwaysQuote = false): string {
  const escapeFn = alwaysQuote ? escapeCSVQuoted : escapeCSV;
  return fields.map(escapeFn).join(',');
}
