# Feature Specification: Structural Chunking Implementation

**Feature Branch**: `002-structural-chunking`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "Structural Chunking Implementation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transform Document into Self-Contained Chunks (Priority: P1)

A data pipeline operator runs the chunking process on the normalized document output from Phase 1 to produce retrieval-ready text chunks. Each chunk is a self-contained anatomical unit that preserves its full hierarchical context, enabling meaningful retrieval and comprehension without needing to reference other chunks.

**Why this priority**: This is the core value proposition - transforming a large document into retrieval-optimized units that maintain context. Without this, chunks would be meaningless fragments like "It drains into the transverse sinus" with no way to know what "it" refers to.

**Independent Test**: Can be fully tested by running the chunking process on `document.json` and verifying each output chunk contains its breadcrumb context preamble (e.g., `[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS > Tentorial Group]`) plus content.

**Acceptance Scenarios**:

1. **Given** a normalized document with 1690 blocks, **When** the chunking process runs, **Then** all document content appears in at least one chunk with a valid breadcrumb context prefix.
2. **Given** a text block under "THE CEREBRAL VEINS > SUPERFICIAL VEINS > Tentorial Group", **When** it is chunked, **Then** the output chunk includes `[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS > Tentorial Group]` as a preamble before the content.
3. **Given** a block containing "It drains into the transverse sinus", **When** chunked, **Then** the hierarchical context makes clear what "it" refers to.

---

### User Story 2 - Handle Long Content with Intelligent Splitting (Priority: P2)

When content exceeds the target chunk size, the system intelligently splits it at natural boundaries (paragraph breaks, then sentence boundaries) while preserving the breadcrumb context for each resulting sub-chunk.

**Why this priority**: Some content blocks exceed the 512-token target. Without intelligent splitting, chunks would be arbitrarily truncated mid-sentence, destroying semantic coherence.

**Note**: "Intelligent splitting" is implemented per FR-004: split at paragraph breaks first, then sentence boundaries, never mid-word.

**Independent Test**: Can be tested by providing a single long text block (>600 characters) and verifying it produces multiple coherent chunks, each with the same breadcrumb context, split at sentence boundaries.

**Acceptance Scenarios**:

1. **Given** a text block with 1500 characters, **When** chunked, **Then** it produces multiple chunks, each respecting the maximum size limit.
2. **Given** a long paragraph without paragraph breaks, **When** chunked, **Then** it splits at sentence boundaries (not mid-word or mid-sentence).
3. **Given** split chunks from the same source block, **When** examined, **Then** each chunk includes the same breadcrumb context preamble.

---

### User Story 3 - Extract Figure Captions as Standalone Chunks (Priority: P2)

Figure captions are extracted as standalone chunks marked with a special flag, enabling retrieval systems to handle them distinctly (e.g., always returning the associated image when the caption is retrieved).

**Why this priority**: Figure captions contain critical anatomical labels, abbreviation definitions, and spatial relationships. They need to be independently retrievable and linked to their images.

**Independent Test**: Can be tested by verifying all 84 figure captions from the document appear as standalone chunks with `is_figure_caption: true` and linked image references.

**Acceptance Scenarios**:

1. **Given** a document with 84 figure captions, **When** chunked, **Then** 84 chunks are created with `is_figure_caption: true`.
2. **Given** a figure caption chunk, **When** examined, **Then** it includes the figure ID, image file reference, and full caption text.
3. **Given** a figure caption containing abbreviations (e.g., "A., artery; Ant., anterior"), **When** chunked, **Then** the abbreviations are included in the chunk content.

---

### User Story 4 - Maintain Chunk Continuity with Overlap (Priority: P3)

Adjacent chunks include a small overlap region (the last 2 sentences of the previous chunk) to maintain reading continuity and improve retrieval accuracy when queries span chunk boundaries.

**Why this priority**: Retrieval systems may match a query to content that spans two chunks. Overlap ensures context is preserved at boundaries and improves the quality of retrieved content.

**Independent Test**: Can be tested by examining adjacent chunks and verifying the ending sentences of chunk N appear at the beginning of chunk N+1 (marked as overlap).

**Acceptance Scenarios**:

1. **Given** two sequential chunks from the same section, **When** examined, **Then** chunk N+1 begins with content from the end of chunk N.
2. **Given** an overlap region, **When** metadata is examined, **Then** the overlap is marked in the chunk's metadata (`overlap_tokens` field).
3. **Given** chunks from different sections, **When** examined, **Then** no overlap exists between them (overlap does not cross section boundaries).

---

### User Story 5 - Generate Chunk Index for Efficient Retrieval (Priority: P3)

A chunk index is generated that enables efficient lookup by section, page number, and figure reference, supporting downstream retrieval and navigation use cases.

**Why this priority**: Without an index, consumers would need to scan all chunks to find content by section or page. The index enables O(1) lookups for common access patterns.

**Independent Test**: Can be tested by querying the index for a specific section ID and verifying it returns the correct chunk IDs, then verifying those chunks exist in the main chunk collection.

**Acceptance Scenarios**:

1. **Given** a chunk index, **When** queried for section "THE SUPERFICIAL VEINS", **Then** it returns all chunk IDs belonging to that section.
2. **Given** a chunk index, **When** queried for page 5, **Then** it returns all chunk IDs that include content from page 5.
3. **Given** a chunk index, **When** queried for "Fig. 4.1", **Then** it returns all chunk IDs that reference that figure.

