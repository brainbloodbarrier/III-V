# III-V: Rhoton Neuroanatomy RAG Pipeline

A medical document processing pipeline that transforms Rhoton neuroanatomy PDFs into RAG-ready chunks with figure linking and breadcrumb context.

## Overview

III-V processes PDF exports through a two-phase pipeline:

1. **Phase 1 (Ingestion)**: Parse JSON/Markdown exports, normalize text (ligatures, hyphenation), build figure-to-image mappings
2. **Phase 2 (Chunking)**: Split into overlapping chunks with section breadcrumbs for retrieval-augmented generation

```
PDF → JSON/Markdown exports → [Ingest] → document.json + figure_map.json
                                      ↓
                              [Chunk] → chunks.json + chunk_index.json
```

## Quick Start

```bash
# Install dependencies
bun install

# Run Phase 1: Data ingestion
bun run src/cli/ingest.ts

# Run Phase 2: Structural chunking
bun run src/cli/chunk.ts
```

## Project Structure

```
src/
├── cli/              # Pipeline entry points (ingest.ts, chunk.ts)
├── services/         # Core processing logic
│   ├── parser/       # JSON/Markdown source parsing
│   ├── normalizer/   # Text normalization (ligatures, unicode)
│   ├── figure-mapper/# Figure-to-image linking
│   ├── chunker/      # Token-aware splitting with overlap
│   ├── validator/    # Quality gate validation
│   └── writer/       # Output serialization
├── models/           # TypeScript interfaces + Zod schemas
├── config/           # Chunking limits, validation thresholds
└── anki-export/      # FSRS flashcard export module

specs/                # Feature specifications with JSON Schema contracts
processed/            # Pipeline outputs (gitignored)
tests/                # Unit, integration, and contract tests
```

## Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/chunker/splitter.test.ts

# Run tests matching pattern
bun test --filter "breadcrumb"

# Type check (strict mode)
bun run tsc --noEmit
```

## Configuration

Pipeline configuration is defined in `config/source-paths.json`:

```json
{
  "sources": { "json": "...", "markdown": "...", "imageDir": "..." },
  "output": { "baseDir": "processed/", "document": "...", "figureMap": "..." },
  "chunking": { "baseDir": "processed/", "chunks": "...", "chunkIndex": "..." },
  "document": { "id": "rhoton-3rd-ventricle", "title": "...", "author": "..." }
}
```

### Token Limits

Defined in `src/config/chunking.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_TOKENS` | 512 | Target during splitting |
| `HARD_MAX_TOKENS` | 600 | Schema-enforced maximum |
| `MIN_TOKENS` | 80 | Merge threshold for small chunks |

## Modules

### Data Ingestion Pipeline (Phase 1)
Parses PDF exports, normalizes text, maps figures to images, validates quality gates.
- Spec: `specs/001-data-ingestion-pipeline/`
- Output: `document.json`, `figure_map.json`

### Structural Chunking (Phase 2)
Splits document into overlapping chunks with breadcrumb context for RAG.
- Spec: `specs/002-structural-chunking/`
- Output: `chunks.json`, `chunk_index.json`

### Anki Export
Converts flashcards CSV to Anki-importable format with FSRS optimization.
- Location: `src/anki-export/`
- Docs: `docs/specs/anki-export-spec.md`

## Quality Gates

Phase 1 validates three quality metrics:

| Gate | Threshold | Description |
|------|-----------|-------------|
| `parse_rate` | >= 95% | Blocks successfully parsed |
| `ligature_count` | == 0 | Ligatures remaining after normalization |
| `figure_coverage` | >= 90% | Figures mapped to images |

## Development

### Key Patterns

- **Naming**: `snake_case` for JSON fields, `camelCase` for runtime code
- **Validation**: Zod schemas with `.describe()` for all fields
- **Path aliases**: `@models/*`, `@services/*`, `@lib/*` (see `tsconfig.json`)

### Running Tests

```bash
bun test                          # All tests
bun test tests/unit/              # Unit tests only
bun test tests/contract/          # Schema validation tests
bun test tests/integration/       # Full pipeline tests
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Project guidance for Claude Code
- **[specs/](./specs/)** - Feature specifications with JSON Schema contracts
- **[docs/](./docs/)** - Additional documentation and guides

## License

Private project - All rights reserved.
