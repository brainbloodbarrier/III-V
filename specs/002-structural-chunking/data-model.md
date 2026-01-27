# Data Model: Structural Chunking Implementation

**Feature**: 002-structural-chunking
**Date**: 2026-01-24

## Entity Relationship Overview

```
┌─────────────────┐     ┌─────────────────┐
│ RhotonDocument  │────▶│   RhotonPage    │
│ (Phase 1 Input) │  1:n│   (Phase 1)     │
└─────────────────┘     └────────┬────────┘
                                 │ 1:n
                                 ▼
                        ┌─────────────────┐
                        │  ContentBlock   │
                        │   (Phase 1)     │
                        └────────┬────────┘
                                 │ n:m (splitting/merging)
                                 ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ChunkIndex    │◀────│     Chunk       │────▶│   FigureRef     │
│  (lookup maps)  │  1:n│  (Phase 2 Out)  │  1:n│  (per chunk)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 │ references
                                 ▼
                        ┌─────────────────┐
                        │  FigureMap      │
                        │ (Phase 1 Input) │
                        └─────────────────┘
```

## Entities

### Chunk (Primary Output Entity)

The core output unit - a self-contained text segment with full hierarchical context.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chunk_id` | string | Yes | Unique identifier: `{doc_id}-chunk-{seq:04d}` |
| `document_id` | string | Yes | Parent document reference |
| `breadcrumb` | string[] | Yes | Hierarchy path: `["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"]` |
| `breadcrumb_text` | string | Yes | Formatted: `[Context: X > Y > Z]` |
| `content` | string | Yes | The actual chunk text (without context prefix) |
| `content_with_context` | string | Yes | breadcrumb_text + "\n\n" + content |
| `page_numbers` | number[] | Yes | Source pages: `[3]` or `[3, 4]` if spans |
| `source_block_ids` | string[] | Yes | Original JSON block IDs for traceability |
| `sequence_number` | number | Yes | Order within document (0-indexed) |
| `previous_chunk_id` | string \| null | Yes | Link to previous chunk (null if first) |
| `next_chunk_id` | string \| null | Yes | Link to next chunk (null if last) |
| `parent_section_id` | string | Yes | Section this chunk belongs to |
| `figure_references` | FigureRef[] | Yes | Figures mentioned in this chunk |
| `token_count` | number | Yes | Estimated tokens (chars / 4) |
| `character_count` | number | Yes | Character count of content |
| `overlap_tokens` | number | Yes | Tokens shared with previous chunk (0 if none) |
| `is_figure_caption` | boolean | Yes | True if this is a figure caption chunk |
| `is_table` | boolean | Yes | Reserved for future use; always `false` in Phase 2 |
| `contains_abbreviations` | boolean | Yes | True if abbreviation definitions present |

**Validation Rules**:
- `token_count` must be <= 600 (hard max)
- `token_count` should be >= 80 (soft min, except final chunks)
- `breadcrumb` must have at least 1 element
- `source_block_ids` must have at least 1 element
- `sequence_number` must be unique within document

**State**: Chunks are immutable once created. No lifecycle transitions.

### FigureRef (Embedded in Chunk)

Reference linking a chunk to a figure.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `figure_id` | string | Yes | Figure identifier: `"Fig. 4.1"` |
| `image_path` | string | Yes | Path to image file: `"./rhoton.../image-12.jpg"` |
| `caption_snippet` | string | Yes | First 100 chars of caption |

**Validation Rules**:
- `figure_id` must match pattern: `Fig. \d+\.\d+`
- `image_path` must be non-empty string

### ChunkIndex (Lookup Structure)

Enables efficient retrieval by section, page, or figure.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_id` | string | Yes | Parent document reference |
| `total_chunks` | number | Yes | Count of chunks in collection |
| `chunks_by_section` | Record<string, string[]> | Yes | section_id → chunk_ids |
| `chunks_by_page` | Record<number, string[]> | Yes | page_number → chunk_ids |
| `figure_to_chunks` | Record<string, string[]> | Yes | figure_id → chunk_ids |

**Validation Rules**:
- All chunk_ids referenced must exist in chunks.json
- `total_chunks` must equal length of chunks.json array

### Breadcrumb (Value Object)

Represents hierarchical path, used internally during processing.

| Field | Type | Description |
|-------|------|-------------|
| `labels` | string[] | Text labels from root to current position |
| `block_ids` | string[] | Original block IDs (for traceability) |

**Formatting**:
- `format()` → `"[Context: Label1 > Label2 > Label3]"`
- Empty breadcrumb → `"[Context: Document Root]"`

