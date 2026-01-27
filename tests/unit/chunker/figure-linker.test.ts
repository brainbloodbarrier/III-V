import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  linkFigure,
  linkFigureWithIndex,
  createCaptionSnippet,
  createFigureRef,
  loadFigureMap,
  findFigureReferences,
  findFigureReferencesWithIndex,
  createFigureIndex,
  FigureIndex,
} from "../../../src/services/chunker/figure-linker";
import type { FigureMapEntry } from "../../../src/services/chunker/figure-linker";

describe("figure-linker", () => {
  // Sample figure map data matching Phase 1 output structure
  const mockFigureMap: Record<string, FigureMapEntry> = {
    "Fig. 4.1": {
      figure_id: "Fig. 4.1",
      page_number: 5,
      caption: "The superficial cerebral veins showing the superior sagittal sinus and its tributaries. A., artery; Ant., anterior; V., vein.",
      caption_block_id: "/page/5/FigureCaption/1",
      abbreviations: { "A.": "artery", "Ant.": "anterior", "V.": "vein" },
      status: "mapped",
      image_file: "image-012.jpg",
      image_path: "./rhoton-supratentorial-cerebral-veins/images/image-012.jpg",
    },
    "Fig. 4.2": {
      figure_id: "Fig. 4.2",
      page_number: 7,
      caption: "Deep venous system overview.",
      caption_block_id: "/page/7/FigureCaption/1",
      abbreviations: {},
      status: "mapped",
      image_file: "image-015.jpg",
      image_path: "./rhoton-supratentorial-cerebral-veins/images/image-015.jpg",
    },
    "Fig. 4.3": {
      figure_id: "Fig. 4.3",
      page_number: 10,
      caption: "Figure without image mapping.",
      caption_block_id: "/page/10/FigureCaption/1",
      abbreviations: {},
      status: "no-image-in-caption",
      image_file: "",
      image_path: "",
    },
  };

  describe("createCaptionSnippet", () => {
    test("returns full caption if under max length", () => {
      const caption = "Short caption text.";
      expect(createCaptionSnippet(caption, 100)).toBe("Short caption text.");
    });

    test("truncates long captions at word boundary", () => {
      const longCaption = "The superficial cerebral veins showing the superior sagittal sinus and its tributaries with many more words.";
      const snippet = createCaptionSnippet(longCaption, 50);
      expect(snippet.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(snippet).toEndWith("...");
    });

    test("handles exact length caption", () => {
      const caption = "x".repeat(100);
      expect(createCaptionSnippet(caption, 100)).toBe(caption);
    });

    test("returns empty string for empty caption", () => {
      expect(createCaptionSnippet("", 100)).toBe("");
    });
  });

  describe("createFigureRef", () => {
    test("creates FigureRef with all fields from entry", () => {
      const entry: FigureMapEntry = {
        figure_id: "Fig. 4.1",
        page_number: 5,
        caption: "Short caption text.",
        caption_block_id: "/page/5/FigureCaption/1",
        abbreviations: {},
        status: "mapped",
        image_file: "image-012.jpg",
        image_path: "./images/image-012.jpg",
      };

      const ref = createFigureRef(entry);

      expect(ref.figure_id).toBe("Fig. 4.1");
      expect(ref.image_path).toBe("./images/image-012.jpg");
      expect(ref.caption_snippet).toBe("Short caption text.");
    });

    test("normalizes undefined image_path to empty string", () => {
      const entry: FigureMapEntry = {
        figure_id: "Fig. 4.2",
        page_number: 7,
        caption: "A caption.",
        caption_block_id: "/page/7/FigureCaption/1",
        abbreviations: {},
        status: "no-image-in-caption",
        // image_path is undefined
      };

      const ref = createFigureRef(entry);

      expect(ref.image_path).toBe("");
    });

    test("truncates long captions to snippet", () => {
      const longCaption = "The superficial cerebral veins showing the superior sagittal sinus and its tributaries with many additional details about venous anatomy.";
      const entry: FigureMapEntry = {
        figure_id: "Fig. 4.3",
        page_number: 10,
        caption: longCaption,
        caption_block_id: "/page/10/FigureCaption/1",
        abbreviations: {},
        status: "mapped",
        image_path: "./images/image-015.jpg",
      };

      const ref = createFigureRef(entry);

      expect(ref.caption_snippet.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(ref.caption_snippet).toEndWith("...");
    });

    test("handles empty caption", () => {
      const entry: FigureMapEntry = {
        figure_id: "Fig. 4.4",
        page_number: 12,
        caption: "",
        caption_block_id: "/page/12/FigureCaption/1",
        abbreviations: {},
        status: "mapped",
        image_path: "./images/image-016.jpg",
      };

      const ref = createFigureRef(entry);

      expect(ref.caption_snippet).toBe("");
    });

    test("returns consistent structure for all FigureRef properties", () => {
      const entry: FigureMapEntry = {
        figure_id: "Fig. 5.1",
        page_number: 15,
        caption: "Test caption.",
        caption_block_id: "/page/15/FigureCaption/1",
        abbreviations: { "A.": "artery" },
        status: "mapped",
        image_file: "image.jpg",
        image_path: "./path/image.jpg",
        referencing_blocks: ["/page/14/Text/1"],
      };

      const ref = createFigureRef(entry);

      // Verify all expected properties exist
      expect(ref).toHaveProperty("figure_id");
      expect(ref).toHaveProperty("image_path");
      expect(ref).toHaveProperty("caption_snippet");

      // Verify no extra properties from FigureMapEntry leak through
      expect(ref).not.toHaveProperty("page_number");
      expect(ref).not.toHaveProperty("caption");
      expect(ref).not.toHaveProperty("caption_block_id");
      expect(ref).not.toHaveProperty("abbreviations");
      expect(ref).not.toHaveProperty("status");
      expect(ref).not.toHaveProperty("image_file");
      expect(ref).not.toHaveProperty("referencing_blocks");
    });
  });

  describe("linkFigure", () => {
    test("links caption block to figure reference", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/5/FigureCaption/1", figureMap);

      expect(ref).not.toBeNull();
      expect(ref?.figure_id).toBe("Fig. 4.1");
      expect(ref?.image_path).toBe("./rhoton-supratentorial-cerebral-veins/images/image-012.jpg");
    });

    test("creates caption snippet in reference", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/5/FigureCaption/1", figureMap);

      expect(ref?.caption_snippet).toBeDefined();
      expect(ref?.caption_snippet.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    test("returns null for unknown caption block", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/99/Unknown/1", figureMap);

      expect(ref).toBeNull();
    });

    test("handles figure with no image path", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const ref = linkFigure("/page/10/FigureCaption/1", figureMap);

      expect(ref).not.toBeNull();
      expect(ref?.figure_id).toBe("Fig. 4.3");
      // image_path should be empty string or handled gracefully
      expect(ref?.image_path).toBeDefined();
    });
  });

  describe("loadFigureMap", () => {
    const testDir = join(__dirname, "test-fixtures-figure-linker");
    const testFilePath = join(testDir, "figure_map.json");

    beforeEach(() => {
      // Create test directory
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up test directory
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true });
      }
    });

    test("successfully loads and parses valid JSON file", () => {
      writeFileSync(testFilePath, JSON.stringify(mockFigureMap));
      const map = loadFigureMap(testFilePath);

      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBe(3);
    });

    test("creates Map keyed by caption_block_id", () => {
      writeFileSync(testFilePath, JSON.stringify(mockFigureMap));
      const map = loadFigureMap(testFilePath);

      // Should be keyed by caption_block_id, not figure_id
      expect(map.has("/page/5/FigureCaption/1")).toBe(true);
      expect(map.has("/page/7/FigureCaption/1")).toBe(true);
      expect(map.has("/page/10/FigureCaption/1")).toBe(true);

      // Verify the entry data is preserved
      const entry = map.get("/page/5/FigureCaption/1");
      expect(entry?.figure_id).toBe("Fig. 4.1");
      expect(entry?.page_number).toBe(5);
    });

    test("throws error for missing file", () => {
      const nonExistentPath = join(testDir, "nonexistent.json");
      expect(() => loadFigureMap(nonExistentPath)).toThrow(
        `Figure map file not found: ${nonExistentPath}`
      );
    });

    test("throws error for malformed JSON", () => {
      writeFileSync(testFilePath, "{ invalid json }");
      expect(() => loadFigureMap(testFilePath)).toThrow();
    });

    test("handles empty figure map object", () => {
      writeFileSync(testFilePath, JSON.stringify({}));
      const map = loadFigureMap(testFilePath);

      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBe(0);
    });

    test("handles figure map with single entry", () => {
      const singleEntry = {
        "Fig. 1.1": mockFigureMap["Fig. 4.1"],
      };
      writeFileSync(testFilePath, JSON.stringify(singleEntry));
      const map = loadFigureMap(testFilePath);

      expect(map.size).toBe(1);
      expect(map.has("/page/5/FigureCaption/1")).toBe(true);
    });
  });

  describe("findFigureReferences", () => {
    // Create a proper Map keyed by caption_block_id for testing
    const createTestFigureMap = () => {
      const map = new Map<string, FigureMapEntry>();
      for (const entry of Object.values(mockFigureMap)) {
        map.set(entry.caption_block_id, entry);
      }
      return map;
    };

    test("finds single figure reference in text", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences("See Fig. 4.1 for details.", figureMap);

      expect(refs).toHaveLength(1);
      expect(refs[0].figure_id).toBe("Fig. 4.1");
      expect(refs[0].image_path).toBe(
        "./rhoton-supratentorial-cerebral-veins/images/image-012.jpg"
      );
    });

    test("finds multiple figure references in text", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences(
        "Compare Fig. 4.1 with Fig. 4.2 and Fig. 4.3.",
        figureMap
      );

      expect(refs).toHaveLength(3);
      const figureIds = refs.map((r) => r.figure_id);
      expect(figureIds).toContain("Fig. 4.1");
      expect(figureIds).toContain("Fig. 4.2");
      expect(figureIds).toContain("Fig. 4.3");
    });

    test("handles Fig. pattern without space after period", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences("See Fig.4.1 for details.", figureMap);

      expect(refs).toHaveLength(1);
      expect(refs[0].figure_id).toBe("Fig. 4.1");
    });

    test("deduplicates repeated figure references", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences(
        "See Fig. 4.1 in section 1. Also see Fig. 4.1 in section 2.",
        figureMap
      );

      expect(refs).toHaveLength(1);
      expect(refs[0].figure_id).toBe("Fig. 4.1");
    });

    test("returns empty array when no figures found", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences(
        "This text has no figure references.",
        figureMap
      );

      expect(refs).toHaveLength(0);
    });

    test("handles case variations (case insensitive)", () => {
      const figureMap = createTestFigureMap();

      // Test uppercase FIG.
      const refsUpper = findFigureReferences("See FIG. 4.1 for details.", figureMap);
      expect(refsUpper).toHaveLength(1);
      expect(refsUpper[0].figure_id).toBe("Fig. 4.1");

      // Test lowercase fig.
      const refsLower = findFigureReferences("See fig. 4.1 for details.", figureMap);
      expect(refsLower).toHaveLength(1);
      expect(refsLower[0].figure_id).toBe("Fig. 4.1");
    });

    test("creates proper FigureRef objects with image_path and caption_snippet", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences("See Fig. 4.1 for details.", figureMap);

      expect(refs).toHaveLength(1);
      const ref = refs[0];

      expect(ref).toHaveProperty("figure_id");
      expect(ref).toHaveProperty("image_path");
      expect(ref).toHaveProperty("caption_snippet");

      expect(ref.figure_id).toBe("Fig. 4.1");
      expect(ref.image_path).toBe(
        "./rhoton-supratentorial-cerebral-veins/images/image-012.jpg"
      );
      expect(ref.caption_snippet).toBeDefined();
      expect(ref.caption_snippet.length).toBeGreaterThan(0);
    });

    test("returns empty refs for figure IDs not in map", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences(
        "See Fig. 99.99 for details.",
        figureMap
      );

      // The pattern matches, but the figure is not in the map
      expect(refs).toHaveLength(0);
    });

    test("handles empty content string", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences("", figureMap);

      expect(refs).toHaveLength(0);
    });

    test("handles empty figure map", () => {
      const emptyMap = new Map<string, FigureMapEntry>();
      const refs = findFigureReferences("See Fig. 4.1 for details.", emptyMap);

      // Pattern matches but no figures in map
      expect(refs).toHaveLength(0);
    });

    test("handles figure with missing image_path", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences("See Fig. 4.3 for details.", figureMap);

      expect(refs).toHaveLength(1);
      expect(refs[0].figure_id).toBe("Fig. 4.3");
      // image_path should be empty string when not present
      expect(refs[0].image_path).toBe("");
    });

    test("handles mixed case references in same text", () => {
      const figureMap = createTestFigureMap();
      const refs = findFigureReferences(
        "See FIG. 4.1 and fig. 4.2 for details.",
        figureMap
      );

      expect(refs).toHaveLength(2);
      const figureIds = refs.map((r) => r.figure_id);
      expect(figureIds).toContain("Fig. 4.1");
      expect(figureIds).toContain("Fig. 4.2");
    });

    test("handles multiline text with figure references", () => {
      const figureMap = createTestFigureMap();
      const content = `
        The first paragraph references Fig. 4.1 which shows the veins.

        In the second paragraph, we see Fig. 4.2 demonstrating
        the deep venous system.
      `;
      const refs = findFigureReferences(content, figureMap);

      expect(refs).toHaveLength(2);
    });
  });

  describe("createFigureIndex", () => {
    test("creates index from figure map", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const index = createFigureIndex(figureMap);

      expect(index).toBeInstanceOf(FigureIndex);
      expect(index.size).toBe(3);
    });

    test("index supports O(1) lookups by figure_id", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const index = createFigureIndex(figureMap);

      const fig = index.getById("Fig. 4.1");
      expect(fig).toBeDefined();
      expect(fig?.figure_id).toBe("Fig. 4.1");
    });

    test("index supports O(1) lookups by caption_block_id", () => {
      const figureMap = new Map(Object.entries(mockFigureMap));
      const index = createFigureIndex(figureMap);

      const fig = index.getByCaptionBlockId("/page/5/FigureCaption/1");
      expect(fig).toBeDefined();
      expect(fig?.figure_id).toBe("Fig. 4.1");
    });
  });

  describe("linkFigureWithIndex", () => {
    const createTestIndex = () => {
      return new FigureIndex(Object.values(mockFigureMap));
    };

    test("links caption block to figure reference (O(1) lookup)", () => {
      const index = createTestIndex();
      const ref = linkFigureWithIndex("/page/5/FigureCaption/1", index);

      expect(ref).not.toBeNull();
      expect(ref?.figure_id).toBe("Fig. 4.1");
      expect(ref?.image_path).toBe("./rhoton-supratentorial-cerebral-veins/images/image-012.jpg");
    });

    test("creates caption snippet in reference", () => {
      const index = createTestIndex();
      const ref = linkFigureWithIndex("/page/5/FigureCaption/1", index);

      expect(ref?.caption_snippet).toBeDefined();
      expect(ref?.caption_snippet.length).toBeLessThanOrEqual(103);
    });

    test("returns null for unknown caption block", () => {
      const index = createTestIndex();
      const ref = linkFigureWithIndex("/page/99/Unknown/1", index);

      expect(ref).toBeNull();
    });

    test("handles figure with no image path", () => {
      const index = createTestIndex();
      const ref = linkFigureWithIndex("/page/10/FigureCaption/1", index);

      expect(ref).not.toBeNull();
      expect(ref?.figure_id).toBe("Fig. 4.3");
      expect(ref?.image_path).toBeDefined();
    });
  });

  describe("findFigureReferencesWithIndex", () => {
    const createTestIndex = () => {
      return new FigureIndex(Object.values(mockFigureMap));
    };

    test("finds single figure reference in text (O(1) lookup)", () => {
      const index = createTestIndex();
      const refs = findFigureReferencesWithIndex("See Fig. 4.1 for details.", index);

      expect(refs).toHaveLength(1);
      expect(refs[0].figure_id).toBe("Fig. 4.1");
      expect(refs[0].image_path).toBe("./rhoton-supratentorial-cerebral-veins/images/image-012.jpg");
    });

    test("finds multiple figure references in text", () => {
      const index = createTestIndex();
      const refs = findFigureReferencesWithIndex(
        "Compare Fig. 4.1 with Fig. 4.2 and Fig. 4.3.",
        index
      );

      expect(refs).toHaveLength(3);
      const figureIds = refs.map((r) => r.figure_id);
      expect(figureIds).toContain("Fig. 4.1");
      expect(figureIds).toContain("Fig. 4.2");
      expect(figureIds).toContain("Fig. 4.3");
    });

    test("deduplicates repeated figure references", () => {
      const index = createTestIndex();
      const refs = findFigureReferencesWithIndex(
        "See Fig. 4.1 in section 1. Also see Fig. 4.1 in section 2.",
        index
      );

      expect(refs).toHaveLength(1);
      expect(refs[0].figure_id).toBe("Fig. 4.1");
    });

    test("returns empty array when no figures found", () => {
      const index = createTestIndex();
      const refs = findFigureReferencesWithIndex(
        "This text has no figure references.",
        index
      );

      expect(refs).toHaveLength(0);
    });

    test("handles case variations (case insensitive)", () => {
      const index = createTestIndex();

      const refsUpper = findFigureReferencesWithIndex("See FIG. 4.1 for details.", index);
      expect(refsUpper).toHaveLength(1);
      expect(refsUpper[0].figure_id).toBe("Fig. 4.1");

      const refsLower = findFigureReferencesWithIndex("See fig. 4.1 for details.", index);
      expect(refsLower).toHaveLength(1);
      expect(refsLower[0].figure_id).toBe("Fig. 4.1");
    });

    test("returns empty refs for figure IDs not in index", () => {
      const index = createTestIndex();
      const refs = findFigureReferencesWithIndex("See Fig. 99.99 for details.", index);

      expect(refs).toHaveLength(0);
    });

    test("handles empty index", () => {
      const emptyIndex = new FigureIndex([]);
      const refs = findFigureReferencesWithIndex("See Fig. 4.1 for details.", emptyIndex);

      expect(refs).toHaveLength(0);
    });
  });

  describe("circular figure references", () => {
    /**
     * Issue #206: Test that circular figure references don't cause infinite loops.
     *
     * Scenario: Figure A's caption mentions Fig. B, and Figure B's caption mentions Fig. A.
     * This should not cause any issues since:
     * 1. Caption text is just text - we don't recursively process references
     * 2. The `seen` set in findFigureReferences prevents duplicate entries
     * 3. FigureIndex lookup is O(1) with no recursive graph traversal
     */
    const circularFigureMap: Record<string, FigureMapEntry> = {
      "Fig. 1.1": {
        figure_id: "Fig. 1.1",
        page_number: 1,
        caption: "Lateral view of the brain. Compare with Fig. 1.2 for medial view.",
        caption_block_id: "/page/1/FigureCaption/1",
        abbreviations: {},
        status: "mapped",
        image_path: "./images/image-001.jpg",
      },
      "Fig. 1.2": {
        figure_id: "Fig. 1.2",
        page_number: 2,
        caption: "Medial view of the brain. Compare with Fig. 1.1 for lateral view.",
        caption_block_id: "/page/2/FigureCaption/1",
        abbreviations: {},
        status: "mapped",
        image_path: "./images/image-002.jpg",
      },
      "Fig. 1.3": {
        figure_id: "Fig. 1.3",
        page_number: 3,
        caption: "Superior view. See Fig. 1.1, Fig. 1.2, and Fig. 1.3 (self-reference) for comparison.",
        caption_block_id: "/page/3/FigureCaption/1",
        abbreviations: {},
        status: "mapped",
        image_path: "./images/image-003.jpg",
      },
    };

    test("handles circular references between two figures without infinite loop", () => {
      const index = new FigureIndex(Object.values(circularFigureMap));

      // Process Fig. 1.1's caption which references Fig. 1.2
      const fig1Entry = index.getById("Fig. 1.1");
      expect(fig1Entry).toBeDefined();
      const refsFromFig1 = findFigureReferencesWithIndex(fig1Entry!.caption, index);

      expect(refsFromFig1).toHaveLength(1);
      expect(refsFromFig1[0].figure_id).toBe("Fig. 1.2");

      // Process Fig. 1.2's caption which references Fig. 1.1
      const fig2Entry = index.getById("Fig. 1.2");
      expect(fig2Entry).toBeDefined();
      const refsFromFig2 = findFigureReferencesWithIndex(fig2Entry!.caption, index);

      expect(refsFromFig2).toHaveLength(1);
      expect(refsFromFig2[0].figure_id).toBe("Fig. 1.1");
    });

    test("handles self-referencing figure caption without infinite loop", () => {
      const index = new FigureIndex(Object.values(circularFigureMap));

      // Fig. 1.3's caption references itself along with others
      const fig3Entry = index.getById("Fig. 1.3");
      expect(fig3Entry).toBeDefined();
      const refs = findFigureReferencesWithIndex(fig3Entry!.caption, index);

      // Should find all three references, including self-reference
      expect(refs).toHaveLength(3);
      const figureIds = refs.map((r) => r.figure_id);
      expect(figureIds).toContain("Fig. 1.1");
      expect(figureIds).toContain("Fig. 1.2");
      expect(figureIds).toContain("Fig. 1.3");
    });

    test("handles text with mutual cross-references without infinite loop", () => {
      const index = new FigureIndex(Object.values(circularFigureMap));

      // Text that references multiple figures that in turn reference each other
      const textWithCrossRefs = `
        The venous anatomy is shown in Fig. 1.1 (lateral) and Fig. 1.2 (medial).
        These figures cross-reference each other in their captions.
        See also Fig. 1.3 which references all figures including itself.
      `;

      const refs = findFigureReferencesWithIndex(textWithCrossRefs, index);

      expect(refs).toHaveLength(3);
      const figureIds = refs.map((r) => r.figure_id);
      expect(figureIds).toContain("Fig. 1.1");
      expect(figureIds).toContain("Fig. 1.2");
      expect(figureIds).toContain("Fig. 1.3");
    });

    test("circular references with Map-based function (deprecated)", () => {
      const figureMap = new Map<string, FigureMapEntry>();
      for (const entry of Object.values(circularFigureMap)) {
        figureMap.set(entry.caption_block_id, entry);
      }

      // Process Fig. 1.1's caption
      const fig1Entry = figureMap.get("/page/1/FigureCaption/1");
      expect(fig1Entry).toBeDefined();
      const refsFromFig1 = findFigureReferences(fig1Entry!.caption, figureMap);

      expect(refsFromFig1).toHaveLength(1);
      expect(refsFromFig1[0].figure_id).toBe("Fig. 1.2");

      // Process Fig. 1.2's caption
      const fig2Entry = figureMap.get("/page/2/FigureCaption/1");
      expect(fig2Entry).toBeDefined();
      const refsFromFig2 = findFigureReferences(fig2Entry!.caption, figureMap);

      expect(refsFromFig2).toHaveLength(1);
      expect(refsFromFig2[0].figure_id).toBe("Fig. 1.1");
    });

    test("deduplication works correctly with circular references", () => {
      const index = new FigureIndex(Object.values(circularFigureMap));

      // Text that mentions the same figure multiple times
      const textWithRepeats = `
        Fig. 1.1 shows the lateral view. As mentioned, Fig. 1.1 is important.
        Refer back to Fig. 1.1 for comparison with Fig. 1.2.
        Fig. 1.2 is also referenced twice: see Fig. 1.2 again.
      `;

      const refs = findFigureReferencesWithIndex(textWithRepeats, index);

      // Despite multiple mentions, each figure should appear only once
      expect(refs).toHaveLength(2);
      const figureIds = refs.map((r) => r.figure_id);
      expect(figureIds).toContain("Fig. 1.1");
      expect(figureIds).toContain("Fig. 1.2");
    });

    test("FigureRef output is correct for cross-referenced figures", () => {
      const index = new FigureIndex(Object.values(circularFigureMap));

      const refs = findFigureReferencesWithIndex(
        "See Fig. 1.1 and Fig. 1.2.",
        index
      );

      expect(refs).toHaveLength(2);

      // Verify correct structure for each FigureRef
      for (const ref of refs) {
        expect(ref).toHaveProperty("figure_id");
        expect(ref).toHaveProperty("image_path");
        expect(ref).toHaveProperty("caption_snippet");

        // Verify values based on figure_id
        if (ref.figure_id === "Fig. 1.1") {
          expect(ref.image_path).toBe("./images/image-001.jpg");
          expect(ref.caption_snippet).toContain("Lateral view");
        } else if (ref.figure_id === "Fig. 1.2") {
          expect(ref.image_path).toBe("./images/image-002.jpg");
          expect(ref.caption_snippet).toContain("Medial view");
        }
      }
    });
  });
});
