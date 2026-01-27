# Security Considerations

This document outlines the security model and assumptions for the III-V document chunking pipeline.

## Trust Model

This is a **local CLI tool** designed for offline document processing. It is **not** a web service or API endpoint.

### Input Trust

- **Trusted Sources**: Input files (`document.json`, `figure_map.json`) are expected to come from the Phase 1 PDF parser, not arbitrary user-uploaded content.
- **Local Execution**: All processing happens on the local filesystem with files provided via CLI arguments.
- **No Sandboxing**: The pipeline trusts the input data and does not implement content sandboxing.

### Path Handling

- **Local Paths Only**: All file paths are expected to be local filesystem paths.
- **No Path Traversal Protection**: Since this is a local CLI tool run by the user who owns the files, path traversal attacks are not a concern.
- **User-Controlled Output**: Output directories are specified by the user; no default sensitive locations are used.

## Resource Limits

### Memory Protection (Issue #208)

- **File Size Limit**: Input files exceeding 100 MB (`MAX_FILE_SIZE_BYTES`) are rejected to prevent memory exhaustion.
- **Rationale**: Largest expected documents are ~1 MB; 100 MB provides generous headroom while preventing accidental or malicious large file processing.
- **Location**: Enforced in `src/services/parser/json-parser.ts`

### Token Caching

- **Bounded Cache**: Token counting uses a cache that is cleared between documents to prevent memory bloat.
- **No Persistent State**: Token cache is ephemeral and does not persist across pipeline runs.

## Concurrency Model (Issue #214)

### Single-Threaded Execution

- **Sequential Processing**: The pipeline is designed for single-threaded, sequential document processing.
- **No Parallel Safety**: Running multiple instances targeting the same output directory will cause corruption.

### Race Condition Protection

- **Output Check**: Before processing, the pipeline checks for existing output files.
- **Fail-Fast**: If output files exist, the pipeline fails with a descriptive error suggesting `--force` flag.
- **Force Mode**: Users can explicitly override with `force: true` to overwrite existing files.

## Dependency Security (Issue #215)

### Automated Scanning

- **GitHub Dependabot**: Configured to check for dependency updates weekly.
- **Security Workflow**: GitHub Actions workflow runs `bun audit` (when available) or npm audit on PRs and pushes.

### Minimal Dependencies

This project intentionally minimizes dependencies:
- **Runtime**: `zod` (schema validation)
- **Development**: `@types/bun`

## Data Handling

### No Sensitive Data Processing

- **Medical Text**: While input may contain medical terminology, it is extracted from published academic texts (Rhoton anatomy), not patient data.
- **No PHI/PII**: The pipeline does not process protected health information or personally identifiable information.

### Output Files

- **JSON/HTML Only**: Output consists of JSON files and an HTML preview, all plain text formats.
- **No Encryption**: Outputs are not encrypted; they inherit filesystem permissions.

## Reporting Security Issues

If you discover a security issue:

1. **Do not** open a public GitHub issue
2. Contact the maintainers directly
3. Allow reasonable time for a fix before public disclosure

---

*Last updated: January 2026*
*Related issues: #208 (File Size), #212 (Documentation), #214 (Race Conditions), #215 (Dependency Audit)*
