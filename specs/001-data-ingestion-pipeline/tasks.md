# Tasks: Data Ingestion & Normalization Pipeline

**Input**: Design documents from `/specs/001-data-ingestion-pipeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution Principle III (Test-First) is active. Tests are included per TDD requirements.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization with Bun/TypeScript

- [ ] T001 Create project directory structure per plan.md (src/, tests/, processed/, config/)
- [ ] T002 Initialize Bun project with `bun init` and configure package.json
- [ ] T003 [P] Install zod dependency: `bun add zod`
- [ ] T004 [P] Create tsconfig.json with strict TypeScript configuration
- [ ] T005 [P] Create .gitignore for node_modules, .bun, processed/
- [ ] T006 [P] Create config/source-paths.json with source file locations
- [ ] T007 Create src/lib/logger.ts with structured JSON logging (LogEntry interface)
- [ ] T008 Create src/lib/config.ts to load source-paths.json configuration

**Checkpoint**: Project compiles with `bun build`, dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and schemas that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 [P] Create src/models/document.ts with RhotonDocument, RhotonPage, ContentBlock interfaces
- [ ] T010 [P] Create src/models/figure.ts with FigureReference, FigureStatus interfaces
- [ ] T011 Create src/models/schemas.ts with Zod schemas for all entities (RhotonDocumentSchema, etc.)
- [ ] T012 Create tests/contract/schema.test.ts to validate Zod schemas match JSON Schema contracts
- [ ] T013 Run schema contract tests and verify they PASS: `bun test tests/contract/`

**Checkpoint**: Foundation ready - all models defined, schemas validated

---

## Phase 3: User Story 1 - Load and Parse Source Files (Priority: P1) 🎯 MVP

**Goal**: Parse JSON/Markdown/images into unified RhotonDocument with 100% block coverage

**Independent Test**: Run pipeline against source files, verify document.json contains all 77,647 blocks

### Tests for User Story 1

> **TDD**: Write tests FIRST, ensure they FAIL, then implement

- [ ] T014 [P] [US1] Create tests/unit/parser/json-parser.test.ts with tests for block extraction, hierarchy preservation, bbox parsing
- [ ] T015 [P] [US1] Create tests/unit/parser/markdown-parser.test.ts with tests for page boundary detection, content extraction
- [ ] T016 [US1] Run parser tests and verify they FAIL: `bun test tests/unit/parser/`

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement src/services/parser/json-parser.ts - parse JSON blocks, extract block_type, id, html, section_hierarchy, bbox, children
- [ ] T018 [P] [US1] Implement src/services/parser/markdown-parser.ts - detect `{N}---` page boundaries, extract text content
- [ ] T019 [US1] Create src/services/parser/index.ts to orchestrate JSON + Markdown parsing into RhotonDocument
- [ ] T020 [US1] Run parser tests and verify they PASS: `bun test tests/unit/parser/`

**Checkpoint**: User Story 1 complete - parsing works, 100% block coverage verified

---

## Phase 4: User Story 2 - Normalize Text Content (Priority: P1)

**Goal**: Clean OCR artifacts, ligatures, hyphenation - zero ligatures in output

**Independent Test**: Scan output for ligature Unicode characters (ﬀﬁﬂﬃﬄ), verify count = 0

### Tests for User Story 2

- [ ] T021 [P] [US2] Create tests/unit/normalizer/ligature.test.ts with tests for ﬀ→ff, ﬁ→fi, ﬂ→fl, ﬃ→ffi, ﬄ→ffl
- [ ] T022 [P] [US2] Create tests/unit/normalizer/hyphenation.test.ts with tests for line-break rejoining, dictionary validation
- [ ] T023 [P] [US2] Create tests/unit/normalizer/whitespace.test.ts with tests for space collapse, control char removal
- [ ] T024 [P] [US2] Create tests/unit/normalizer/punctuation.test.ts with tests for smart quote→ASCII conversion
- [ ] T025 [US2] Run normalizer tests and verify they FAIL: `bun test tests/unit/normalizer/`

### Implementation for User Story 2

- [ ] T026 [P] [US2] Implement src/services/normalizer/ligature.ts with LIGATURE_MAP and replaceLigatures()
- [ ] T027 [P] [US2] Implement src/services/normalizer/hyphenation.ts with rejoining logic and dictionary lookup
- [ ] T028 [P] [US2] Implement src/services/normalizer/whitespace.ts with collapseWhitespace()
- [ ] T029 [P] [US2] Implement src/services/normalizer/punctuation.ts with normalizePunctuation()
- [ ] T030 [US2] Create src/services/normalizer/index.ts to compose all normalizers into normalizeText() pipeline
- [ ] T031 [US2] Run normalizer tests and verify they PASS: `bun test tests/unit/normalizer/`

**Checkpoint**: User Story 2 complete - text normalization works, zero ligatures

---

## Phase 5: User Story 3 - Map Figures to Images (Priority: P1)

**Goal**: Map figure references to image files with >90% coverage via caption extraction

**Independent Test**: Count figures in figure_map.json with status="mapped", verify ≥90% of total

### Tests for User Story 3

- [ ] T032 [P] [US3] Create tests/unit/figure-mapper/caption-extractor.test.ts with tests for inline image pattern extraction
- [ ] T033 [P] [US3] Create tests/unit/figure-mapper/reference-finder.test.ts with tests for Fig. patterns, range expansion
- [ ] T034 [P] [US3] Create tests/unit/figure-mapper/abbreviation-parser.test.ts with tests for "A., artery; B., vein" parsing
- [ ] T035 [US3] Run figure-mapper tests and verify they FAIL: `bun test tests/unit/figure-mapper/`

### Implementation for User Story 3

- [ ] T036 [P] [US3] Implement src/services/figure-mapper/caption-extractor.ts to extract `![](_page_N_Figure_M.jpeg)` from captions
- [ ] T037 [P] [US3] Implement src/services/figure-mapper/reference-finder.ts to find Fig. X.Y patterns, expand ranges
- [ ] T038 [P] [US3] Implement src/services/figure-mapper/abbreviation-parser.ts to parse abbreviation blocks
- [ ] T039 [US3] Create src/services/figure-mapper/mapper.ts to build FigureReference objects with status
- [ ] T040 [US3] Run figure-mapper tests and verify they PASS: `bun test tests/unit/figure-mapper/`

**Checkpoint**: User Story 3 complete - figure mapping works, >90% coverage

---

## Phase 6: User Story 4 - Generate Output Artifacts (Priority: P2)

**Goal**: Write document.json, figure_map.json, content.md to processed/01_normalized/

**Independent Test**: Verify all 3 files exist and validate against JSON schemas

### Tests for User Story 4

- [ ] T041 [P] [US4] Create tests/unit/writer/document-writer.test.ts with tests for JSON serialization, schema compliance
- [ ] T042 [P] [US4] Create tests/unit/writer/markdown-writer.test.ts with tests for content.md generation with headers
- [ ] T043 [US4] Run writer tests and verify they FAIL: `bun test tests/unit/writer/`

### Implementation for User Story 4

- [ ] T044 [P] [US4] Create src/services/writer/document-writer.ts to serialize RhotonDocument to document.json
- [ ] T045 [P] [US4] Create src/services/writer/figure-map-writer.ts to serialize figure_map to figure_map.json
- [ ] T046 [P] [US4] Create src/services/writer/markdown-writer.ts to generate content.md with section headers
- [ ] T047 [US4] Create src/services/writer/index.ts to orchestrate all writers
- [ ] T048 [US4] Run writer tests and verify they PASS: `bun test tests/unit/writer/`

**Checkpoint**: User Story 4 complete - all output files generated correctly

---

## Phase 7: User Story 5 - Validate Quality Gates (Priority: P2)

**Goal**: Automated validation of parse rate (100%), ligatures (0), figure coverage (>90%)

**Independent Test**: Run validation, verify report shows PASS for all 3 gates

### Tests for User Story 5

- [ ] T049 [P] [US5] Create tests/unit/validator/parse-rate.test.ts with tests for 100% threshold check
- [ ] T050 [P] [US5] Create tests/unit/validator/ligature-scan.test.ts with tests for zero-ligature verification
- [ ] T051 [P] [US5] Create tests/unit/validator/coverage.test.ts with tests for >90% figure coverage check
- [ ] T052 [US5] Run validator tests and verify they FAIL: `bun test tests/unit/validator/`

### Implementation for User Story 5

- [ ] T053 [P] [US5] Implement src/services/validator/parse-rate.ts to compare source blocks vs output blocks
- [ ] T054 [P] [US5] Implement src/services/validator/ligature-scan.ts to scan content.md for ligature Unicode
- [ ] T055 [P] [US5] Implement src/services/validator/coverage.ts to calculate mapped/total figure percentage
- [ ] T056 [US5] Create src/services/validator/index.ts to run all gates and produce ValidationReport
- [ ] T057 [US5] Run validator tests and verify they PASS: `bun test tests/unit/validator/`

**Checkpoint**: User Story 5 complete - quality gate validation works

---

## Phase 8: Integration & CLI

**Purpose**: Wire everything together into runnable pipeline

- [ ] T058 Create src/cli/ingest.ts as CLI entry point with arg parsing for --json, --markdown, --images, --validate-only
- [ ] T059 Create tests/integration/pipeline.test.ts with end-to-end test using sample source data
- [ ] T060 Run integration test and verify PASS: `bun test tests/integration/`
- [ ] T061 Run full pipeline against real source files: `bun run src/cli/ingest.ts`
- [ ] T062 Verify quality gates PASS with actual data (100% parse, 0 ligatures, >90% figures)

**Checkpoint**: Full pipeline operational

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and documentation

- [ ] T063 [P] Run all tests with coverage: `bun test --coverage` - verify >80% coverage
- [ ] T064 [P] Validate quickstart.md instructions work end-to-end
- [ ] T065 [P] Add error handling for malformed JSON blocks (log and skip per edge case spec)
- [ ] T066 [P] Add error handling for missing image files (mark as "unresolved" per edge case spec)
- [ ] T067 Code review: verify all source block IDs preserved (Constitution Principle I)
- [ ] T068 Code review: verify all outputs validate against Zod schemas (Constitution Principle II)

**Checkpoint**: Feature complete, all tests passing, documentation verified

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────┐
                                │
Phase 2: Foundational ──────────┤ (BLOCKS all user stories)
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
Phase 3: US1 (Parse)  ◄──────────────────────► Phase 4: US2 (Normalize)
        │                                               │
        └───────────────────┬───────────────────────────┘
                            │
                            ▼
                    Phase 5: US3 (Figures)
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
Phase 6: US4 (Output)  ◄─────────────► Phase 7: US5 (Validate)
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
                    Phase 8: Integration
                            │
                            ▼
                    Phase 9: Polish
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Parse) | Phase 2 only | US2 (Normalize) |
| US2 (Normalize) | Phase 2 only | US1 (Parse) |
| US3 (Figures) | US1 (needs parsed blocks) | - |
| US4 (Output) | US1, US2, US3 | US5 (Validate) |
| US5 (Validate) | US4 (needs outputs) | - |

### Parallel Opportunities by Phase

| Phase | Parallel Tasks |
|-------|----------------|
| Setup | T003, T004, T005, T006 |
| Foundational | T009, T010 |
| US1 Tests | T014, T015 |
| US1 Impl | T017, T018 |
| US2 Tests | T021, T022, T023, T024 |
| US2 Impl | T026, T027, T028, T029 |
| US3 Tests | T032, T033, T034 |
| US3 Impl | T036, T037, T038 |
| US4 Tests | T041, T042 |
| US4 Impl | T044, T045, T046 |
| US5 Tests | T049, T050, T051 |
| US5 Impl | T053, T054, T055 |
| Polish | T063, T064, T065, T066 |

---

## Parallel Example: User Story 2 (Normalize)

```bash
# Launch all tests in parallel:
Task: "tests/unit/normalizer/ligature.test.ts"
Task: "tests/unit/normalizer/hyphenation.test.ts"
Task: "tests/unit/normalizer/whitespace.test.ts"
Task: "tests/unit/normalizer/punctuation.test.ts"

