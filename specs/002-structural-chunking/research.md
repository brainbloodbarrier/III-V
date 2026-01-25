# Research: Structural Chunking Implementation

**Feature**: 002-structural-chunking
**Date**: 2026-01-24

## Research Questions

### RQ-1: Token Estimation Strategy

**Decision**: Use character count / 4 as token estimate (conservative heuristic)

**Rationale**:
- No external dependency required (tiktoken adds ~10MB)
- 4 chars/token is conservative for English text (actual average ~3.5-4)
- Acceptable accuracy for chunking purposes where exact count isn't critical
- Aligns with Phase 1 simplicity principle (YAGNI)

**Alternatives Considered**:
- `tiktoken` library: More accurate but adds dependency, complexity
- `gpt-tokenizer`: Similar tradeoff
- Word count / 0.75: Less accurate for medical terminology

### RQ-2: Sentence Boundary Detection

**Decision**: Regex-based detection with medical abbreviation protection

**Rationale**:
- Pattern: `/(?<=[.!?])\s+(?=[A-Z])/` with pre-processing to protect abbreviations
- Protects: "Fig.", "Dr.", "et al.", "i.e.", "e.g.", anatomical abbreviations
- Sufficient accuracy for medical text based on Phase 1 source analysis
- No NLP library dependency (spaCy/nltk would add significant complexity)

**Alternatives Considered**:
- spaCy sentence tokenizer: High accuracy but heavy dependency (~500MB)
- nltk punkt: Moderate accuracy, requires training data
- Simple period split: Too naive, fails on abbreviations

### RQ-3: Breadcrumb Resolution Strategy

**Decision**: Build lookup table from document, resolve block IDs to header text

**Rationale**:
- Phase 1 output stores `parent_hierarchy` as block IDs (e.g., `["/page/1/SectionHeader/2"]`)
- Need to map these IDs to actual header text for human-readable breadcrumbs
- Single pass to build index: O(n), then O(1) lookups per block
- Graceful fallback: If ID not found, use ID itself and log warning

**Implementation**:
1. Scan all blocks with `block_type: "section_header"`
2. Build map: `block_id → block.content` (header text)
3. For each block's `parent_hierarchy`, resolve each ID to text
4. Format: `[Context: Label1 > Label2 > Label3]`

### RQ-4: Chunk Overlap Implementation

**Decision**: 2 sentences overlap at chunk boundaries within same section

**Rationale**:
- 2 sentences provides sufficient context for retrieval continuity
- ~50-100 tokens typical overlap (within budget)
- Only within same section (cross-section breaks are semantic boundaries)
- First chunk in section has no overlap (nothing to overlap with)

**Implementation**:
1. After splitting, identify adjacent chunks in same section
2. Extract last 2 sentences from chunk N
3. Prepend to chunk N+1 as overlap
4. Record `overlap_tokens` count in metadata

### RQ-5: Small Chunk Merging Strategy

**Decision**: Merge chunks < MIN_TOKENS (80) with previous chunk in same section

**Rationale**:
- Very small chunks provide poor retrieval quality
- Merging within section preserves semantic coherence
- Never merge across section boundaries (semantic break)
- Final chunk in section exempt (may naturally be small)

**Implementation**:
1. After initial chunking, scan for chunks < MIN_TOKENS
2. If previous chunk exists in same section, merge
3. If no previous (first chunk), leave as-is (rare edge case)
4. Recalculate token count after merge

### RQ-6: Figure Caption Chunking

**Decision**: Extract as standalone chunks with special handling

**Rationale**:
- Captions contain critical anatomical labels and abbreviation definitions
- Need to be independently retrievable
- Link to image file for multimodal retrieval
- Include abbreviations in chunk content (not separate metadata)

**Implementation**:
1. Detect blocks with `block_type: "figure_caption"`
2. Create chunk with `is_figure_caption: true`
3. Add breadcrumb: `[Context: {section} > Figures]`
4. Link to figure_map.json for image path
5. Parse abbreviation block if present (`;` separated key-value pairs)

### RQ-7: Cross-Page Paragraph Handling

**Decision**: Join paragraphs split by page breaks, record all source pages

**Rationale**:
- Phase 1 already removes page break markers in content
- Need to track that chunk content originated from multiple pages
- Useful for PDF coordinate mapping in future phases

**Implementation**:
1. Detect consecutive blocks with same `section_id` across page boundaries
2. Phase 1 normalizer already joins text (verify this)
3. Record `page_numbers: [N, N+1, ...]` in chunk metadata

### RQ-8: Preview HTML Generation

**Decision**: Simple static HTML with inline CSS, no JavaScript framework

**Rationale**:
- Development/debugging aid, not production feature
- Simple table of contents + chunk cards
- Inline CSS for single-file portability
- No build step required

**Implementation**:
1. Generate HTML document with embedded CSS
2. Navigation: Table of contents by section
3. Each chunk as card: breadcrumb header, content, metadata footer
4. Highlight figure captions distinctively

### RQ-9: Chunk ID Generation

**Decision**: Pattern: `{document_id}-chunk-{sequence_number:04d}`

**Rationale**:
- Human-readable and sortable
- Unique within document
- Sequence number enables ordering without parsing
- Example: `rhoton-supratentorial-cerebral-veins-chunk-0042`

### RQ-10: Index Structure Design

**Decision**: Three lookup maps in ChunkIndex

**Rationale**:
- Enable O(1) lookups for common access patterns
- Pre-compute at chunking time, not at query time
- JSON-serializable structure

**Structure**:
```
{
  document_id: string,
  total_chunks: number,
  chunks_by_section: { section_id: [chunk_id, ...] },
  chunks_by_page: { page_number: [chunk_id, ...] },
  figure_to_chunks: { figure_id: [chunk_id, ...] }
}
```

## Summary

All research questions resolved. No external dependencies required beyond Phase 1 stack (Bun, zod). Design follows Constitution principles:

- **Data Integrity**: Source block IDs preserved, breadcrumbs from original hierarchy
- **Schema Validation**: Zod schemas for Chunk/ChunkIndex
- **Test-First**: Clear test cases for each component
- **Traceability**: Full lineage from chunk → source blocks → original JSON
- **Simplicity**: Regex-based processing, no NLP libraries, file-based output
