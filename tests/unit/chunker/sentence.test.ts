import { describe, test, expect } from "bun:test";
import { splitSentences, PROTECTED_ABBREVIATIONS } from "../../../src/services/chunker/sentence";

describe("sentence detection", () => {
  describe("splitSentences", () => {
    test("splits simple sentences at period", () => {
      const text = "First sentence. Second sentence.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["First sentence.", "Second sentence."]);
    });

    test("splits at question marks", () => {
      const text = "What is this? It is a test.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["What is this?", "It is a test."]);
    });

    test("splits at exclamation marks", () => {
      const text = "Amazing! This works.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["Amazing!", "This works."]);
    });

    test("protects Fig. abbreviation", () => {
      const text = "See Fig. 4.1 for details. The next sentence.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "See Fig. 4.1 for details.",
        "The next sentence.",
      ]);
    });

    test("protects Dr. abbreviation", () => {
      const text = "Dr. Smith wrote this. It is important.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "Dr. Smith wrote this.",
        "It is important.",
      ]);
    });

    test("protects multiple abbreviations", () => {
      const text = "e.g. this example and i.e. that one. Next sentence.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "e.g. this example and i.e. that one.",
        "Next sentence.",
      ]);
    });

    test("handles et al. citation", () => {
      const text = "According to Rhoton et al. the veins are important. This is true.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "According to Rhoton et al. the veins are important.",
        "This is true.",
      ]);
    });

    test("does not split on decimal numbers", () => {
      const text = "The value is 3.14 units. Next sentence.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "The value is 3.14 units.",
        "Next sentence.",
      ]);
    });

    test("handles single sentence", () => {
      const text = "Just one sentence here.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["Just one sentence here."]);
    });

    test("handles empty string", () => {
      const sentences = splitSentences("");
      expect(sentences).toEqual([]);
    });

    test("preserves whitespace within sentences", () => {
      const text = "First  sentence   here. Second one.";
      const sentences = splitSentences(text);
      expect(sentences[0]).toContain("  ");
    });

    test("handles No. abbreviation", () => {
      const text = "Item No. 5 is here. Next item.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "Item No. 5 is here.",
        "Next item.",
      ]);
    });
  });

  describe("PROTECTED_ABBREVIATIONS", () => {
    test("includes common medical/scientific abbreviations", () => {
      expect(PROTECTED_ABBREVIATIONS).toContain("Fig.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Dr.");
      expect(PROTECTED_ABBREVIATIONS).toContain("et al.");
      expect(PROTECTED_ABBREVIATIONS).toContain("i.e.");
      expect(PROTECTED_ABBREVIATIONS).toContain("e.g.");
    });
  });
});
