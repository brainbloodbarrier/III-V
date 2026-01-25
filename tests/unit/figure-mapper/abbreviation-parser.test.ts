/**
 * Tests for parsing abbreviation blocks in figure captions.
 * Format: "A., artery; V., vein; Ant., anterior"
 */

import { describe, it, expect } from "bun:test";
import {
  parseAbbreviations,
  findAbbreviationBlock,
  isAbbreviationLine,
} from "../../../src/services/figure-mapper/abbreviation-parser.ts";

describe("Abbreviation Parser", () => {
  describe("isAbbreviationLine", () => {
    it("identifies abbreviation line", () => {
      expect(isAbbreviationLine("Ant., anterior; Post., posterior")).toBe(true);
    });

    it("rejects normal text", () => {
      expect(isAbbreviationLine("The cerebral veins drain the cortex.")).toBe(
        false
      );
    });

    it("handles single abbreviation", () => {
      expect(isAbbreviationLine("V., vein")).toBe(true);
    });
  });

  describe("parseAbbreviations", () => {
    it("parses semicolon-separated abbreviations", () => {
      const text = "Ant., anterior; Post., posterior; Sup., superior";
      const abbrevs = parseAbbreviations(text);
      expect(abbrevs).toEqual({
        "Ant.": "anterior",
        "Post.": "posterior",
        "Sup.": "superior",
      });
    });

    it("parses complex medical abbreviations", () => {
      const text =
        "A., artery; V., vein; N., nerve; Cent., central; Front., frontal";
      const abbrevs = parseAbbreviations(text);
      expect(abbrevs["A."]).toBe("artery");
      expect(abbrevs["V."]).toBe("vein");
      expect(abbrevs["N."]).toBe("nerve");
    });

    it("handles multi-word expansions", () => {
      const text = "Sag., sagittal sinus; Str., straight sinus";
      const abbrevs = parseAbbreviations(text);
      expect(abbrevs["Sag."]).toBe("sagittal sinus");
      expect(abbrevs["Str."]).toBe("straight sinus");
    });

    it("returns empty object for no abbreviations", () => {
      const text = "Normal sentence without abbreviations.";
      expect(parseAbbreviations(text)).toEqual({});
    });

    it("handles real caption abbreviation block", () => {
      const text =
        "Ant., anterior; Cent., central; Front., frontal; Mid., middle; Par., parietal; Post., posterior; Postcent., postcentral; Precent., precentral; Sag., sagittal; Sup., superior; Temp., temporal; Tent., tentorium; V., vein.";
      const abbrevs = parseAbbreviations(text);
      expect(abbrevs["Ant."]).toBe("anterior");
      expect(abbrevs["Tent."]).toBe("tentorium");
      expect(abbrevs["V."]).toBe("vein");
    });
  });

  describe("findAbbreviationBlock", () => {
    it("finds abbreviation block at end of caption", () => {
      const caption = `FIGURE 4.2. Some description here.
The veins drain the cortex.
Ant., anterior; Post., posterior; V., vein.`;
      const block = findAbbreviationBlock(caption);
      expect(block).toContain("Ant., anterior");
      expect(block).toContain("V., vein");
    });

    it("returns null when no abbreviation block", () => {
      const caption = "FIGURE 4.1. Simple caption without abbreviations.";
      expect(findAbbreviationBlock(caption)).toBeNull();
    });

    it("handles multi-line abbreviation block", () => {
      const caption = `FIGURE 4.3. Description.
Ant., anterior; Cent., central; Front., frontal;
Mid., middle; Par., parietal; Post., posterior.`;
      const block = findAbbreviationBlock(caption);
      expect(block).toBeTruthy();
    });
  });
});
