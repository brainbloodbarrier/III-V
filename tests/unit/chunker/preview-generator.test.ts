import { describe, test, expect } from "bun:test";
import { generatePreviewHtml } from "../../../src/services/chunker/preview-generator";
import type { Chunk, ChunksOutput } from "../../../src/models/chunk";

/**
 * Tests for preview-generator.ts
 *
 * The preview generator creates HTML pages for browsing chunks during development.
 * Tests cover:
 * - HTML structure validity
 * - Document metadata rendering
 * - Chunk class assignment (figure-caption, table)
 * - Navigation link generation
 * - HTML special character escaping (XSS prevention)
 * - Edge cases (empty chunks, multiple chunks)
 */

// Helper to create a minimal valid chunk for testing
function createMockChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    chunk_id: "test-doc-chunk-0001",
    document_id: "test-doc",
    breadcrumb: ["Section"],
    breadcrumb_text: "[Context: Section]",
    content: "Test content",
    content_with_context: "[Context: Section]\n\nTest content",
    page_numbers: [1],
    source_block_ids: ["/page/1/Text/1"],
    sequence_number: 0,
    previous_chunk_id: null,
    next_chunk_id: null,
    parent_section_id: "section-1",
    figure_references: [],
    token_count: 10,
    character_count: 12,
    overlap_tokens: 0,
    is_figure_caption: false,
    is_table: false,
    contains_abbreviations: false,
    ...overrides,
  };
}

// Helper to create a mock ChunksOutput
function createMockOutput(
  chunks: Chunk[] = [createMockChunk()],
  overrides: Partial<ChunksOutput> = {}
): ChunksOutput {
  return {
    document_id: "test-doc",
    generated_at: "2024-01-01T00:00:00Z",
    total_chunks: chunks.length,
    chunks,
    ...overrides,
  };
}

