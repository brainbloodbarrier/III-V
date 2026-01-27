# Quickstart: Data Ingestion Pipeline

## Prerequisites

- **Bun** >= 1.0 ([install](https://bun.sh))
- Source files in project root:
  - `rhoton_supratentorial_cerebral_veins_ventric.pdf.json`
  - `rhoton_supratentorial_cerebral_veins_ventric.pdf.markdown`
  - `rhoton_supratentorial_cerebral_veins_ventric 2.pdf/` (image directory)

## Installation

```bash
# Install dependencies
bun install
```

## Running the Pipeline

```bash
# Run full ingestion pipeline
bun run src/cli/ingest.ts

# Or with explicit source paths
bun run src/cli/ingest.ts \
  --json ./rhoton_supratentorial_cerebral_veins_ventric.pdf.json \
  --markdown ./rhoton_supratentorial_cerebral_veins_ventric.pdf.markdown \
  --images "./rhoton_supratentorial_cerebral_veins_ventric 2.pdf/"
```

## Output

On success, outputs are written to `processed/01_normalized/`:

```
processed/01_normalized/
├── document.json     # Full RhotonDocument (~18MB)
├── figure_map.json   # Figure-to-image mappings
└── content.md        # Normalized text (~1MB)
```

## Verifying Results

```bash
# Run validation checks
bun run src/cli/ingest.ts --validate-only

# Expected output:
# ✓ Parse Rate: 100% (77647/77647 blocks)
# ✓ Ligatures: 0 remaining
# ✓ Figure Coverage: 94.2% (89/94 figures mapped)
#
# All quality gates PASSED
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun test tests/unit/normalizer/
bun test tests/integration/pipeline.test.ts

# Run with coverage
bun test --coverage
```

## Quality Gates

| Gate | Threshold | Validation |
|------|-----------|------------|
| Parse Rate | 100% | All JSON blocks represented in output |
| Ligatures | 0 | No Unicode ligature characters remain |
| Figure Coverage | >90% | Figures mapped to image files |

Pipeline fails if any gate is not met.

## Troubleshooting

### "Source file not found"
Ensure source files are in the project root with exact filenames.

### "Parse rate < 100%"
Check `processed/01_normalized/validation-report.json` for failed block IDs.

### "Figure coverage < 90%"
Review `figure_map.json` for figures with status `no-image-in-caption` or `unresolved`.

## Next Steps

After successful ingestion, proceed to Phase 2 chunking:

```bash
bun run scripts/02_chunk.ts
```
