# Research: Data Ingestion & Normalization Pipeline

**Date**: 2026-01-24
**Feature**: 001-data-ingestion-pipeline

## Research Summary

All technical context resolved from PRD and codebase exploration. No external research required - source data formats and algorithms fully documented.

---

## R1: JSON Block Parsing Strategy

**Decision**: Stream JSON array, extract blocks with `block_type`, `id`, `html`, `section_hierarchy`, `bbox`, and `children` fields.

**Rationale**:
- Source JSON is 17MB with 77,647 lines - fits in memory for Bun
- Block structure is consistent with documented schema
- `section_hierarchy` provides explicit parent relationships (no inference needed)

**Alternatives Considered**:
- SAX-style streaming: Rejected - Bun handles 17MB easily; streaming adds complexity
- SQLite intermediate: Rejected - YAGNI; file-based output sufficient

---

## R2: Markdown Page Boundary Detection

**Decision**: Use regex `\{(\d+)\}-{48}` to detect page breaks (e.g., `{5}------------------------------------------------`).

**Rationale**:
- Pattern is consistent throughout source Markdown
- PRD confirms 48 dashes after page number
- Approximately 150 page breaks in document

**Alternatives Considered**:
- Line counting: Rejected - page breaks are explicit markers
- JSON bbox-based: Rejected - Markdown parsing is cleaner for text extraction

---

## R3: Ligature Replacement Map

**Decision**: Direct Unicode character replacement using a static map.

**Rationale**:
- Limited set of ligatures from OCR: ﬀ→ff, ﬁ→fi, ﬂ→fl, ﬃ→ffi, ﬄ→ffl
- Deterministic transformation, no heuristics
- PRD Table 1.2.2 confirms this exact set

**Implementation**:
```typescript
const LIGATURE_MAP: Record<string, string> = {
  '\ufb00': 'ff',  // ﬀ
  '\ufb01': 'fi',  // ﬁ
  '\ufb02': 'fl',  // ﬂ
  '\ufb03': 'ffi', // ﬃ
  '\ufb04': 'ffl', // ﬄ
};
```

**Alternatives Considered**:
- NLP-based detection: Rejected - ligatures are Unicode codepoints, not contextual
- External library: Rejected - trivial replacement doesn't warrant dependency

---

## R4: Hyphenation Rejoining Strategy

**Decision**: Regex-based rejoining with optional dictionary validation for medical terms.

**Rationale**:
- Pattern: word-fragment at line end + fragment at line start
- Medical terminology (e.g., "supratentorial") requires domain-aware validation
- Spec edge case: preserve original if rejoined word invalid

**Implementation Pattern**:
```typescript
// Match: word-\nword pattern
const HYPHEN_PATTERN = /(\w+)-\n(\w+)/g;
// Rejoin and validate against dictionary
```

**Alternatives Considered**:
- Always rejoin: Rejected - creates invalid words for intentional hyphens
- Never rejoin: Rejected - misses legitimate OCR splits
- LLM validation: Rejected - YAGNI for Phase 1; simple dictionary sufficient

**Dictionary Source**: Standard English dictionary + medical/anatomical terms list (to be bundled or fetched).

---

## R5: Figure-to-Image Mapping Algorithm

**Decision**: Caption extraction - parse inline image references from FIGURE captions.

**Rationale**:
- Clarification session confirmed this approach
- Captions contain explicit image refs: `![](_page_N_Figure_M.jpeg)`
- More reliable than position-based matching

**Algorithm**:
1. Find all `FIGURE X.Y` caption blocks in Markdown
2. Extract inline image pattern: `!\[\]\((_page_\d+_Figure_\d+\.jpeg)\)`
3. Map figure ID to extracted image filename
4. For figures without inline refs, mark as "no-image-in-caption"

**Alternatives Considered**:
- Position-based (sequential): Rejected - unreliable for out-of-order figures
- Hybrid approach: Deferred - pure caption extraction should achieve >90%
- Manual mapping file: Rejected - requires maintenance; defeats automation

---

## R6: Figure Reference Pattern Detection

**Decision**: Multi-pattern regex to capture all variants.

**Rationale**:
- PRD documents 4 patterns: parens, LaTeX, inline, full caps
- Spec FR-010 requires handling: "Fig. N.N", "Figs. N.N–N.N", "Figure N.N", "FIGURE N.N"

**Patterns**:
```typescript
const FIGURE_PATTERNS = [
  /\(Figs?\.\s*([\d.–-]+)\)/g,        // (Fig. 4.1) or (Figs. 4.1–4.3)
  /\$Fig\.\s*([\d.]+)\$/g,            // $Fig. 4.1$
  /FIGURE\s+([\d.]+)/gi,              // FIGURE 4.1 or Figure 4.1
  /!\[\]\((_page_\d+_Figure_\d+\.jpeg)\)/g  // Inline image
];
```

**Alternatives Considered**:
- Single complex regex: Rejected - harder to debug and maintain
- NLP-based extraction: Rejected - YAGNI; patterns are predictable

---

## R7: Abbreviation Parsing from Captions

**Decision**: Parse comma-separated abbreviation blocks from figure captions.

**Rationale**:
- Pattern identified in PRD: `A., artery; Ant., anterior; Bas., basilar;`
- Spec FR-012 requires parsing to {A: "lateral view"} format
- ~30 abbreviation blocks identified in source

**Implementation Pattern**:
```typescript
// Pattern: "Key., value; Key2., value2;"
const ABBREV_PATTERN = /([A-Z][a-z]*\.),\s*([^;]+);?/g;
```

**Alternatives Considered**:
- LLM extraction: Rejected - deterministic pattern sufficient
- Manual mapping: Rejected - defeats automation goal

---

## R8: Schema Validation Library

**Decision**: Zod for runtime validation.

**Rationale**:
- TypeScript-first with excellent type inference
- Bun-compatible
- Supports complex nested schemas (RhotonDocument structure)
- Fail-fast validation aligns with Constitution Principle II

**Alternatives Considered**:
- JSON Schema (ajv): More verbose; weaker TypeScript integration
- io-ts: Steeper learning curve; Zod is more popular
- No validation: Rejected - violates Constitution Principle II

---

## R9: Structured Logging

**Decision**: Simple JSON logger to stdout/file.

**Rationale**:
- Constitution Principle IV requires structured logging
- No external service integration needed for Phase 1
- JSON format enables downstream processing

**Implementation**:
```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}
```

**Alternatives Considered**:
- Pino/Winston: Overkill for CLI batch job
- Console.log: Rejected - not structured

---

## R10: Output File Locations

**Decision**: Follow PRD directory structure.

**Rationale**:
- PRD Appendix B defines canonical paths
- Enables Phase 2/3 pipeline composition

**Paths**:
```
processed/01_normalized/
├── document.json     # Full RhotonDocument
├── figure_map.json   # Figure-to-image mappings
└── content.md        # Normalized Markdown
```

**Alternatives Considered**:
- Single combined file: Rejected - harder to inspect/debug
- Database: Rejected - YAGNI per Constitution Principle V

---

## Open Items

None - all technical decisions resolved.

## Next Steps

Proceed to Phase 1: Generate data-model.md, contracts/, and quickstart.md.
