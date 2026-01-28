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

# Run anki-export tests
bun test tests/unit/anki-export/

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

**Input Types for Zod**: Use separate `*Input` interfaces for pre-validation data. Parse with `Schema.safeParse()` and handle errors with detailed logging:
```typescript
const result = Schema.safeParse(input);
if (!result.success) {
  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  console.warn(`Validation failed: ${issues}`);
}
```

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

## Anki Export Module

Located in `src/anki-export/`, converts flashcards CSV to Anki-importable format with FSRS optimization.

```bash
# Convert CSV to Anki format
bun run src/anki-export/csv-to-anki.ts

# Setup Anki via AnkiConnect (requires Anki running with addon 2055492159)
bun run src/anki-export/setup-anki.ts

# Add hints to existing CSV
bun run src/anki-export/add-hints.ts
```

**Environment Variables:**
- `ANKI_CONNECT_URL` - AnkiConnect endpoint (default: `http://localhost:8765`)
- `ANKI_BATCH_SIZE` - Cards per batch (default: 50)
- `ANKI_TIMEOUT_MS` - Request timeout (default: 10000)

**Key Patterns:**
- `CardInput` type for pre-Zod-validation data in `types/fsrs-card.ts`
- External templates in `templates/` (card-front.html, card-back.html, styles.css)
- Shared CSV parser in `lib/csv-parser.ts` (RFC 4180 compliant)

## Schema Documentation

All Zod schemas in `src/models/schemas.ts` use `.describe()` for field-level documentation. These descriptions are the source of truth for field semantics.

```typescript
// Example: documented schema
export const ChunkSchema = z.object({
  chunk_id: z.string()
    .regex(/^[a-z0-9-]+-chunk-[0-9]{4}$/)
    .describe("{document_id}-chunk-{sequence:04d}"),
  token_count: z.number()
    .int().min(1).max(600)
    .describe("Token count (chars/4). Hard max: 600"),
}).describe("Self-contained text unit with breadcrumb context for RAG");
```

Access descriptions via `schema.description` for documentation generation.

## Slides Module

Located in `src/slides/`, generates presentation support materials for neuroanatomy content.

- Configuration: `config/slides-data.json`
- Output: Supporting documentation per slide
- Related docs: `docs/slides/`

## Language

- Responses in Portuguese (Brazilian)
- Code, commits, and technical docs in English
- Commits follow conventional format: `type(scope): description`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