---

### Edge Cases

- What happens when a block's parent hierarchy references a non-existent section header? The system resolves as much of the breadcrumb as possible and logs a warning for unresolved IDs.
- What happens when a sentence boundary cannot be detected (e.g., dense abbreviations)? The system falls back to character-based splitting at the nearest whitespace, ensuring no truncation mid-word.
- What happens when a block is exactly at the token limit? It becomes a single chunk without splitting.
- How are cross-page paragraphs handled? Page break markers are removed, text is joined seamlessly, and the chunk records all source page numbers in `page_numbers` array.
- What happens with very short blocks (<100 characters)? They are merged with adjacent blocks from the same section, never merged across section boundaries.
**Note**: "<100 characters" is a pre-processing heuristic. Post-chunking validation uses <80 tokens (FR-003).
- What happens with an empty document (0 blocks)? The system produces valid empty output files (`chunks.json` with 0 chunks, `chunk_index.json` with empty mappings) and logs a warning. This is not an error condition.
- What happens when `figure_map.json` is missing or empty? The system logs a warning and proceeds without figure linking (`is_figure_caption` chunks will have empty `figure_references` arrays). This is not an error condition since figure linking is enhancement, not core functionality.
- What happens when `document.json` fails schema validation? The system exits immediately with a validation error. Malformed Phase 1 input is a critical failure since data integrity cannot be guaranteed. This implements fail-fast per Constitution Principle II.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST produce chunks where every chunk includes a breadcrumb context preamble showing its full hierarchical path (e.g., `[Context: X > Y > Z]`).
- **FR-002**: System MUST ensure no chunk exceeds 600 tokens (hard maximum limit).
- **FR-003**: System MUST ensure no chunk is smaller than 80 tokens, except for final chunks in a section.
- **FR-004**: System MUST split long content at paragraph breaks first, then at sentence boundaries, never mid-word.
- **FR-005**: System MUST extract all figure captions as standalone chunks with `is_figure_caption: true`.
- **FR-006**: System MUST link figure caption chunks to their corresponding image file paths.
- **FR-007**: System MUST add overlap content (last 2 sentences from previous chunk) at chunk boundaries within the same section. If the previous chunk contains fewer than 2 sentences, all available sentences (0, 1, or 2) are used as overlap.
- **FR-008**: System MUST join cross-page paragraphs seamlessly, removing page break markers and recording all source pages.
- **FR-009**: System MUST generate a chunk index enabling lookup by section, page, and figure reference.
- **FR-010**: System MUST preserve source block IDs in chunk metadata for traceability back to the original document.
- **FR-011**: System MUST produce valid output files that pass schema validation.

### Key Entities

- **Chunk**: A self-contained text unit with breadcrumb context, content, positional metadata (page numbers, sequence), relationship links (previous/next chunk), figure references, and size metrics (token count, character count).
- **ChunkIndex**: A lookup structure mapping section IDs to chunk IDs, page numbers to chunk IDs, and figure IDs to chunk IDs for efficient retrieval.
- **Breadcrumb**: The hierarchical path from document root to a chunk's location, represented as both an array of labels and a formatted string.
- **FigureRef**: A reference linking a chunk to a figure, including figure ID, image path, and caption snippet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of document content from Phase 1 output is represented in at least one chunk (complete coverage).
- **SC-002**: 100% of chunks have a valid, non-empty breadcrumb context preamble.
- **SC-003**: 0 chunks exceed 600 tokens (hard limit enforced).
- **SC-004**: All 84 figure captions from the source document appear as standalone chunks with `is_figure_caption: true`.
- **SC-005**: Processing completes within 30 seconds for the full document (1690 blocks).
- **SC-006**: Output files pass schema validation with no errors.
- **SC-007**: All chunks within the same section have proper overlap linkage (except the first chunk in each section).

## Assumptions

- Phase 1 output (`document.json`, `figure_map.json`) exists and passes validation.
- The `parent_hierarchy` field in blocks contains valid block IDs that can be resolved to header text.
- Token estimation using ~4 characters per token is acceptable for chunking purposes (conservative estimate).
- Input text is UTF-8 encoded. Token estimation treats each Unicode code point as one "character" regardless of byte length; this is acceptable since the 4:1 ratio is already a conservative approximation.
- Sentence boundary detection using standard punctuation patterns (`.!?` followed by space and capital letter) is sufficient for medical text.
- Common abbreviations are protected from being treated as sentence endings: "Fig.", "Dr.", "No.", "vs.", "etc.", "e.g.", "i.e.", "al." (as in "et al.").
- Memory usage should remain under 500MB for the full document. This is an operational target, not a functional requirement.

## Dependencies

- **Phase 1 Complete**: Requires normalized document output from Phase 1 (`processed/01_normalized/document.json`).
- **Figure Map**: Requires figure mapping data (`processed/01_normalized/figure_map.json`) for linking chunks to images.

## Out of Scope

- Vector embeddings generation (Phase 3+)
- Semantic entity extraction (Phase 3)
- Search/retrieval functionality
- User interface or API endpoints
- Multi-document support (this phase handles single document only)
- Table detection and special handling (`is_table` field reserved for future use)
