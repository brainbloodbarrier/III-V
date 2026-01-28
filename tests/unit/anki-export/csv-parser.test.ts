import { describe, test, expect } from 'bun:test';
import {
  parseCSVLine,
  escapeCSV,
  escapeCSVQuoted,
  parseCSV,
  toCSVLine,
} from '../../../src/anki-export/lib/csv-parser';

describe('csv-parser', () => {
  describe('parseCSVLine', () => {
    test('parses simple unquoted fields', () => {
      const result = parseCSVLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('parses quoted fields', () => {
      const result = parseCSVLine('"hello","world"');
      expect(result).toEqual(['hello', 'world']);
    });

    test('handles commas inside quotes', () => {
      const result = parseCSVLine('"hello, world",test');
      expect(result).toEqual(['hello, world', 'test']);
    });

    test('handles escaped quotes (doubled)', () => {
      const result = parseCSVLine('"say ""hello""",test');
      expect(result).toEqual(['say "hello"', 'test']);
    });

    test('handles mixed quoted and unquoted', () => {
      const result = parseCSVLine('simple,"with, comma",another');
      expect(result).toEqual(['simple', 'with, comma', 'another']);
    });

    test('handles empty fields', () => {
      const result = parseCSVLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });

    test('handles empty quoted fields', () => {
      const result = parseCSVLine('"",b,""');
      expect(result).toEqual(['', 'b', '']);
    });

    test('handles newlines inside quotes', () => {
      const result = parseCSVLine('"line1\nline2",b');
      expect(result).toEqual(['line1\nline2', 'b']);
    });

    test('handles single field', () => {
      const result = parseCSVLine('only');
      expect(result).toEqual(['only']);
    });

    test('handles empty string', () => {
      const result = parseCSVLine('');
      expect(result).toEqual(['']);
    });
  });

  describe('escapeCSV', () => {
    test('returns unquoted for simple text', () => {
      expect(escapeCSV('hello')).toBe('hello');
    });

    test('quotes field with comma', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    test('quotes field with newline', () => {
      expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    });

    test('escapes and quotes field with quote', () => {
      expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    });

    test('handles field with all special chars', () => {
      expect(escapeCSV('a,b\n"c"')).toBe('"a,b\n""c"""');
    });

    test('returns empty string for empty input', () => {
      expect(escapeCSV('')).toBe('');
    });
  });

  describe('escapeCSVQuoted', () => {
    test('always quotes simple text', () => {
      expect(escapeCSVQuoted('hello')).toBe('"hello"');
    });

    test('escapes quotes inside', () => {
      expect(escapeCSVQuoted('say "hi"')).toBe('"say ""hi"""');
    });

    test('quotes empty string', () => {
      expect(escapeCSVQuoted('')).toBe('""');
    });
  });

  describe('parseCSV', () => {
    test('parses CSV with header', () => {
      const csv = 'name,age\nAlice,30\nBob,25';
      const result = parseCSV(csv);
      expect(result.header).toEqual(['name', 'age']);
      expect(result.rows).toEqual([
        ['Alice', '30'],
        ['Bob', '25'],
      ]);
    });

    test('parses CSV without header', () => {
      const csv = 'Alice,30\nBob,25';
      const result = parseCSV(csv, false);
      expect(result.header).toEqual([]);
      expect(result.rows).toEqual([
        ['Alice', '30'],
        ['Bob', '25'],
      ]);
    });

    test('skips empty lines', () => {
      const csv = 'name,age\nAlice,30\n\nBob,25\n';
      const result = parseCSV(csv);
      expect(result.rows).toHaveLength(2);
    });

    test('handles empty content', () => {
      const result = parseCSV('');
      // Empty string still produces one empty field as header
      expect(result.header).toEqual(['']);
      expect(result.rows).toEqual([]);
    });
  });

  describe('toCSVLine', () => {
    test('creates CSV line from fields', () => {
      const result = toCSVLine(['a', 'b', 'c']);
      expect(result).toBe('a,b,c');
    });

    test('escapes fields with special chars', () => {
      const result = toCSVLine(['simple', 'with, comma', 'end']);
      expect(result).toBe('simple,"with, comma",end');
    });

    test('quotes all fields when alwaysQuote is true', () => {
      const result = toCSVLine(['a', 'b', 'c'], true);
      expect(result).toBe('"a","b","c"');
    });

    test('handles empty array', () => {
      const result = toCSVLine([]);
      expect(result).toBe('');
    });
  });
});
