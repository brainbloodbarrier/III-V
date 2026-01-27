# Implementation Plan: Data Ingestion & Normalization Pipeline

**Branch**: `001-data-ingestion-pipeline` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-data-ingestion-pipeline/spec.md`

## Summary

Transform Rhoton source files (77,647 JSON blocks + 10,924 Markdown lines + 188 images) into a unified `RhotonDocument` with figure mapping. Outputs: `document.json`, `figure_map.json`, `content.md`. Quality gates: 100% parse rate, zero ligatures, >90% figure coverage.

**Technical Approach**: TypeScript/Bun CLI pipeline with schema-validated JSON outputs, regex-based text normalization, and caption-extraction figure mapping.

## Technical Context

**Language/Version**: TypeScript 5.x with Bun 1.x runtime
**Primary Dependencies**: Bun (runtime/test/build), zod (schema validation)
**Storage**: JSON files in `processed/01_normalized/`
**Testing**: Bun test runner (`bun test`)
**Target Platform**: macOS/Linux CLI (Node.js compatible)
**Project Type**: Single CLI pipeline
**Performance Goals**: <30 seconds full document processing
**Constraints**: <500MB memory, fail-fast on validation errors
**Scale/Scope**: Single document (17MB JSON, 936KB Markdown, 188 images)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Data Integrity** | ✓ PASS | Source block IDs preserved in output; no LLM inference in Phase 1 |
| **II. Schema Validation** | ✓ PASS | TypeScript interfaces + Zod runtime validation; fail-fast on schema errors |
| **III. Test-First** | ✓ PASS | Unit tests required before implementation; 80%+ coverage for critical paths |
| **IV. Traceability** | ✓ PASS | All blocks reference source JSON IDs; structured logging planned |
| **V. Simplicity (YAGNI)** | ✓ PASS | File-based storage; no database; minimal dependencies |

**Gate Result**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-data-ingestion-pipeline/
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
│   ├── document.ts      # RhotonDocument, RhotonPage, ContentBlock interfaces
│   ├── figure.ts        # FigureReference interface
│   └── schemas.ts       # Zod schemas for runtime validation
├── services/
│   ├── parser/
│   │   ├── json-parser.ts    # Parse source JSON blocks
│   │   └── markdown-parser.ts # Parse Markdown with page boundaries
│   ├── normalizer/
│   │   ├── ligature.ts       # Unicode ligature replacement
│   │   ├── hyphenation.ts    # Line-break hyphen rejoining
│   │   ├── whitespace.ts     # Whitespace normalization
│   │   └── punctuation.ts    # Smart quote/punctuation normalization
│   ├── figure-mapper/
│   │   ├── caption-extractor.ts  # Extract inline image refs from captions
│   │   ├── reference-finder.ts   # Find Fig. X.Y patterns in text
│   │   └── mapper.ts             # Build figure-to-image mapping
│   └── validator/
│       ├── parse-rate.ts     # Verify 100% parse rate
│       ├── ligature-scan.ts  # Verify zero ligatures
│       └── coverage.ts       # Verify >90% figure coverage
├── cli/
│   └── ingest.ts        # CLI entry point
└── lib/
    ├── logger.ts        # Structured JSON logging
    └── config.ts        # Source file paths configuration

tests/
├── unit/
│   ├── normalizer/
│   │   ├── ligature.test.ts
│   │   ├── hyphenation.test.ts
│   │   └── punctuation.test.ts
│   ├── parser/
│   │   ├── json-parser.test.ts
│   │   └── markdown-parser.test.ts
│   └── figure-mapper/
│       ├── caption-extractor.test.ts
│       └── reference-finder.test.ts
├── integration/
│   └── pipeline.test.ts  # End-to-end pipeline test
└── contract/
    └── schema.test.ts    # Output schema validation

processed/
└── 01_normalized/
    ├── document.json     # Full RhotonDocument
    ├── figure_map.json   # Figure-to-image mappings
    └── content.md        # Normalized text

config/
└── source-paths.json     # Source file location configuration
```

**Structure Decision**: Single CLI project with modular services. No frontend/backend split needed for batch processing pipeline.

## Complexity Tracking

> No violations to justify - design follows all Constitution principles.
