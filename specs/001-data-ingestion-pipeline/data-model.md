# Data Model: Data Ingestion & Normalization Pipeline

**Date**: 2026-01-24
**Feature**: 001-data-ingestion-pipeline

## Entity Overview

```
┌─────────────────┐
│ RhotonDocument  │
├─────────────────┤
│ id              │
│ title           │
│ author          │
│ source_files    │
│ pages[]         │──────┐
│ figure_map      │──┐   │
└─────────────────┘  │   │
                     │   │
     ┌───────────────┘   │
     │                   │
     ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ FigureReference │  │   RhotonPage    │
├─────────────────┤  ├─────────────────┤
│ figure_id       │  │ page_number     │
│ image_file      │  │ blocks[]        │───┐
│ page_number     │  └─────────────────┘   │
│ caption         │                        │
│ abbreviations   │                        ▼
└─────────────────┘               ┌─────────────────┐
                                  │  ContentBlock   │
                                  ├─────────────────┤
                                  │ id              │
                                  │ block_type      │
                                  │ level           │
                                  │ content         │
                                  │ raw_html        │
                                  │ parent_hierarchy│
                                  │ figure_refs     │
                                  │ bbox            │
                                  │ section_id      │
                                  └─────────────────┘
```

---

## Entities

### RhotonDocument

The root entity representing a complete ingested and normalized Rhoton source document.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique document identifier (e.g., "rhoton-cerebral-veins") |
| `title` | string | Yes | Document title extracted from content (e.g., "The Cerebral Veins") |
| `author` | string | Yes | Author name (e.g., "Albert L. Rhoton, Jr., M.D.") |
| `source_files` | SourceFiles | Yes | Paths to original source files |
| `pages` | RhotonPage[] | Yes | Array of pages with content blocks |
| `figure_map` | Record<string, FigureReference> | Yes | Map of figure IDs to metadata |
| `metadata` | DocumentMetadata | Yes | Processing metadata |

**Validation Rules**:
- `id` must be non-empty, lowercase, hyphen-separated
- `pages` must have at least 1 page
- `figure_map` keys must match pattern `Fig. \d+\.\d+`

---

### SourceFiles

Reference to original source file locations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `json` | string | Yes | Path to source JSON file |
| `markdown` | string | Yes | Path to source Markdown file |
| `image_dir` | string | Yes | Path to image directory |

**Validation Rules**:
- All paths must be valid file system paths
- Files must exist at specified locations

---

### DocumentMetadata

Processing metadata for traceability.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `processed_at` | string (ISO 8601) | Yes | Timestamp of processing |
| `pipeline_version` | string | Yes | Version of ingestion pipeline |
| `source_json_lines` | number | Yes | Total lines in source JSON |
| `source_markdown_lines` | number | Yes | Total lines in source Markdown |
| `total_images` | number | Yes | Count of images in source directory |
| `parse_rate` | number | Yes | Percentage of blocks successfully parsed (0-100) |
| `ligature_count` | number | Yes | Count of remaining ligatures (should be 0) |
| `figure_coverage` | number | Yes | Percentage of figures mapped (0-100) |

---

### RhotonPage

A single page from the document.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `page_number` | number | Yes | 0-indexed page number |
| `blocks` | ContentBlock[] | Yes | Content blocks on this page |

**Validation Rules**:
- `page_number` must be >= 0
- `blocks` can be empty (for image-only pages)

---

### ContentBlock

An individual content element (text, header, figure caption, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Source JSON block ID (e.g., "/page/0/SectionHeader/1") |
| `block_type` | BlockType | Yes | Type of content block |
| `level` | number | Yes | Header level (1-6) or 0 for non-header blocks |
| `content` | string | Yes | Normalized text content |
| `raw_html` | string | Yes | Original HTML from source JSON |
| `parent_hierarchy` | string[] | Yes | Breadcrumb path (e.g., ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS"]) |
| `figure_references` | string[] | Yes | Figure IDs referenced in this block (e.g., ["Fig. 4.1"]) |
| `bbox` | BoundingBox | Yes | Bounding box coordinates from source |
| `section_id` | string | Yes | Unique section identifier |

**BlockType Enum**:
- `section_header` - H1-H6 headers
- `text` - Body text paragraphs
- `figure_caption` - Figure caption blocks
- `page_header` - Page headers/footers
- `inline_math` - Mathematical notation

**Validation Rules**:
- `id` must match pattern `/page/\d+/\w+/\d+`
- `level` must be 0-6
- `parent_hierarchy` must have at least 1 element for non-root blocks
- `content` must be non-empty after normalization

---

### BoundingBox

Spatial coordinates from source PDF layout.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `x1` | number | Yes | Left edge coordinate |
| `y1` | number | Yes | Top edge coordinate |
| `x2` | number | Yes | Right edge coordinate |
| `y2` | number | Yes | Bottom edge coordinate |

**Validation Rules**:
- All coordinates must be >= 0
- `x2` > `x1` and `y2` > `y1`

---

### FigureReference

Mapping between a figure ID and its image file with metadata.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `figure_id` | string | Yes | Canonical figure ID (e.g., "Fig. 4.1") |
| `image_file` | string | No | Image filename if mapped (e.g., "_page_3_Figure_0.jpeg") |
| `page_number` | number | Yes | Page where figure appears |
| `caption` | string | Yes | Full figure caption text |
| `abbreviations` | Record<string, string> | Yes | Parsed abbreviations (e.g., {"A": "artery"}) |
| `status` | FigureStatus | Yes | Mapping status |

**FigureStatus Enum**:
- `mapped` - Successfully mapped to image file
- `no-image-in-caption` - Caption lacks inline image reference
- `unresolved` - Image file not found in directory

**Validation Rules**:
- `figure_id` must match pattern `Fig\. \d+\.\d+`
- `image_file` required when `status` is "mapped"
- `caption` must be non-empty

---

### NormalizationRule

Configuration for text transformation (internal use).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Rule identifier |
| `pattern` | string | Yes | Regex pattern or literal string |
| `replacement` | string | Yes | Replacement value |
| `is_regex` | boolean | Yes | Whether pattern is regex |

---

## Relationships

| From | To | Cardinality | Description |
|------|------|-------------|-------------|
| RhotonDocument | RhotonPage | 1:N | Document contains pages |
| RhotonDocument | FigureReference | 1:N | Document has figure map |
| RhotonPage | ContentBlock | 1:N | Page contains blocks |
| ContentBlock | FigureReference | N:M | Blocks reference figures |

---

## State Transitions

### FigureReference Status

```
[Initial] ──parse──► [no-image-in-caption]
                          │
    [Initial] ──parse──► [mapped] (if inline image found)
                          │
    [mapped] ──validate──► [unresolved] (if image file missing)
```

---

## Indexes

For downstream processing efficiency:

1. **Block Index**: Map block IDs to ContentBlock objects
2. **Section Index**: Map section_id to list of block IDs
3. **Figure Index**: Map figure IDs to list of referencing block IDs