## Input Entities (from Phase 1)

### RhotonDocument (Read-Only Input)

```typescript
interface RhotonDocument {
  id: string;
  title: string;
  author: string;
  pages: RhotonPage[];
  figure_map: Record<string, FigureReference>;
  metadata: {
    source_json_lines: number;
    source_markdown_lines: number;
    ligature_count: number;
    figure_coverage: number;
  };
}
```

### ContentBlock (Read-Only Input)

```typescript
interface ContentBlock {
  id: string;                    // "/page/3/Text/5"
  block_type: BlockType;         // "section_header" | "text" | "figure_caption" | ...
  content: string;               // Normalized text
  raw_html?: string;             // Original HTML
  parent_hierarchy: string[];    // Block IDs of parent headers
  page_number: number;
  section_id?: string;
}
```

### FigureReference (Read-Only Input from figure_map.json)

```typescript
interface FigureReference {
  figure_id: string;
  page_number: number;
  caption: string;
  caption_block_id: string;
  abbreviations: string[];
  status: "mapped" | "no-image-in-caption" | "unresolved";
  image_file?: string;
  image_path?: string;
  referencing_blocks?: string[];
}
```

## Output File Formats

### chunks.json

```json
{
  "document_id": "rhoton-supratentorial-cerebral-veins",
  "generated_at": "2026-01-24T12:00:00Z",
  "total_chunks": 342,
  "chunks": [
    {
      "chunk_id": "rhoton-supratentorial-cerebral-veins-chunk-0001",
      "document_id": "rhoton-supratentorial-cerebral-veins",
      "breadcrumb": ["THE CEREBRAL VEINS", "INTRODUCTION"],
      "breadcrumb_text": "[Context: THE CEREBRAL VEINS > INTRODUCTION]",
      "content": "The cerebral veins are divided into...",
      "content_with_context": "[Context: THE CEREBRAL VEINS > INTRODUCTION]\n\nThe cerebral veins are divided into...",
      "page_numbers": [1],
      "source_block_ids": ["/page/1/Text/3"],
      "sequence_number": 0,
      "previous_chunk_id": null,
      "next_chunk_id": "rhoton-supratentorial-cerebral-veins-chunk-0002",
      "parent_section_id": "/page/1/SectionHeader/2",
      "figure_references": [],
      "token_count": 128,
      "character_count": 512,
      "overlap_tokens": 0,
      "is_figure_caption": false,
      "is_table": false,
      "contains_abbreviations": false
    }
  ]
}
```

### chunk_index.json

```json
{
  "document_id": "rhoton-supratentorial-cerebral-veins",
  "total_chunks": 342,
  "chunks_by_section": {
    "/page/1/SectionHeader/2": ["rhoton-...-chunk-0001", "rhoton-...-chunk-0002"],
    "/page/5/SectionHeader/1": ["rhoton-...-chunk-0015", "rhoton-...-chunk-0016"]
  },
  "chunks_by_page": {
    "1": ["rhoton-...-chunk-0001"],
    "2": ["rhoton-...-chunk-0002", "rhoton-...-chunk-0003"],
    "3": ["rhoton-...-chunk-0003", "rhoton-...-chunk-0004"]
  },
  "figure_to_chunks": {
    "Fig. 4.1": ["rhoton-...-chunk-0010", "rhoton-...-chunk-0042"],
    "Fig. 4.2": ["rhoton-...-chunk-0015"]
  }
}
```

## Processing Flow

```
1. Load Phase 1 outputs
   ├── document.json → RhotonDocument
   └── figure_map.json → FigureMap

2. Build header index
   └── Scan section_headers → Map<block_id, header_text>

3. Process blocks sequentially
   ├── For each block:
   │   ├── Resolve breadcrumb (parent_hierarchy → text labels)
   │   ├── Calculate effective tokens (breadcrumb + content)
   │   ├── If fits: create single chunk
   │   ├── If too large: split (paragraphs → sentences)
   │   └── If figure_caption: mark is_figure_caption=true
   └── Track sequence numbers

4. Post-process chunks
   ├── Merge small chunks (< MIN_TOKENS)
   ├── Add overlap to adjacent chunks
   ├── Link previous/next chunk IDs
   └── Link figure references

5. Build index
   ├── Group by section
   ├── Group by page
   └── Map figures to chunks

6. Validate and write
   ├── Validate all chunks against schema
   ├── Write chunks.json
   ├── Write chunk_index.json
   └── Generate preview.html
```
