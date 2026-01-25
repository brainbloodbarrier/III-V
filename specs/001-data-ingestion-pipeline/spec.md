# Feature Specification: Data Ingestion & Normalization Pipeline

**Feature Branch**: `001-data-ingestion-pipeline`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "Phase 1: Data Ingestion & Normalization Pipeline - Transform Rhoton source files (JSON/Markdown/images) into unified RhotonDocument with figure mapping. Outputs: document.json, figure_map.json, content.md. Gates: 100% parse, zero ligatures, >90% figure coverage."

## Clarifications

### Session 2026-01-24

- Q: How should figure references (e.g., "Fig. 4.1") be matched to image files (e.g., "image-12.jpg")? → A: Caption extraction - parse FIGURE captions containing inline image references (e.g., `![](_page_3_Figure_0.jpeg)`) to establish mapping.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and Parse Source Files (Priority: P1)

A knowledge base developer needs to load the raw Rhoton source files (JSON structural metadata, Markdown content, and image directory) and have them parsed into a unified internal representation without data loss.

**Why this priority**: This is the foundational capability - without successful parsing of all source files, no downstream processing is possible. The 100% parse rate gate makes this critical.

**Independent Test**: Can be tested by running the ingestion process against source files and verifying all blocks, pages, and content are captured in the output document.json.

**Acceptance Scenarios**:

1. **Given** a Rhoton JSON file with 77,647+ blocks, **When** the ingestion pipeline runs, **Then** all blocks are parsed and represented in the output document with their structural hierarchy preserved.
2. **Given** a Rhoton Markdown file with 10,924+ lines, **When** the ingestion pipeline runs, **Then** all text content is captured with page boundaries and section structure intact.
3. **Given** an image directory with 188 JPG files, **When** the ingestion pipeline runs, **Then** all image files are indexed and available for figure mapping.

---

### User Story 2 - Normalize Text Content (Priority: P1)

A knowledge base developer needs all text content cleaned of OCR artifacts, ligature errors, and formatting inconsistencies so that downstream search and LLM processing work correctly.

**Why this priority**: Text quality directly impacts search accuracy and LLM comprehension. The "zero ligatures" gate makes this equally critical to parsing.

**Independent Test**: Can be tested by running normalization and scanning output for known ligature patterns (ff, fi, fl, ffi, ffl) and verifying zero occurrences remain.

**Acceptance Scenarios**:

1. **Given** text containing ligature characters (ﬀ, ﬁ, ﬂ, ﬃ, ﬄ), **When** normalization runs, **Then** all ligatures are replaced with their ASCII equivalents (ff, fi, fl, ffi, ffl).
2. **Given** text with hyphenated line breaks (e.g., "supra-\ntentorial"), **When** normalization runs, **Then** words are rejoined correctly ("supratentorial").
3. **Given** text with irregular whitespace or control characters, **When** normalization runs, **Then** whitespace is normalized to single spaces and control characters are removed.
4. **Given** text with smart quotes or special punctuation, **When** normalization runs, **Then** characters are converted to standard ASCII equivalents.

---

### User Story 3 - Map Figures to Images (Priority: P1)

A knowledge base developer needs figure references in the text (e.g., "Fig. 4.1") mapped to their corresponding image files (e.g., "image-12.jpg") so that the knowledge base can display relevant diagrams alongside text.

**Why this priority**: The >90% figure coverage gate makes this a core deliverable. Figures are essential for understanding anatomical content.

**Independent Test**: Can be tested by counting total figure references in source, counting successful mappings in figure_map.json, and verifying coverage exceeds 90%.

**Acceptance Scenarios**:

1. **Given** a figure reference "Fig. 4.1" in the text and a corresponding FIGURE caption in the content, **When** figure mapping runs, **Then** the reference is linked to the correct image file with caption text extracted.
2. **Given** a range reference "Figs. 4.1–4.3", **When** figure mapping runs, **Then** all three figures (4.1, 4.2, 4.3) are mapped individually.
3. **Given** a figure caption containing abbreviation definitions (e.g., "A, lateral view; B, superior view"), **When** figure mapping runs, **Then** abbreviations are parsed and stored with the figure reference.
4. **Given** 100+ figure references in the source document, **When** figure mapping completes, **Then** at least 90% have valid image file associations.

---

### User Story 4 - Generate Output Artifacts (Priority: P2)

A knowledge base developer needs the pipeline to produce three standardized output files (document.json, figure_map.json, content.md) that can be consumed by Phase 2 chunking.

**Why this priority**: Output format standardization enables pipeline composition but depends on P1 stories completing successfully.

**Independent Test**: Can be tested by verifying all three output files exist, are valid JSON/Markdown, and conform to expected schemas.

**Acceptance Scenarios**:

1. **Given** successful ingestion and normalization, **When** the pipeline completes, **Then** document.json contains the full RhotonDocument structure with all pages and blocks.
2. **Given** successful figure mapping, **When** the pipeline completes, **Then** figure_map.json contains all figure-to-image associations with captions and abbreviations.
3. **Given** successful text normalization, **When** the pipeline completes, **Then** content.md contains the cleaned, continuous text with preserved section hierarchy.

---

### User Story 5 - Validate Quality Gates (Priority: P2)

A knowledge base developer needs automated validation that confirms all three quality gates are met before considering the pipeline run successful.

**Why this priority**: Quality gates ensure downstream phases receive clean data but are verification steps after core processing.

**Independent Test**: Can be tested by running validation checks against output files and receiving pass/fail status for each gate.

**Acceptance Scenarios**:

