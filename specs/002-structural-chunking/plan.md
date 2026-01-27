# Implementation Plan: Structural Chunking Implementation

**Branch**: `002-structural-chunking` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-structural-chunking/spec.md`

## Summary

Transform Phase 1 normalized document (1690 blocks, 499 pages) into self-contained retrieval-ready chunks with hierarchical breadcrumb context. Each chunk preserves full hierarchical path (e.g., `[Context: THE CEREBRAL VEINS > SUPERFICIAL VEINS > Tentorial Group]`), enabling meaningful retrieval without external context.

**Technical Approach**: TypeScript/Bun CLI continuing Phase 1 patterns. Recursive hierarchical chunking with sentence boundary detection. Outputs: `chunks.json`, `chunk_index.json`, `preview.html`.

## Technical Context

**Language/Version**: TypeScript 5.x with Bun 1.x runtime (continue Phase 1)
**Primary Dependencies**: Bun (runtime/test/build), zod (schema validation)
**Storage**: JSON files in `processed/02_chunks/`
**Testing**: Bun test runner (`bun test`)
**Target Platform**: macOS/Linux CLI (Node.js compatible)
**Project Type**: Single CLI pipeline (extend Phase 1)
**Performance Goals**: <30 seconds for full document (1690 blocks)
**Constraints**: MAX_TOKENS=512, HARD_MAX=600, MIN_TOKENS=80; <500MB memory
**Scale/Scope**: Single document producing ~300-500 estimated chunks
**Note**: Quality gates (acceptance criteria) defined in tasks.md:252

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Data Integrity** | ✓ PASS | Source block IDs preserved in chunk metadata; breadcrumb from original hierarchy |
| **II. Schema Validation** | ✓ PASS | Chunk/ChunkIndex Zod schemas; fail-fast on validation errors |
| **III. Test-First** | ✓ PASS | Unit tests for splitter/breadcrumb/sentence detection before implementation |
| **IV. Traceability** | ✓ PASS | Each chunk references source_block_ids; structured logging |
| **V. Simplicity (YAGNI)** | ✓ PASS | File-based JSON output; regex sentence detection (no NLP library); simple token estimation |

**Gate Result**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/002-structural-chunking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (JSON schemas)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── chunk.ts         # Chunk, ChunkIndex, FigureRef interfaces
│   └── schemas.ts       # Extend with ChunkSchema, ChunkIndexSchema
├── services/
│   └── chunker/
│       ├── index.ts           # Orchestrator - main chunking pipeline
│       ├── breadcrumb.ts      # Resolve block IDs → text labels, format context
│       ├── tokenizer.ts       # Token counting (chars/4 heuristic)
│       ├── splitter.ts        # Recursive hierarchical splitting
│       ├── sentence.ts        # Sentence boundary detection
│       ├── overlap.ts         # Generate chunk overlap
│       ├── merger.ts          # Merge small chunks within sections
│       ├── figure-linker.ts   # Link chunks to figure metadata
│       └── page-joiner.ts     # Join cross-page paragraphs (FR-008)
├── cli/
│   └── chunk.ts         # CLI entry point for Phase 2
└── lib/
    └── config.ts        # Extend with Phase 2 output paths

tests/
├── unit/
│   └── chunker/
│       ├── breadcrumb.test.ts
│       ├── tokenizer.test.ts
│       ├── sentence.test.ts
│       ├── splitter.test.ts
│       ├── overlap.test.ts
│       └── merger.test.ts
├── integration/
│   └── chunker.test.ts  # End-to-end chunking test
└── contract/
    └── chunk-schema.test.ts  # Chunk output schema validation

processed/
└── 02_chunks/
    ├── chunks.json           # Array of Chunk objects
    ├── chunk_index.json      # Indexing metadata
    ├── preview.html          # Visual chunk browser
    └── chunking-validation.json  # Quality gate report

config/
└── source-paths.json    # Extend with Phase 2 output config
```

**Structure Decision**: Extend Phase 1 single CLI project. Add new `chunker` service following same patterns as `parser`, `normalizer`, `figure-mapper`.

## Complexity Tracking

> No violations to justify - design follows all Constitution principles.
