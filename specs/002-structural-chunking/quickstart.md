# Quickstart: Structural Chunking Implementation

**Feature**: 002-structural-chunking
**Prerequisites**: Phase 1 complete (document.json, figure_map.json exist)

## Setup

```bash
# Verify Phase 1 outputs exist
ls processed/01_normalized/
# Should show: document.json, figure_map.json, content.md

# No new dependencies needed - uses existing Bun + zod
```

## Run Chunking

```bash
# Run the chunking pipeline
bun run src/cli/chunk.ts

# With options
bun run src/cli/chunk.ts --help
bun run src/cli/chunk.ts --validate-only  # Just validate existing output
```

## Verify Output

```bash
# Check outputs created
ls processed/02_chunks/
# Should show: chunks.json, chunk_index.json, preview.html

# View chunk count
cat processed/02_chunks/chunks.json | bun -e 'console.log(JSON.parse(await Bun.stdin.text()).total_chunks)'

# Open preview in browser
open processed/02_chunks/preview.html
```

## Run Tests

```bash
# Run all tests
bun test

# Run only chunker tests
bun test tests/unit/chunker/
bun test tests/integration/chunker.test.ts
bun test tests/contract/chunk-schema.test.ts
```

## Quality Gates

The pipeline validates these quality gates:

| Gate | Threshold | Check Command |
|------|-----------|---------------|
| Content Coverage | 100% | All source blocks in chunks |
| Max Token Limit | ≤600 | No chunk exceeds 600 tokens |
| Breadcrumb Coverage | 100% | All chunks have valid breadcrumb |
| Figure Captions | 84 chunks | All captions extracted |
| Schema Validation | Pass | Output validates against schemas |

## Development Workflow

### Adding a New Service Module

```bash
# 1. Create test file first (TDD)
touch tests/unit/chunker/my-module.test.ts

# 2. Run test - should fail
bun test tests/unit/chunker/my-module.test.ts

# 3. Create implementation
touch src/services/chunker/my-module.ts

# 4. Run test - should pass
bun test tests/unit/chunker/my-module.test.ts
```

### File Locations

| Component | Location |
|-----------|----------|
| Models/Interfaces | `src/models/chunk.ts` |
| Schemas | `src/models/schemas.ts` |
| Chunker Services | `src/services/chunker/` |
| CLI Entry | `src/cli/chunk.ts` |
| Unit Tests | `tests/unit/chunker/` |
| Integration Test | `tests/integration/chunker.test.ts` |
| Contract Tests | `tests/contract/chunk-schema.test.ts` |
| Output | `processed/02_chunks/` |

## Troubleshooting

### "Phase 1 outputs not found"
```bash
# Run Phase 1 first
bun run src/cli/ingest.ts
```

### "Chunk exceeds token limit"
- Check sentence boundary detection in `src/services/chunker/sentence.ts`
- May need to add more abbreviations to protection list

### "Missing breadcrumb for block"
- Block's `parent_hierarchy` references non-existent header
- Check `src/services/chunker/breadcrumb.ts` warning logs
- Verify Phase 1 document.json has valid section_hierarchy

### "Preview HTML not rendering"
- Check for malformed chunk content (unescaped HTML)
- Verify `src/services/chunker/preview-generator.ts` escapes content