1. **Given** pipeline output files, **When** validation runs, **Then** parse rate is calculated and must equal 100% (all source blocks present in output).
2. **Given** normalized content.md, **When** validation runs, **Then** ligature scan returns zero matches for known ligature patterns.
3. **Given** figure_map.json, **When** validation runs, **Then** coverage percentage is calculated (mapped figures / total references) and must exceed 90%.
4. **Given** any gate failure, **When** validation completes, **Then** a detailed report identifies which blocks/figures failed and why.

---

### Edge Cases

- What happens when a JSON block has malformed or missing required fields?
  - Pipeline logs the error, skips the block, and includes it in the parse failure report.
- What happens when an image file referenced in a caption doesn't exist in the image directory?
  - Figure mapping marks it as "unresolved" and excludes from coverage calculation numerator.
- What happens when figure numbering is inconsistent (e.g., "Fig 4.1" vs "Figure 4.1" vs "FIGURE 4.1")?
  - Parser normalizes all variants to canonical form before matching.
- What happens when the Markdown contains inline images with different naming conventions?
  - Parser handles both `image-N.jpg` and `_page_N_Figure_M.jpeg` patterns.
- What happens when hyphenation rejoining creates an invalid word?
  - Pipeline uses dictionary lookup to validate; if invalid, preserves original hyphenation.
- What happens when a FIGURE caption lacks an inline image reference?
  - Figure is marked as "no-image-in-caption" and excluded from coverage calculation; logged for manual review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse the complete Rhoton JSON file and extract all block types (Document, Page, SectionHeader, Text, PageHeader, TextInlineMath).
- **FR-002**: System MUST preserve the hierarchical structure of blocks including parent-child relationships and section_hierarchy references.
- **FR-003**: System MUST extract and preserve bounding box coordinates (bbox) and polygon data for each block.
- **FR-004**: System MUST parse the Rhoton Markdown file and identify page boundaries using the `{N}---` marker pattern.
- **FR-005**: System MUST extract section headers and their hierarchy levels (H1, H2, H4, etc.) from both JSON and Markdown sources.
- **FR-006**: System MUST replace all Unicode ligature characters with their ASCII multi-character equivalents.
- **FR-007**: System MUST rejoin hyphenated words split across line breaks while preserving intentional hyphens.
- **FR-008**: System MUST normalize whitespace (collapse multiple spaces, remove control characters, standardize line endings).
- **FR-009**: System MUST convert smart quotes, em-dashes, and special punctuation to ASCII equivalents.
- **FR-010**: System MUST identify all figure references in text using patterns: "Fig. N.N", "Figs. N.N–N.N", "Figure N.N", "FIGURE N.N".
- **FR-011**: System MUST extract figure captions including the full descriptive text and panel labels (A, B, C, etc.).
- **FR-012**: System MUST parse abbreviation definitions from figure captions (e.g., "A, lateral view" becomes {A: "lateral view"}).
- **FR-013**: System MUST match figure references to image files by extracting inline image references from FIGURE captions (e.g., parsing `![](_page_N_Figure_M.jpeg)` patterns within caption text).
- **FR-014**: System MUST generate document.json conforming to the RhotonDocument schema.
- **FR-015**: System MUST generate figure_map.json containing all figure-to-image mappings with metadata.
- **FR-016**: System MUST generate content.md with normalized text preserving section hierarchy via Markdown headers.
- **FR-017**: System MUST calculate and report parse rate as (successfully parsed blocks / total source blocks).
- **FR-018**: System MUST scan output for remaining ligature characters and report count.
- **FR-019**: System MUST calculate figure coverage as (mapped figures / total figure references).
- **FR-020**: System MUST fail the pipeline if any quality gate is not met (parse < 100%, ligatures > 0, coverage < 90%).

### Key Entities

- **RhotonDocument**: The unified representation of a complete Rhoton source document, containing metadata (id, title, author), source file references, pages array, and figure map.
- **RhotonPage**: A single page from the source document, containing page number, blocks array, and page-level metadata.
- **RhotonBlock**: An individual content block (text, header, or inline math) with type, content, bounding box, section hierarchy reference, and optional children.
- **FigureReference**: A mapping between a figure identifier (e.g., "Fig. 4.1"), its source image file, page location, caption text, and parsed abbreviations.
- **NormalizationRule**: A text transformation rule specifying pattern to match and replacement value, used for ligatures, punctuation, and whitespace normalization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of source JSON blocks are successfully parsed and represented in document.json (zero parse failures).
- **SC-002**: Zero ligature characters remain in content.md after normalization (verified by pattern scan).
- **SC-003**: Greater than 90% of figure references in the text are mapped to valid image files in figure_map.json.
- **SC-004**: All three output files (document.json, figure_map.json, content.md) are generated on every successful pipeline run.
- **SC-005**: Pipeline produces a validation report showing pass/fail status for each quality gate.
- **SC-006**: Structural hierarchy from source JSON (section_hierarchy relationships) is preserved and queryable in document.json.
- **SC-007**: Figure captions include parsed abbreviation mappings for at least 80% of figures with panel labels.

## Assumptions

- Source files are located at fixed paths relative to project root (JSON, Markdown, and image directory).
- The image directory contains all figure images referenced in the document.
- Figure numbering in the source follows a consistent "Chapter.Figure" pattern (e.g., 4.1, 4.2).
- The JSON block structure follows the observed schema with block_type, id, html, section_hierarchy, bbox, and children fields.
- Markdown page breaks use the `{N}------------------------------------------------` format consistently.
- Dictionary validation for hyphenation rejoining uses a standard English dictionary plus medical/anatomical terms.

## Out of Scope

- Chunking or segmentation of content (Phase 2)
- Semantic enrichment or entity extraction (Phase 3)
- Vector embedding generation
- User interface or API endpoints
- Multi-document processing (this phase handles single document)
- PDF re-extraction or OCR (using pre-extracted JSON/Markdown)
