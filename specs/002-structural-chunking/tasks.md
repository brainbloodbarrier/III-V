# Tasks: Structural Chunking Implementation

**Input**: Design documents from `/specs/002-structural-chunking/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Test tasks included per Constitution principle III (Test-First).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend Phase 1 project structure for Phase 2 chunking

- [x] T001 Extend `config/source-paths.json` with Phase 2 output paths (`processed/02_chunks/`)
- [x] T002 [P] Create directory structure: `src/services/chunker/`, `tests/unit/chunker/`
- [x] T003 [P] Create `processed/02_chunks/` output directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core interfaces and schemas that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define Chunk, ChunkIndex, FigureRef interfaces in `src/models/chunk.ts`
- [x] T005 Define ChunkSchema, ChunkIndexSchema, FigureRefSchema Zod schemas in `src/models/schemas.ts`
- [x] T006 [P] Create contract test in `tests/contract/chunk-schema.test.ts` (validate schemas match JSON Schema contracts)
- [x] T007 [P] Implement token estimator in `src/services/chunker/tokenizer.ts` (chars/4 heuristic)
- [x] T008 [P] Create tokenizer unit test in `tests/unit/chunker/tokenizer.test.ts`

**Checkpoint**: Foundation ready - schemas validated, token estimation working

---

## Phase 3: User Story 1 - Transform Document into Self-Contained Chunks (Priority: P1)

**Goal**: Every chunk includes breadcrumb context preamble; all 1690 blocks produce chunks with valid context

**Independent Test**: Run chunking on `document.json` and verify each chunk contains `[Context: X > Y > Z]` preamble

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Create breadcrumb unit test in `tests/unit/chunker/breadcrumb.test.ts`
- [x] T010 [P] [US1] Create splitter unit test (basic path) in `tests/unit/chunker/splitter.test.ts`

### Implementation for User Story 1

- [x] T011 [US1] Implement breadcrumb resolver in `src/services/chunker/breadcrumb.ts` (block IDs → text labels, format `[Context: X > Y]`)
- [x] T012 [US1] Implement basic splitter in `src/services/chunker/splitter.ts` (single chunks for content ≤ MAX_TOKENS)
- [x] T013 [US1] Implement chunking orchestrator in `src/services/chunker/index.ts` (load document, iterate blocks, produce chunks)
- [x] T014 [US1] Create CLI entry point in `src/cli/chunk.ts` (parse args, invoke orchestrator, write output)
- [x] T015 [US1] Write chunks.json output with ChunkSchema validation

**Checkpoint**: US1 complete - all blocks produce chunks with breadcrumb context; `bun run src/cli/chunk.ts` produces `chunks.json`

---

## Phase 4: User Story 2 - Handle Long Content with Intelligent Splitting (Priority: P2)

**Goal**: Content exceeding MAX_TOKENS splits at paragraph/sentence boundaries, not mid-word

**Independent Test**: Provide 1500-char block, verify multiple chunks split at sentences with same breadcrumb

### Tests for User Story 2

- [x] T016 [P] [US2] Create sentence detection unit test in `tests/unit/chunker/sentence.test.ts`
- [x] T017 [P] [US2] Extend splitter test for long content in `tests/unit/chunker/splitter.test.ts`

### Implementation for User Story 2

- [x] T018 [US2] Implement sentence boundary detection in `src/services/chunker/sentence.ts` (regex with abbreviation protection: "Fig.", "Dr.", "No.", etc.)
- [x] T019 [US2] Extend splitter for recursive splitting in `src/services/chunker/splitter.ts` (paragraph → sentence boundaries)
- [x] T020 [US2] Add fallback character split at whitespace when sentence detection fails

**Checkpoint**: US2 complete - long blocks split intelligently; no chunk exceeds 600 tokens; no mid-word truncation

---

## Phase 5: User Story 3 - Extract Figure Captions as Standalone Chunks (Priority: P2)

**Goal**: All 84 figure captions become standalone chunks with `is_figure_caption: true` and linked images

**Independent Test**: Verify 84 chunks with `is_figure_caption: true`, each with figure ID and image path

### Tests for User Story 3

- [x] T021 [P] [US3] Create figure linker unit test in `tests/unit/chunker/figure-linker.test.ts`

### Implementation for User Story 3

- [x] T022 [US3] Implement figure linker in `src/services/chunker/figure-linker.ts` (load figure_map.json, match captions, populate FigureRef)
- [x] T023 [US3] Extend orchestrator to detect `block_type: "figure_caption"` and mark `is_figure_caption: true`
- [x] T024 [US3] Link caption chunks to image paths from figure_map.json

**Checkpoint**: US3 complete - 84 figure caption chunks with image references

---

## Phase 6: User Story 4 - Maintain Chunk Continuity with Overlap (Priority: P3)

**Goal**: Adjacent chunks within same section share last 2 sentences as overlap

**Independent Test**: Examine adjacent chunks, verify ending sentences of chunk N appear at start of chunk N+1

### Tests for User Story 4

- [x] T025 [P] [US4] Create overlap unit test in `tests/unit/chunker/overlap.test.ts`

### Implementation for User Story 4

- [x] T026 [US4] Implement overlap generator in `src/services/chunker/overlap.ts` (extract last 2 sentences, prepend to next chunk)
- [x] T027 [US4] Extend orchestrator to apply overlap within sections only (no cross-section overlap)
- [x] T028 [US4] Track `overlap_tokens` in chunk metadata

**Checkpoint**: US4 complete - chunks have continuity overlap; `overlap_tokens` field populated

---

## Phase 7: User Story 5 - Generate Chunk Index for Efficient Retrieval (Priority: P3)

**Goal**: ChunkIndex enables O(1) lookup by section, page, and figure reference

**Independent Test**: Query index for section ID, verify correct chunk IDs returned

### Tests for User Story 5

- [x] T029 [P] [US5] Create index builder unit test (inline in `tests/integration/chunker.test.ts` or separate)

### Implementation for User Story 5

- [x] T030 [US5] Implement index builder in orchestrator: `chunks_by_section`, `chunks_by_page`, `figure_to_chunks`
- [x] T031 [US5] Write `chunk_index.json` with ChunkIndexSchema validation

**Checkpoint**: US5 complete - `chunk_index.json` enables efficient lookups

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, small chunk handling, preview generation, quality gates

### Small Chunk Merging (Cross-Cutting)

- [x] T032 [P] [FR-003] Create merger unit test in `tests/unit/chunker/merger.test.ts`
- [x] T033 [FR-003] Implement chunk merger in `src/services/chunker/merger.ts` (merge <80 token chunks within same section)

### Preview & Validation

- [x] T034 Implement preview.html generator in `src/services/chunker/preview-generator.ts` (visual chunk browser)
- [x] T035 [P] Implement quality gate validator (100% coverage, no >600 tokens, all breadcrumbs valid)
- [x] T036 Write `chunking-validation.json` with quality gate results

### Integration Testing

- [x] T037 Create end-to-end integration test in `tests/integration/chunker.test.ts`
- [x] T038 Run full pipeline validation: `bun run src/cli/chunk.ts` on actual `document.json`

### CLI Polish

- [x] T039 Add CLI options: `--help`, `--validate-only`, `--verbose`
- [x] T040 Add structured logging throughout pipeline

**Checkpoint**: All quality gates pass; preview.html renders; quickstart.md steps all work

---

## Phase 9: Cross-Page Paragraph Handling

**Purpose**: Detect and seamlessly join paragraphs that span across page breaks

### Tests for Cross-Page Handling

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T041 [P] [FR-008] Create unit test for page joiner in `tests/unit/chunker/page-joiner.test.ts`
  - Test removal of page break markers
  - Test seamless joining of cross-page content
  - Test that all page_numbers are preserved

### Implementation for Cross-Page Handling

- [ ] T042 [FR-008] Implement cross-page paragraph joiner in `src/services/chunker/page-joiner.ts`
  - Detect page break markers (e.g., "--- PAGE BREAK ---", "[Page N]")
  - Remove markers and join text seamlessly
  - Ensure all source pages are recorded in chunk's `page_numbers` array

**Checkpoint**: Cross-page content joined seamlessly; all page numbers preserved in metadata

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1): Must complete first (provides base orchestrator)
  - US2 (P2): Depends on US1 (extends splitter)
  - US3 (P2): Can parallel with US2 (extends orchestrator differently)
  - US4 (P3): Depends on US1, US2 (needs chunks to add overlap)
  - US5 (P3): Depends on US1 (needs chunks to index)
- **Polish (Phase 8)**: Depends on all user stories complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Breadcrumb resolver before splitter
- Splitter before orchestrator
- Core implementation before integration

### Parallel Opportunities

```text
Phase 2: T006, T007, T008 can run in parallel
Phase 3: T009, T010 can run in parallel (tests)
Phase 4: T016, T017 can run in parallel (tests)
Phase 5: T021 runs independently
Phase 6: T025 runs independently
Phase 7: T029 runs independently
Phase 8: T032, T035 can run in parallel
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run `bun run src/cli/chunk.ts`, verify chunks.json has breadcrumbs
5. All content produces chunks with context - MVP complete

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test: chunks have breadcrumbs → MVP!
3. Add US2 → Test: long content splits correctly
4. Add US3 → Test: 84 figure caption chunks
5. Add US4 → Test: overlap between adjacent chunks
6. Add US5 → Test: index enables lookups
7. Polish → All quality gates pass

---

## Quality Gates

| Gate | Threshold | Validation |
|------|-----------|------------|
| Content Coverage | 100% | All 1690 source blocks in chunks |
| Max Token Limit | ≤600 | No chunk exceeds 600 tokens |
| Min Token Check | ≥80 | No chunk <80 tokens (except section-final) |
| Breadcrumb Coverage | 100% | All chunks have valid breadcrumb |
| Figure Captions | 84 chunks | All captions with `is_figure_caption: true` |
| Schema Validation | Pass | Output validates against JSON schemas |
| Processing Time | <30s | Full document processes in under 30 seconds |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
