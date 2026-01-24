<!--
==============================================================================
SYNC IMPACT REPORT

Version change: N/A → 1.0.0 (Initial)
Bump rationale: Initial constitution ratification

Modified principles: N/A (Initial)
Added sections:
  - Core Principles (5 principles)
  - Technical Constraints
  - Quality Gates
  - Development Workflow
  - Governance

Removed sections: N/A (Initial)

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Updated: Constitution Check table with 5 principles)
  - .specify/templates/spec-template.md ✅ (Compatible - no changes needed)
  - .specify/templates/tasks-template.md ✅ (Compatible - no changes needed)

Follow-up TODOs: None
==============================================================================
-->

# Rhoton Knowledge Base Constitution

## Core Principles

### I. Data Integrity

All output MUST preserve source accuracy with zero hallucinations. Every extracted
entity, relationship, and clinical assertion MUST be traceable to specific source
text. Fabricated content is a critical failure.

**Non-negotiable rules:**
- Entity extraction MUST include source block ID reference
- Hallucination detection MUST run on 100% of LLM outputs
- Confidence scores < 0.7 MUST trigger human review or model escalation
- Abbreviation expansions MUST derive from explicit figure caption definitions only

**Rationale:** Medical content errors can propagate to clinical decisions. Source
traceability enables verification and correction.

### II. Schema Validation

All pipeline outputs MUST conform to declared TypeScript interfaces and JSON
schemas. Type safety is enforced at compile time and runtime. No `any` types,
no unvalidated JSON parsing.

**Non-negotiable rules:**
- Every data structure MUST have a TypeScript interface definition
- JSON outputs MUST validate against JSON Schema before persistence
- Schema validation failures MUST halt the pipeline (fail-fast)
- Breaking schema changes require MAJOR version bump in outputs

**Rationale:** Downstream consumers (embedding pipelines, RAG systems) depend on
stable, predictable data shapes. Schema drift causes silent failures.

### III. Test-First

Tests MUST be written before implementation. The Red-Green-Refactor cycle is
mandatory. No code ships without passing tests that existed before the code.

**Non-negotiable rules:**
- Unit tests MUST exist for all transformation functions
- Contract tests MUST validate JSON output shapes
- Integration tests MUST verify end-to-end pipeline phases
- Test coverage MUST exceed 80% for critical paths (ingest, chunk, enrich)

**Rationale:** Pipeline correctness is non-negotiable for medical content.
Tests catch regressions before they corrupt the knowledge base.

### IV. Traceability & Observability

Every chunk MUST carry its full hierarchical context (breadcrumb). Every
processing step MUST emit structured logs. Quality metrics MUST be measurable
and reported.

**Non-negotiable rules:**
- Chunks MUST include `breadcrumb` field with full section hierarchy
- All pipeline scripts MUST emit structured JSON logs
- Enrichment MUST include `enrichment_confidence` score per chunk
- Quality reports MUST generate after each phase completion
- Entity extraction MUST map to ontology IDs (FMA/SNOMED CT) where possible

**Rationale:** LLM consumers need context to disambiguate pronouns and
references. Observability enables debugging and quality monitoring.

### V. Simplicity

Start minimal. Add complexity only when proven necessary. Prefer standard tools
over custom solutions. YAGNI applies to all design decisions.

**Non-negotiable rules:**
- Use mini-models (gpt-4o-mini, claude-3-haiku) first; escalate only on failure
- No abstractions without 2+ concrete use cases
- Prefer file-based storage until query patterns demand databases
- Avoid premature optimization; measure before optimizing

**Rationale:** This is an embryonic codebase. Over-engineering delays MVP and
creates maintenance burden. Ship working software first.

## Technical Constraints

**Language & Runtime:**
- Primary: TypeScript with Bun runtime
- Alternative: Python 3.11+ for specific NLP tasks (spaCy, nltk)
- Build: `bun build`, `bun test`

**LLM Processing:**
- Default model: `gpt-4o-mini` (cost-efficient, fast)
- Fallback model: `gpt-4o` (complex chunks, low-confidence escalation)
- Alternative: `claude-3-haiku` for validation passes
- Deployment: Docker containers for LLM processing offload
- Batch size: 50 chunks per parallel batch

**Data Storage:**
- Phase outputs: JSON files in `processed/{phase}/`
- No database required until query patterns emerge
- Figure images: Reference by path, no binary storage in JSON

**Performance Targets:**
- Phase 1 (Ingestion): < 30 seconds for full document
- Phase 2 (Chunking): < 60 seconds for all chunks
- Phase 3 (Enrichment): < 4 hours for full corpus (LLM-bound)
- Token limits: Max 600 tokens per chunk (hard limit)

## Quality Gates

**Phase Completion Gates:**

| Phase | Gate Criteria |
|-------|---------------|
| Ingestion | 100% JSON lines parsed, zero ligature artifacts, figure map > 90% coverage |
| Chunking | All content represented, no chunk > 600 tokens, 100% breadcrumbs valid |
| Enrichment | Average confidence > 0.75, hallucination rate < 2%, F1 > 0.85 on sample |

**Validation Thresholds:**
- Extraction confidence threshold: 0.7 (below triggers escalation)
- Sampling validation: 5% random sample with human review
- FMA ontology mapping target: > 60% of identified structures
- Entity density expectation: > 500 unique anatomical structures

**Failure Handling:**
- Schema validation failure: Halt pipeline, do not persist invalid output
- Confidence < 0.6: Retry with stronger model (gpt-4o)
- Retry exhausted: Flag for manual review, continue with warning

## Development Workflow

**Phase Dependencies:**
```
Phase 1 (Ingestion) → Phase 2 (Chunking) → Phase 3 (Enrichment)
     │                      │                      │
     ▼                      ▼                      ▼
 document.json         chunks.json         chunks_enriched.json
```

**Commit Discipline:**
- Atomic commits per logical unit of work
- Commit message format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Review Process:**
- Self-review required before marking task complete
- Quality report review after each phase
- Sample validation before phase sign-off

**Testing Workflow:**
1. Write failing test
2. Implement minimal code to pass
3. Refactor if needed
4. Run `bun test` before commit

## Governance

This constitution supersedes all other development practices for the Rhoton
Knowledge Base project. All implementation decisions MUST align with these
principles.

**Amendment Procedure:**
1. Propose amendment with rationale
2. Document impact on existing code/artifacts
3. Update constitution with version bump
4. Propagate changes to dependent templates
5. Generate Sync Impact Report

**Versioning Policy:**
- MAJOR: Principle removal/redefinition, breaking governance changes
- MINOR: New principle/section, materially expanded guidance
- PATCH: Clarifications, wording fixes, non-semantic refinements

**Compliance:**
- All PRs MUST pass Constitution Check in plan.md
- Complexity MUST be justified in Complexity Tracking table
- Violations require explicit waiver with documented rationale

**Version**: 1.0.0 | **Ratified**: 2025-01-24 | **Last Amended**: 2025-01-24
