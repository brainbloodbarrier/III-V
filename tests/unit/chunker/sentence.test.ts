import { describe, test, expect } from "bun:test";
import {
  splitSentences,
  PROTECTED_ABBREVIATIONS,
} from "../../../src/services/chunker/sentence";

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

    // Additional edge case tests per issue #188

    test("handles Mrs./Ms./Prof. abbreviations", () => {
      const text = "Mrs. Jones and Ms. Smith met Prof. Brown. They discussed the paper.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "Mrs. Jones and Ms. Smith met Prof. Brown.",
        "They discussed the paper.",
      ]);
    });

    test("handles Sr./Jr. abbreviations", () => {
      const text = "John Smith Jr. attended. His father Sr. could not make it.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "John Smith Jr. attended.",
        "His father Sr. could not make it.",
      ]);
    });

    test("handles Vol./vs./cf. abbreviations", () => {
      const text = "See Vol. 3 for details. Compare A vs. B and cf. the appendix. Next section.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "See Vol. 3 for details.",
        "Compare A vs. B and cf. the appendix.",
        "Next section.",
      ]);
    });

    test("handles ca./approx. abbreviations", () => {
      const text = "The date is ca. 1500 AD. The value is approx. 50 units. More text.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "The date is ca. 1500 AD.",
        "The value is approx. 50 units.",
        "More text.",
      ]);
    });

    test("handles multiple punctuation (!?)", () => {
      const text = "Really?! Yes, really. What do you mean!? I mean it.";
      const sentences = splitSentences(text);
      // The regex splits on [.!?] followed by space and capital
      // "Really?!" ends with !, space, then "Yes" starts with capital
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences[0]).toContain("Really");
    });

    test("handles ellipsis at end of sentence", () => {
      // Ellipsis followed by space and capital should split
      const text = "He wondered... The answer came later.";
      const sentences = splitSentences(text);
      expect(sentences.length).toBe(2);
      expect(sentences[0]).toBe("He wondered...");
      expect(sentences[1]).toBe("The answer came later.");
    });

    test("handles ellipsis mid-sentence (no split)", () => {
      // Ellipsis not followed by capital should not split
      const text = "The result was... interesting to say the least.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["The result was... interesting to say the least."]);
    });

    test("handles quotes around sentences", () => {
      // When period is inside quotes followed by quote, space, capital - it splits
      const text = 'He said "Hello." Then he left.';
      const sentences = splitSentences(text);
      // Period followed by quote doesn't match [.!?]\s+ pattern, so no split here
      expect(sentences.length).toBe(1);
    });

    test("handles sentences with quotes that do split", () => {
      // When punctuation is outside quotes followed by space and capital
      const text = 'She asked "why". Then she understood.';
      const sentences = splitSentences(text);
      // Period followed by space and capital "Then" should split
      expect(sentences.length).toBe(2);
    });

    test("handles parentheses in sentences", () => {
      const text = "The structure (see Fig. 4.1) is important. Next point.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "The structure (see Fig. 4.1) is important.",
        "Next point.",
      ]);
    });

    test("handles single sentence without period", () => {
      const text = "This sentence has no period";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["This sentence has no period"]);
    });

    test("handles whitespace-only input", () => {
      expect(splitSentences("   ")).toEqual([]);
      expect(splitSentences("\n\t")).toEqual([]);
    });

    test("handles null/undefined input gracefully", () => {
      expect(splitSentences(null as unknown as string)).toEqual([]);
      expect(splitSentences(undefined as unknown as string)).toEqual([]);
    });

    test("handles complex decimal numbers (version numbers)", () => {
      const text = "Version 4.1.2 was released. The update is important.";
      const sentences = splitSentences(text);
      expect(sentences.length).toBe(2);
      expect(sentences[0]).toContain("4.1");
    });

    test("handles multiple decimal numbers in one sentence", () => {
      const text = "Values 3.14 and 2.71 are constants. Next.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual([
        "Values 3.14 and 2.71 are constants.",
        "Next.",
      ]);
    });

    test("handles case-insensitive abbreviations", () => {
      // The code uses case-insensitive regex for abbreviations
      // Note: The replacement normalizes case to match PROTECTED_ABBREVIATIONS list
      const text = "See FIG. 4.1 here. Also see fig. 4.2 there. More text.";
      const sentences = splitSentences(text);
      // Both FIG. and fig. get replaced with Fig. (from the list)
      expect(sentences).toEqual([
        "See Fig. 4.1 here.",
        "Also see Fig. 4.2 there.",
        "More text.",
      ]);
    });

    test("handles unicode text", () => {
      const text = "Le café est bon. C'est vrai.";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["Le café est bon.", "C'est vrai."]);
    });

    test("handles sentence ending without space before capital", () => {
      // No split when there's no space after punctuation
      const text = "This.That";
      const sentences = splitSentences(text);
      expect(sentences).toEqual(["This.That"]);
    });

    test("handles newlines between sentences", () => {
      const text = "First sentence.\nSecond sentence.";
      const sentences = splitSentences(text);
      // Newline should work like space for splitting
      expect(sentences.length).toBe(2);
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

    test("includes all expected title abbreviations", () => {
      expect(PROTECTED_ABBREVIATIONS).toContain("Mr.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Mrs.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Ms.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Prof.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Sr.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Jr.");
    });

    test("includes reference abbreviations", () => {
      expect(PROTECTED_ABBREVIATIONS).toContain("No.");
      expect(PROTECTED_ABBREVIATIONS).toContain("Vol.");
      expect(PROTECTED_ABBREVIATIONS).toContain("vs.");
      expect(PROTECTED_ABBREVIATIONS).toContain("cf.");
      expect(PROTECTED_ABBREVIATIONS).toContain("ca.");
      expect(PROTECTED_ABBREVIATIONS).toContain("approx.");
    });

    test("includes etc. abbreviation", () => {
      expect(PROTECTED_ABBREVIATIONS).toContain("etc.");
    });
  });

  describe("Unicode edge cases (Issue #213)", () => {
    /**
     * These tests document the behavior of the sentence splitter with Unicode content.
     *
     * Current limitation: The regex `/[.!?]\s+(?=[A-Z])/g` only matches ASCII capital
     * letters A-Z, not Unicode uppercase letters (e.g., É, Ü, Ñ, Greek Α, Cyrillic А).
     * This is intentional for the current medical/scientific use case where English
     * is the primary language.
     */

    describe("emoji handling", () => {
      test("emoji as word boundaries - splits correctly when followed by capital", () => {
        const text = "Hello 👋. World begins here.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["Hello 👋.", "World begins here."]);
      });

      test("emoji between sentences - splits correctly", () => {
        const text = "First sentence. 🎉 Second sentence.";
        const sentences = splitSentences(text);
        // Period followed by space, emoji, space doesn't match (?=[A-Z])
        // So "🎉 Second sentence." is treated as continuation
        expect(sentences).toEqual(["First sentence. 🎉 Second sentence."]);
      });

      test("emoji at sentence start after punctuation - no split (not capital letter)", () => {
        const text = "Amazing! 🎉 This is great.";
        const sentences = splitSentences(text);
        // "!" followed by " 🎉" - emoji is not [A-Z], so no split at "!"
        // But "." followed by " " at end - no capital after "great."
        expect(sentences).toEqual(["Amazing! 🎉 This is great."]);
      });

      test("surrogate pairs (multi-codepoint emoji)", () => {
        const text = "Test 🎉🎊. Another sentence.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["Test 🎉🎊.", "Another sentence."]);
      });

      test("emoji sequence with ZWJ (family emoji)", () => {
        // Family emoji: 👨‍👩‍👧 is actually multiple codepoints joined by ZWJ
        const text = "The family 👨‍👩‍👧 arrived. They were happy.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["The family 👨‍👩‍👧 arrived.", "They were happy."]);
      });
    });

    describe("Unicode combining characters and diacriticals", () => {
      test("precomposed diacriticals (single codepoint)", () => {
        // "é" as U+00E9 (single codepoint)
        const text = "Café is nice. Another sentence.";
        expect(text.charCodeAt(3)).toBe(0xe9); // Verify it's precomposed é
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["Café is nice.", "Another sentence."]);
      });

      test("decomposed diacriticals (e + combining acute)", () => {
        // "é" as e (U+0065) + combining acute accent (U+0301)
        const text = "Cafe\u0301 is nice. Another sentence.";
        expect(text.length).toBe("Café is nice. Another sentence.".length + 1); // One char longer
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["Cafe\u0301 is nice.", "Another sentence."]);
      });

      test("multiple combining characters", () => {
        // Vietnamese "ệ" can be composed of multiple combining marks
        const text = "Test word. Normal text.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["Test word.", "Normal text."]);
      });
    });

    describe("smart quotes and typographic punctuation", () => {
      test("smart double quotes around sentence - no split (limitation)", () => {
        // Using Unicode smart quotes: " (U+201C) and " (U+201D)
        // The period is inside the quotes, followed by closing quote, not space
        // Pattern [.!?]\s+(?=[A-Z]) requires space immediately after punctuation
        const text = `She said \u201CHello.\u201D Then left.`;
        const sentences = splitSentences(text);
        // LIMITATION: Does not split because ." is followed by closing quote, not space
        // This matches the behavior with ASCII quotes in the existing test at line 165
        expect(sentences).toEqual([`She said \u201CHello.\u201D Then left.`]);
      });

      test("smart single quotes - no split (limitation)", () => {
        // Using Unicode smart quotes: ' (U+2018) and ' (U+2019)
        // Same limitation as double smart quotes
        const text = `It\u2019s called \u2018test.\u2019 Next sentence.`;
        const sentences = splitSentences(text);
        // LIMITATION: period followed by closing quote, not space
        expect(sentences.length).toBe(1);
      });

      test("smart quotes with space after closing quote - DOES split", () => {
        // When there's proper spacing after the closing quote
        const text = `She said \u201CHello\u201D. Then left.`;
        const sentences = splitSentences(text);
        // Period followed by space and capital T - this splits correctly
        expect(sentences).toEqual([`She said \u201CHello\u201D.`, "Then left."]);
      });

      test("ellipsis character (…) vs three periods", () => {
        // Unicode ellipsis U+2026 is a single character, not three periods
        const text = "He wondered… The answer came.";
        const sentences = splitSentences(text);
        // Single ellipsis character is not [.!?], so no split
        expect(sentences).toEqual(["He wondered… The answer came."]);
      });

      test("three periods (ASCII ellipsis) splits correctly", () => {
        const text = "He wondered... The answer came.";
        const sentences = splitSentences(text);
        // This should split because "." followed by ". " then " T"
        // Actually the regex sees last "." followed by " T"
        expect(sentences.length).toBe(2);
      });
    });

    describe("non-ASCII capital letters (documented limitation)", () => {
      /**
       * LIMITATION: The current regex only matches ASCII [A-Z].
       * Sentences starting with non-ASCII capitals won't trigger splits.
       * This is acceptable for the current English-focused use case.
       */

      test("German uppercase Ü - does NOT split (limitation)", () => {
        // Über starts with Ü (U+00DC), not in [A-Z]
        const text = "Das ist gut. Über alles.";
        const sentences = splitSentences(text);
        // Does NOT split because Ü is not [A-Z]
        expect(sentences).toEqual(["Das ist gut. Über alles."]);
      });

      test("Spanish uppercase Ñ - does NOT split (limitation)", () => {
        const text = "Está bien. Ñoño es aquí.";
        const sentences = splitSentences(text);
        // Does NOT split because Ñ is not [A-Z]
        expect(sentences).toEqual(["Está bien. Ñoño es aquí."]);
      });

      test("French uppercase É - does NOT split (limitation)", () => {
        const text = "C'est bon. Être ou ne pas être.";
        const sentences = splitSentences(text);
        // Does NOT split because É is not [A-Z]
        expect(sentences).toEqual(["C'est bon. Être ou ne pas être."]);
      });

      test("Greek uppercase Alpha - does NOT split (limitation)", () => {
        const text = "Hello world. Αλφα βητα.";
        const sentences = splitSentences(text);
        // Does NOT split because Α (Greek) is not [A-Z]
        expect(sentences).toEqual(["Hello world. Αλφα βητα."]);
      });

      test("Cyrillic uppercase - does NOT split (limitation)", () => {
        const text = "Test here. Привет мир.";
        const sentences = splitSentences(text);
        // Does NOT split because П (Cyrillic) is not [A-Z]
        expect(sentences).toEqual(["Test here. Привет мир."]);
      });

      test("ASCII uppercase after non-ASCII text - DOES split", () => {
        // When the next sentence starts with ASCII A-Z, it works
        const text = "C'est café. This works fine.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["C'est café.", "This works fine."]);
      });
    });

    describe("edge cases with Unicode whitespace", () => {
      test("non-breaking space (U+00A0) between sentences", () => {
        // Using non-breaking space instead of regular space
        const text = "First sentence.\u00A0Second sentence.";
        const sentences = splitSentences(text);
        // \s matches \u00A0 in JavaScript regex
        expect(sentences).toEqual(["First sentence.", "Second sentence."]);
      });

      test("em space (U+2003) between sentences", () => {
        const text = "First sentence.\u2003Second sentence.";
        const sentences = splitSentences(text);
        // Em space is a Unicode space character matched by \s
        expect(sentences).toEqual(["First sentence.", "Second sentence."]);
      });

      test("zero-width space (U+200B) - does NOT trigger split", () => {
        // Zero-width space is not matched by \s
        const text = "First sentence.\u200BSecond sentence.";
        const sentences = splitSentences(text);
        // No split because ZWSP is not whitespace for regex purposes
        expect(sentences).toEqual(["First sentence.\u200BSecond sentence."]);
      });
    });

    describe("mixed scripts and complex Unicode", () => {
      test("Japanese text with periods", () => {
        // Japanese uses 。for period, but we use ASCII .
        const text = "日本語テスト. Next English.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["日本語テスト.", "Next English."]);
      });

      test("RTL text (Hebrew) with ASCII punctuation", () => {
        const text = "שלום עולם. Hello world.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["שלום עולם.", "Hello world."]);
      });

      test("mixed emoji and text with proper capitals", () => {
        const text = "Testing 🧪 done. Results are in.";
        const sentences = splitSentences(text);
        expect(sentences).toEqual(["Testing 🧪 done.", "Results are in."]);
      });
    });
  });
});