describe("preview-generator", () => {
  describe("generatePreviewHtml - HTML structure", () => {
    test("generates valid HTML with DOCTYPE", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("</html>");
    });

    test("includes proper HTML5 lang attribute", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain('<html lang="en">');
    });

    test("includes meta charset and viewport", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('name="viewport"');
    });

    test("includes title with document_id", () => {
      const output = createMockOutput([], { document_id: "my-document" });
      const html = generatePreviewHtml(output);

      expect(html).toContain("<title>Chunk Preview - my-document</title>");
    });

    test("includes CSS styles section", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    test("includes JavaScript for filtering", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain("<script>");
      expect(html).toContain("function filterChunks()");
      expect(html).toContain("</script>");
    });
  });

  describe("generatePreviewHtml - document metadata", () => {
    test("includes document_id in header", () => {
      const output = createMockOutput([], { document_id: "rhoton-cerebral-veins" });
      const html = generatePreviewHtml(output);

      expect(html).toContain("rhoton-cerebral-veins");
      expect(html).toContain("<strong>Document:</strong>");
    });

    test("includes total_chunks count", () => {
      const chunks = [createMockChunk(), createMockChunk({ chunk_id: "test-doc-chunk-0002" })];
      const output = createMockOutput(chunks);
      const html = generatePreviewHtml(output);

      expect(html).toContain("<strong>Total Chunks:</strong> 2");
    });

    test("includes generated_at timestamp", () => {
      const output = createMockOutput([], { generated_at: "2024-06-15T10:30:00Z" });
      const html = generatePreviewHtml(output);

      expect(html).toContain("<strong>Generated:</strong> 2024-06-15T10:30:00Z");
    });

    test("displays chunk count in controls", () => {
      const chunks = [createMockChunk(), createMockChunk({ chunk_id: "test-doc-chunk-0002" })];
      const output = createMockOutput(chunks);
      const html = generatePreviewHtml(output);

      expect(html).toContain('id="count">2 chunks</span>');
    });
  });

  describe("generatePreviewHtml - chunk rendering", () => {
    test("renders chunk with correct id attribute", () => {
      const chunk = createMockChunk({ chunk_id: "doc-chunk-0042" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('id="doc-chunk-0042"');
    });

    test("includes chunk content", () => {
      const chunk = createMockChunk({ content: "This is the actual chunk content." });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("This is the actual chunk content.");
    });

    test("includes breadcrumb text", () => {
      const chunk = createMockChunk({ breadcrumb_text: "[Context: Chapter 1 > Section 2]" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("[Context: Chapter 1 &gt; Section 2]");
    });

    test("includes page numbers", () => {
      const chunk = createMockChunk({ page_numbers: [5, 6] });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Pages: 5, 6");
    });

    test("includes token count", () => {
      const chunk = createMockChunk({ token_count: 150 });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Tokens: 150");
    });

    test("includes character count", () => {
      const chunk = createMockChunk({ character_count: 600 });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Chars: 600");
    });

    test("includes parent section id", () => {
      const chunk = createMockChunk({ parent_section_id: "section-cerebral-veins" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Section: section-cerebral-veins");
    });

    test("shows N/A for null parent section", () => {
      const chunk = createMockChunk({ parent_section_id: "" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Section: N/A");
    });

    test("includes source block count", () => {
      const chunk = createMockChunk({ source_block_ids: ["/page/1/Text/1", "/page/1/Text/2", "/page/1/Text/3"] });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Sources: 3 blocks");
    });
  });

  describe("generatePreviewHtml - chunk class assignment", () => {
    test("adds figure-caption class for caption chunks", () => {
      const chunk = createMockChunk({ is_figure_caption: true });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('class="chunk figure-caption"');
    });

    test("adds table class for table chunks", () => {
      const chunk = createMockChunk({ is_table: true });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('class="chunk table"');
    });

    test("adds both classes when chunk is both caption and table", () => {
      const chunk = createMockChunk({ is_figure_caption: true, is_table: true });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('class="chunk figure-caption table"');
    });

    test("has only chunk class for regular chunks", () => {
      const chunk = createMockChunk({ is_figure_caption: false, is_table: false });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      // Should have just "chunk" class, not figure-caption or table
      expect(html).toMatch(/class="chunk"[^>]*id="/);
    });
  });

  describe("generatePreviewHtml - tags rendering", () => {
    test("shows CAPTION tag for figure captions", () => {
      const chunk = createMockChunk({ is_figure_caption: true });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('<span class="tag caption">CAPTION</span>');
    });

    test("shows TABLE tag for tables", () => {
      const chunk = createMockChunk({ is_table: true });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('<span class="tag table">TABLE</span>');
    });

    test("shows overlap tag with token count", () => {
      const chunk = createMockChunk({ overlap_tokens: 25 });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('<span class="tag overlap">+25 overlap</span>');
    });

    test("does not show overlap tag when overlap is 0", () => {
      const chunk = createMockChunk({ overlap_tokens: 0 });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).not.toContain('class="tag overlap"');
    });
  });

  describe("generatePreviewHtml - data-overlap attribute", () => {
    test("includes correct data-overlap attribute", () => {
      const chunk = createMockChunk({ overlap_tokens: 50 });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('data-overlap="50"');
    });

    test("has data-overlap=0 when no overlap", () => {
      const chunk = createMockChunk({ overlap_tokens: 0 });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('data-overlap="0"');
    });
  });

  describe("generatePreviewHtml - figure references", () => {
    test("shows figure references when present", () => {
      const chunk = createMockChunk({
        figure_references: [
          { figure_id: "Fig. 4.1", image_path: "./images/fig-4.1.jpg", caption_snippet: "The cerebral..." },
          { figure_id: "Fig. 4.2", image_path: "./images/fig-4.2.jpg", caption_snippet: "Overview of..." },
        ],
      });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('class="figure-refs"');
      expect(html).toContain("References: Fig. 4.1, Fig. 4.2");
    });

    test("does not show figure-refs div when no references", () => {
      const chunk = createMockChunk({ figure_references: [] });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).not.toContain('class="figure-refs"');
    });
  });

  describe("generatePreviewHtml - navigation links", () => {
    test("includes link to previous chunk when exists", () => {
      const chunk = createMockChunk({ previous_chunk_id: "doc-chunk-0001" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('<a href="#doc-chunk-0001">');
      expect(html).toContain("Prev</a>");
    });

    test("includes link to next chunk when exists", () => {
      const chunk = createMockChunk({ next_chunk_id: "doc-chunk-0003" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('<a href="#doc-chunk-0003">');
      expect(html).toContain("Next");
    });

    test("omits previous link when null", () => {
      const chunk = createMockChunk({ previous_chunk_id: null });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).not.toContain("Prev</a>");
    });

    test("omits next link when null", () => {
      const chunk = createMockChunk({ next_chunk_id: null });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).not.toContain("Next");
    });

    test("renders both navigation links for middle chunk", () => {
      const chunk = createMockChunk({
        chunk_id: "doc-chunk-0002",
        previous_chunk_id: "doc-chunk-0001",
        next_chunk_id: "doc-chunk-0003",
      });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('<a href="#doc-chunk-0001">');
      expect(html).toContain('<a href="#doc-chunk-0003">');
    });
  });

  describe("generatePreviewHtml - HTML escaping (XSS prevention)", () => {
    test("escapes ampersand (&) to &amp;", () => {
      const chunk = createMockChunk({ content: "Smith & Jones" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Smith &amp; Jones");
      expect(html).not.toContain("Smith & Jones");
    });

    test("escapes less-than (<) to &lt;", () => {
      const chunk = createMockChunk({ content: "x < y" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("x &lt; y");
    });

    test("escapes greater-than (>) to &gt;", () => {
      const chunk = createMockChunk({ content: "x > y" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("x &gt; y");
    });

    test("escapes double quotes (\") to &quot;", () => {
      const chunk = createMockChunk({ content: 'He said "hello"' });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("He said &quot;hello&quot;");
    });

    test("escapes single quotes (') to &#039;", () => {
      const chunk = createMockChunk({ content: "It's working" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("It&#039;s working");
    });

    test("escapes HTML tags in content", () => {
      const chunk = createMockChunk({ content: "<script>alert('XSS')</script>" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
      expect(html).not.toContain("<script>alert");
    });

    test("escapes combined special characters", () => {
      const chunk = createMockChunk({ content: '<a href="test">Smith & Jones</a>' });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("&lt;a href=&quot;test&quot;&gt;Smith &amp; Jones&lt;/a&gt;");
    });

    test("escapes special characters in document_id", () => {
      const output = createMockOutput([], { document_id: "doc<with>special&chars" });
      const html = generatePreviewHtml(output);

      expect(html).toContain("doc&lt;with&gt;special&amp;chars");
    });

    test("escapes special characters in chunk_id", () => {
      const chunk = createMockChunk({ chunk_id: "chunk<test>&id" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("chunk&lt;test&gt;&amp;id");
    });

    test("escapes special characters in breadcrumb_text", () => {
      const chunk = createMockChunk({ breadcrumb_text: "[Context: A & B > C]" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("[Context: A &amp; B &gt; C]");
    });

    test("escapes special characters in parent_section_id", () => {
      const chunk = createMockChunk({ parent_section_id: "section<1>&2" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("Section: section&lt;1&gt;&amp;2");
    });
  });

  describe("generatePreviewHtml - edge cases", () => {
    test("handles empty chunks array", () => {
      const output = createMockOutput([]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("</html>");
      expect(html).toContain("<strong>Total Chunks:</strong> 0");
      expect(html).toContain('id="count">0 chunks</span>');
    });

    test("handles multiple chunks correctly", () => {
      const chunks = [
        createMockChunk({ chunk_id: "doc-chunk-0001", content: "First chunk" }),
        createMockChunk({ chunk_id: "doc-chunk-0002", content: "Second chunk" }),
        createMockChunk({ chunk_id: "doc-chunk-0003", content: "Third chunk" }),
      ];
      const output = createMockOutput(chunks);
      const html = generatePreviewHtml(output);

      expect(html).toContain("First chunk");
      expect(html).toContain("Second chunk");
      expect(html).toContain("Third chunk");
      expect(html).toContain('id="doc-chunk-0001"');
      expect(html).toContain('id="doc-chunk-0002"');
      expect(html).toContain('id="doc-chunk-0003"');
    });

    test("handles empty content in chunk", () => {
      const chunk = createMockChunk({ content: "" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      // Should still render the chunk structure
      expect(html).toContain('class="chunk-content">');
      expect(html).toContain("</div>");
    });

    test("handles very long content", () => {
      const longContent = "x".repeat(10000);
      const chunk = createMockChunk({ content: longContent });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain(longContent);
    });

    test("handles empty breadcrumb text", () => {
      const chunk = createMockChunk({ breadcrumb_text: "" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('class="breadcrumb">');
    });

    test("handles chunk with all optional features", () => {
      const chunk = createMockChunk({
        chunk_id: "complex-chunk-0001",
        is_figure_caption: true,
        is_table: true,
        overlap_tokens: 75,
        previous_chunk_id: "complex-chunk-0000",
        next_chunk_id: "complex-chunk-0002",
        figure_references: [
          { figure_id: "Fig. 1", image_path: "./img.jpg", caption_snippet: "Test" },
        ],
        page_numbers: [1, 2, 3],
      });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain('class="chunk figure-caption table"');
      expect(html).toContain('<span class="tag caption">CAPTION</span>');
      expect(html).toContain('<span class="tag table">TABLE</span>');
      expect(html).toContain('<span class="tag overlap">+75 overlap</span>');
      expect(html).toContain('class="figure-refs"');
      expect(html).toContain("Pages: 1, 2, 3");
      expect(html).toContain("Prev</a>");
      expect(html).toContain("Next");
    });

    test("handles unicode characters in content", () => {
      const chunk = createMockChunk({ content: "Greek letters: \u03B1, \u03B2, \u03B3. Japanese: \u3053\u3093\u306B\u3061\u306F" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      expect(html).toContain("\u03B1, \u03B2, \u03B3");
      expect(html).toContain("\u3053\u3093\u306B\u3061\u306F");
    });

    test("handles newlines in content", () => {
      const chunk = createMockChunk({ content: "Line 1\nLine 2\nLine 3" });
      const output = createMockOutput([chunk]);
      const html = generatePreviewHtml(output);

      // pre-wrap style should preserve newlines
      expect(html).toContain("Line 1\nLine 2\nLine 3");
    });
  });

  describe("generatePreviewHtml - controls and filters", () => {
    test("includes search input", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain('id="search"');
      expect(html).toContain('placeholder="Search chunks..."');
    });

    test("includes filter dropdown with all options", () => {
      const output = createMockOutput();
      const html = generatePreviewHtml(output);

      expect(html).toContain('id="filter"');
      expect(html).toContain('<option value="all">All Chunks</option>');
      expect(html).toContain('<option value="caption">Figure Captions</option>');
      expect(html).toContain('<option value="table">Tables</option>');
      expect(html).toContain('<option value="overlap">With Overlap</option>');
    });
  });
});
