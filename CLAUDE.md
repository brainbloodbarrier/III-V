# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

III-V is a medical document processing pipeline that transforms Rhoton neuroanatomy PDFs into RAG-ready chunks. The pipeline has two phases:

1. **Phase 1 (Ingestion)**: Parse PDF exports (JSON/Markdown), normalize text, build figure mappings
2. **Phase 2 (Chunking)**: Split into overlapping chunks with breadcrumb context for retrieval

## Commands

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run specific test file
bun test tests/unit/chunker/splitter.test.ts

# Run tests matching pattern
bun test --filter "breadcrumb"

# Run Phase 1: Data ingestion
bun run src/cli/ingest.ts

# Run Phase 2: Structural chunking
bun run src/cli/chunk.ts

# Type check (no emit, strict mode)
bun run tsc --noEmit
```

## Architecture

### Pipeline Flow
```
PDF → JSON/Markdown exports → [Phase 1: ingest.ts] → normalized/document.json + figure_map.json
                                                   ↓
                            [Phase 2: chunk.ts] → chunks.json + chunk_index.json
```

### Directory Structure
- `src/services/` - Core processing logic
  - `parser/` - JSON/Markdown source parsing
  - `normalizer/` - Text normalization (ligatures, hyphenation, unicode)
  - `figure-mapper/` - Figure-to-image linking
  - `chunker/` - Token-aware splitting with overlap
  - `validator/` - Quality gate validation
  - `writer/` - Output serialization
- `src/models/` - TypeScript interfaces + Zod schemas
- `src/config/` - Chunking limits and validation thresholds
- `processed/` - Pipeline outputs (gitignored, regenerable)
- `specs/` - Feature specifications and contracts

### Key Patterns

**Naming Convention**: snake_case for serialized/persisted data (JSON files), camelCase for internal runtime types. See `src/models/chunk.ts` for examples.

**Zod Schema Validation**: All outputs validate against Zod schemas before serialization. Schemas live in `src/models/schemas.ts`.

**Quality Gates**: Both phases have validation gates (parse rate, ligature count, chunk sizes). Failing gates exit with code 1.

**Token Limits** (defined in `src/config/chunking.ts`):
- MAX_TOKENS: 512 (target during splitting)
- HARD_MAX_TOKENS: 600 (schema enforced max)
- MIN_TOKENS: 80 (merge threshold)

**Path Aliases** (tsconfig.json):
- `@/*` → `src/*`
- `@models/*` → `src/models/*`
- `@services/*` → `src/services/*`
- `@lib/*` → `src/lib/*`

### Test Organization
- `tests/unit/` - Isolated unit tests mirroring src structure
- `tests/integration/` - Full pipeline tests
- `tests/contract/` - Schema validation tests

## Configuration

Pipeline configuration is in `config/source-paths.json`. It defines:
- Source file paths (JSON, Markdown, images)
- Output directories for each phase
- Document metadata (id, title, author)

## Language

- Responses in Portuguese (Brazilian)
- Code, commits, and technical docs in English
- Commits follow conventional format: `type(scope): description`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
