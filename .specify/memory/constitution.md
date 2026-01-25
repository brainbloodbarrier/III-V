# III-V Data Pipeline Constitution

## Core Principles

### I. Data Integrity
All data transformations must preserve source information. Source block IDs are preserved in output metadata; breadcrumbs track full hierarchical paths from original document structure.

### II. Schema Validation
Fail-fast on invalid data. All inputs and outputs are validated against Zod schemas; schema violations halt processing with clear error messages.

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: Tests written first, approved, must fail, then implemented. Red-Green-Refactor cycle strictly enforced.

### IV. Traceability
Every output artifact references its source. Chunks track source_block_ids; structured logging provides audit trails for all transformations.

### V. Simplicity (YAGNI)
Start simple, add complexity only when justified. Use regex-based approaches before NLP libraries; file-based JSON storage before databases; simple heuristics before complex algorithms.

## Governance

Constitution supersedes all other practices. Amendments require documentation, approval, and migration plan. All plan reviews must validate against ratified principles.

**Version**: 1.0.0 | **Ratified**: 2026-01-24 | **Last Amended**: 2026-01-24