# After tests fail, launch all implementations in parallel:
Task: "src/services/normalizer/ligature.ts"
Task: "src/services/normalizer/hyphenation.ts"
Task: "src/services/normalizer/whitespace.ts"
Task: "src/services/normalizer/punctuation.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (BLOCKS all stories)
3. Complete Phase 3: US1 (Parse) → Verify 100% block coverage
4. Complete Phase 4: US2 (Normalize) → Verify 0 ligatures
5. Complete Phase 5: US3 (Figures) → Verify >90% coverage
6. **STOP and VALIDATE**: Core processing complete, quality gates passable

### Full Delivery

1. MVP (above) → Core pipeline works
2. Add Phase 6: US4 (Output) → Artifacts written
3. Add Phase 7: US5 (Validate) → Automated gate checking
4. Add Phase 8: Integration → CLI operational
5. Add Phase 9: Polish → Production ready

### Parallel Team Strategy

With 2 developers after Phase 2:
- Developer A: US1 (Parse) → US3 (Figures) → US5 (Validate)
- Developer B: US2 (Normalize) → US4 (Output) → Integration

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 68 |
| **Setup Tasks** | 8 |
| **Foundational Tasks** | 5 |
| **US1 Tasks (Parse)** | 7 |
| **US2 Tasks (Normalize)** | 11 |
| **US3 Tasks (Figures)** | 9 |
| **US4 Tasks (Output)** | 8 |
| **US5 Tasks (Validate)** | 9 |
| **Integration Tasks** | 5 |
| **Polish Tasks** | 6 |
| **Parallel Opportunities** | 40+ tasks marked [P] |
| **MVP Scope** | Phases 1-5 (US1-US3) |

---

## Notes

- [P] tasks = different files, safe to run in parallel
- [Story] label tracks which user story owns the task
- TDD enforced: write failing tests before implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- All outputs must validate against Zod schemas (Constitution Principle II)
- All blocks must preserve source IDs (Constitution Principle I)
