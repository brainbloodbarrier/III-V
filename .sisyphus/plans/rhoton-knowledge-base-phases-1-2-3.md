# PRD: Rhoton Neurosurgical Knowledge Base Pipeline
## Phases 1-3: Ingestion, Chunking, and Enrichment

---

## Executive Summary

Transform Rhoton's neurosurgical anatomy corpus (JSON/Markdown/HTML with 188 anatomical images) into an ultra-enriched, LLM-optimized knowledge base. This PRD covers the first three phases: **Data Ingestion & Normalization**, **Structural Chunking**, and **Semantic Enrichment**.

**End Goal**: A universal source of truth for surgical microneuroanatomy that enables deep semantic queries, preserves anatomical hierarchy, and links text to visual evidence.

---

## Source Data Analysis

### File Inventory

| File | Lines | Purpose | Quality |
|------|-------|---------|---------|
| `.pdf.json` | 77,647 | Structural metadata (block types, hierarchy, bounding boxes) | HIGH - Explicit labeling |
| `.pdf.markdown` | 10,924 | Clean text content with markdown formatting | HIGH - Human-readable |
| `.pdf.html` | TBD | Presentation layer | LOW - Noise-heavy |
| `images/` | 188 JPGs | Anatomical diagrams and surgical photos | HIGH - Critical for context |

### JSON Schema Discovery

```json
{
  "block_type": "SectionHeader" | "Text" | "Page" | "PageHeader" | "Document",
  "id": "/page/{N}/{BlockType}/{index}",
  "html": "<h1>THE CEREBRAL VEINS</h1>",
  "section_hierarchy": {
    "1": "/page/0/SectionHeader/1",    // H1 parent
    "2": "/page/0/SectionHeader/2"     // H2 parent
  },
  "bbox": [x1, y1, x2, y2],
  "polygon": [[x,y], [x,y], [x,y], [x,y]]
}
```

**Key Insight**: The `section_hierarchy` field provides EXPLICIT parent-child relationships. No regex guessing required.

### Markdown Patterns Identified

| Pattern | Regex | Example | Count (est.) |
|---------|-------|---------|--------------|
| Page break | `\{(\d+)\}-{48}` | `{5}------------------------------------------------` | ~150 |
| Figure ref (parens) | `\(Figs?\.\s*[\d.–-]+\)` | `(Figs. 4.1–4.3)` | ~200 |
| Figure ref (LaTeX) | `\$Fig\.\s*[\d.]+\$` | `$Fig. 4.1$` | ~50 |
| Inline image | `!\[\]\((_page_\d+_Figure_\d+\.jpeg)\)` | `![](_page_3_Figure_0.jpeg)` | ~100 |
| Abbreviation block | `[A-Z][a-z]*\.,.*[A-Z][a-z]*\.` | `A., artery; Ant., anterior;` | ~30 |

---

## Phase 1: Data Ingestion & Normalization

### 1.1 Objectives

- Create a unified `Document` data structure that merges JSON structure with Markdown content
- Normalize text artifacts (OCR errors, ligatures, hyphenation)
- Build a figure-to-image mapping table
- Archive HTML (not used in pipeline)

### 1.2 Technical Specifications

#### 1.2.1 Unified Document Schema

```typescript
interface RhotonDocument {
  id: string;                          // Unique document identifier
  title: string;                       // "The Cerebral Veins"
  author: string;                      // "Albert L. Rhoton, Jr., M.D."
  source_files: {
    json: string;
    markdown: string;
    image_dir: string;
  };
  pages: RhotonPage[];
  figure_map: Map<string, FigureReference>;  // "Fig. 4.1" -> metadata
}

interface RhotonPage {
  page_number: number;
  blocks: ContentBlock[];
}

interface ContentBlock {
  id: string;                          // From JSON: "/page/0/SectionHeader/1"
  block_type: 'section_header' | 'text' | 'figure' | 'table';
  level: number;                       // Header level (1-6) or 0 for text
  content: string;                     // Clean text from Markdown
  raw_html: string;                    // Original HTML from JSON
  parent_hierarchy: string[];          // ["THE CEREBRAL VEINS", "THE SUPERFICIAL VEINS"]
  figure_references: string[];         // ["Fig. 4.1", "Fig. 4.2"]
  bbox: BoundingBox;
  section_id: string;                  // Unique section identifier
}

interface FigureReference {
  figure_id: string;                   // "Fig. 4.1"
  image_file: string;                  // "image-12.jpg"
  page_number: number;
  caption: string;                     // Full figure caption text
  abbreviations: Map<string, string>; // {"A.": "artery", "Ant.": "anterior"}
}
```

#### 1.2.2 Text Normalization Pipeline

| Step | Input | Output | Implementation |
|------|-------|--------|----------------|
| 1. Ligature fix | `ﬁ`, `ﬂ`, `ﬀ` | `fi`, `fl`, `ff` | Unicode replacement map |
| 2. Hyphenation | `supra-\ntentorial` | `supratentorial` | Regex: `/(\w+)-\n(\w+)/` |
| 3. Whitespace | Multiple spaces/newlines | Single space | Collapse whitespace |
| 4. Quote normalization | `"`, `"`, `'`, `'` | `"`, `'` | Unicode to ASCII |
| 5. LaTeX cleanup | `$Fig. 4.1$` | `Fig. 4.1` | Strip `$` delimiters |

#### 1.2.3 Figure-to-Image Mapping Algorithm

```
INPUT: 
  - Markdown text with figure references
  - Image directory with image-1.jpg through image-188.jpg
  - JSON blocks with bbox coordinates

ALGORITHM:
1. Extract all figure references from markdown using regex
2. Extract all inline image embeds: ![](_page_N_Figure_M.jpeg)
3. Build initial mapping from inline embeds (explicit page+figure)
4. For remaining figure references:
   a. Find the text block containing "FIGURE X.Y" caption
   b. Get the page number from the block's section_hierarchy
   c. Match to image files on that page using bbox proximity
5. Store mapping: { "Fig. 4.1": { image: "image-12.jpg", caption: "...", page: 3 } }

OUTPUT: figure_map with all figure-to-image associations
```

### 1.3 Deliverables

| Deliverable | Format | Location |
|-------------|--------|----------|
| `RhotonDocument` object | JSON | `processed/01_normalized/document.json` |
| Figure mapping table | JSON | `processed/01_normalized/figure_map.json` |
| Normalized text corpus | Markdown | `processed/01_normalized/content.md` |
| Ingestion script | TypeScript/Python | `scripts/01_ingest.ts` |

### 1.4 Acceptance Criteria

- [ ] All 77,647 JSON lines parsed without error
- [ ] All 10,924 Markdown lines processed
- [ ] Figure map contains entries for >90% of figure references
- [ ] Zero ligature artifacts remain in output
- [ ] All blocks have valid `parent_hierarchy` populated
- [ ] Unit tests pass: `bun test scripts/__tests__/ingest.test.ts`

---

## Phase 2: Structural Analysis & Chunking

### 2.1 Objectives

- Transform the normalized document into "Self-Contained Anatomical Units"
- Preserve hierarchical context in every chunk
- Implement semantic boundary detection for long paragraphs
- Generate chunk metadata for downstream enrichment

### 2.2 Chunking Strategy: "Breadcrumb-First Hierarchical Splitting"

#### 2.2.1 The Breadcrumb Principle

**Problem**: A chunk containing "It drains into the transverse sinus" is useless without knowing what "it" refers to.

**Solution**: Every chunk includes its full hierarchical context as a preamble.

```
CHUNK OUTPUT FORMAT:
---
[Context: THE CEREBRAL VEINS > THE SUPERFICIAL VEINS > Tentorial Group]

The tentorial group of bridging veins drains into the sinuses coursing 
in the tentorium, called the tentorial sinuses, or into the transverse 
and superior petrosal sinuses in the tentorial margins. This group is 
composed of the veins draining the lateral surface of the temporal lobe 
and the basal surface of the temporal and occipital lobes.
---
```

#### 2.2.2 Chunking Algorithm

```
ALGORITHM: Recursive Hierarchical Chunking

INPUT: RhotonDocument with normalized blocks
OUTPUT: List<Chunk>

PARAMETERS:
  MAX_TOKENS = 512      // Target chunk size
  MIN_TOKENS = 100      // Minimum viable chunk
  OVERLAP_TOKENS = 50   // Overlap for continuity

PROCEDURE:

1. BUILD DOCUMENT TREE
   - Root: Document title
   - Branches: H1 headers (block_type: section_header, level: 1)
   - Sub-branches: H2-H6 headers
   - Leaves: Text blocks

2. FOR EACH LEAF NODE (text block):
   a. Compute breadcrumb = path from root to leaf
   b. Compute effective_tokens = tokens(breadcrumb) + tokens(text)
   
   c. IF effective_tokens <= MAX_TOKENS:
      - Create single chunk with breadcrumb + text
   
   d. ELSE IF text contains paragraph breaks:
      - Split on paragraph breaks (\n\n)
      - Recursively apply chunking to each paragraph
      - Each sub-chunk inherits the breadcrumb
   
   e. ELSE (long paragraph, no breaks):
      - Apply SEMANTIC BOUNDARY DETECTION
      - Find sentence boundaries using spaCy/nltk
      - Group sentences until MAX_TOKENS - breadcrumb_tokens
      - Create overlapping chunks at sentence boundaries

3. MERGE SMALL CHUNKS
   - If chunk < MIN_TOKENS, merge with previous chunk (same section)
   - Never merge across section boundaries

4. ADD OVERLAP
   - For each chunk, prepend last 2 sentences of previous chunk
   - Mark overlap region in metadata

RETURN chunks with metadata
```

#### 2.2.3 Chunk Schema

```typescript
interface Chunk {
  chunk_id: string;                    // "rhoton-veins-chunk-0042"
  document_id: string;                 // Parent document reference
  
  // Content
  breadcrumb: string[];                // ["THE CEREBRAL VEINS", "SUPERFICIAL VEINS", "Tentorial Group"]
  breadcrumb_text: string;             // Formatted: "[Context: X > Y > Z]"
  content: string;                     // The actual chunk text
  content_with_context: string;        // breadcrumb_text + "\n\n" + content
  
  // Position
  page_numbers: number[];              // [3, 4] if chunk spans pages
  source_block_ids: string[];          // Original JSON block IDs
  sequence_number: number;             // Order within document
  
  // Relationships
  previous_chunk_id: string | null;
  next_chunk_id: string | null;
  parent_section_id: string;
  
  // Figures
  figure_references: FigureRef[];      // Figures mentioned in this chunk
  
  // Metrics
  token_count: number;
  character_count: number;
  overlap_tokens: number;              // Tokens shared with previous chunk
  
  // Flags
  is_figure_caption: boolean;
  is_table: boolean;
  contains_abbreviations: boolean;
}

interface FigureRef {
  figure_id: string;                   // "Fig. 4.1"
  image_path: string;                  // "images/image-12.jpg"
  caption_snippet: string;             // First 100 chars of caption
}
```

### 2.3 Special Handling Rules

#### 2.3.1 Figure Captions

Figure captions are CRITICAL context. They contain:
- Anatomical structure labels
- Abbreviation definitions
- Spatial relationship descriptions

**Rule**: Figure captions are chunked as standalone units with `is_figure_caption: true`. They are also cross-referenced from text chunks that mention them.

```
FIGURE CAPTION CHUNK:
---
[Context: THE CEREBRAL VEINS > Figures]

FIGURE 4.1. Dural sinuses and bridging veins. A, oblique superior view, 
B, direct superior view with the falx and superior sagittal sinus removed.
The veins are divided into four groups based on their site of termination:
a superior sagittal group (dark blue), a tentorial group (green), 
a sphenoidal group (red), and a falcine group (purple).

[Figure: images/image-12.jpg]

Abbreviations: A., artery; Ant., anterior; Bas., basilar; ...
---
```

#### 2.3.2 Abbreviation Blocks

Dense abbreviation lists (e.g., `A., artery; Ant., anterior; Bas., basilar;`) are:
1. Parsed into key-value pairs
2. Stored in `figure_map[figure_id].abbreviations`
3. NOT chunked as standalone text (they're metadata)

#### 2.3.3 Cross-Page Continuity

When a paragraph spans multiple pages:
1. The page break marker `{N}------------------------------------------------` is removed
2. Text is joined seamlessly
3. `page_numbers` array contains all source pages: `[3, 4]`

### 2.4 Deliverables

| Deliverable | Format | Location |
|-------------|--------|----------|
| Chunk collection | JSON | `processed/02_chunks/chunks.json` |
| Chunk index | JSON | `processed/02_chunks/chunk_index.json` |
| Chunking script | TypeScript/Python | `scripts/02_chunk.ts` |
| Chunk visualization | HTML | `processed/02_chunks/preview.html` |

### 2.5 Acceptance Criteria

- [ ] All document content is represented in at least one chunk
- [ ] No chunk exceeds 600 tokens (hard limit)
- [ ] No chunk is smaller than 80 tokens (except final chunks)
- [ ] 100% of chunks have valid breadcrumb context
- [ ] Figure captions extracted as separate chunks
- [ ] Cross-page paragraphs properly joined
- [ ] Overlap regions correctly marked
- [ ] Unit tests pass: `bun test scripts/__tests__/chunk.test.ts`

---

## Phase 3: Semantic Enrichment

### 3.1 Objectives

- Extract structured neuroanatomy entities from each chunk
- Tag chunks with surgical relevance metadata
- Map entities to standardized ontologies (FMA/SNOMED CT)
- Generate embeddings-ready metadata

### 3.2 Entity Extraction Schema

```typescript
interface EnrichedChunk extends Chunk {
  // Neuroanatomy Entities
  entities: {
    structures: AnatomicalStructure[];
    vessels: Vessel[];
    nerves: Nerve[];
    surgical_approaches: SurgicalApproach[];
    pathologies: string[];
  };
  
  // Relationships
  spatial_relations: SpatialRelation[];
  
  // Clinical Context
  clinical_relevance: {
    is_surgical_landmark: boolean;
    is_danger_zone: boolean;
    surgical_considerations: string[];
  };
  
  // Ontology Mappings
  ontology_ids: {
    fma: string[];      // Foundational Model of Anatomy IDs
    snomed_ct: string[];// SNOMED CT concept IDs
  };
  
  // Quality Scores
  enrichment_confidence: number;  // 0.0 - 1.0
  entity_density: number;         // Entities per 100 tokens
}

interface AnatomicalStructure {
  name: string;                    // "Basal Vein of Rosenthal"
  type: 'vein' | 'artery' | 'nerve' | 'gyrus' | 'sulcus' | 'cistern' | 
        'sinus' | 'nucleus' | 'tract' | 'membrane' | 'bone' | 'muscle';
  aliases: string[];               // ["Rosenthal's vein", "basal vein"]
  fma_id: string | null;           // "FMA:50986"
  location_description: string;    // "courses around the midbrain"
}

interface Vessel {
  name: string;
  vessel_type: 'vein' | 'artery' | 'sinus';
  drains_to: string[];             // ["transverse sinus"]
  receives_from: string[];         // ["cortical veins"]
  clinical_significance: string;
}

interface SpatialRelation {
  subject: string;                 // "tentorial group"
  predicate: 'anterior_to' | 'posterior_to' | 'medial_to' | 'lateral_to' |
             'superior_to' | 'inferior_to' | 'deep_to' | 'superficial_to' |
             'drains_into' | 'receives_from' | 'courses_through' | 
             'adjacent_to' | 'crosses' | 'pierces';
  object: string;                  // "temporal lobe"
  confidence: number;
}
```

### 3.3 LLM Enrichment Pipeline

#### 3.3.1 Tagger Agent Prompt

```markdown
# Neuroanatomy Entity Extraction

You are a neuroanatomy expert extracting structured data from Rhoton's surgical anatomy text.

## Input
{chunk.content_with_context}

## Task
Extract all anatomical entities and relationships. Be EXHAUSTIVE but PRECISE.

## Output Schema (JSON)
{
  "structures": [
    {
      "name": "exact name from text",
      "type": "vein|artery|nerve|gyrus|sulcus|cistern|sinus|nucleus|tract|membrane|bone|muscle",
      "aliases": ["alternative names if mentioned"],
      "location_description": "spatial context from text"
    }
  ],
  "spatial_relations": [
    {
      "subject": "structure name",
      "predicate": "anterior_to|posterior_to|medial_to|lateral_to|superior_to|inferior_to|deep_to|superficial_to|drains_into|receives_from|courses_through|adjacent_to|crosses|pierces",
      "object": "related structure",
      "confidence": 0.0-1.0
    }
  ],
  "clinical_relevance": {
    "is_surgical_landmark": true/false,
    "is_danger_zone": true/false,
    "surgical_considerations": ["brief notes on surgical importance"]
  },
  "vessels": [
    {
      "name": "vessel name",
      "vessel_type": "vein|artery|sinus",
      "drains_to": ["destination structures"],
      "receives_from": ["source structures"]
    }
  ]
}

## Rules
1. Only extract entities EXPLICITLY mentioned in the text
2. Do not infer structures not present
3. Use exact terminology from the source
4. Mark confidence < 0.8 for implied relationships
5. Identify surgical landmarks mentioned as "important" or "key"
6. Flag danger zones mentioned in context of injury/damage
```

#### 3.3.2 Enrichment Pipeline Flow

```
                    ┌─────────────────┐
                    │   Raw Chunks    │
                    │ (Phase 2 Output)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Batch Loader   │
                    │ (50 chunks/batch)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ LLM Call │   │ LLM Call │   │ LLM Call │
        │(parallel)│   │(parallel)│   │(parallel)│
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    ┌─────────────────┐
                    │  JSON Validator │
                    │ (Schema Check)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Ontology Mapper │
                    │ (FMA/SNOMED CT) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Enriched Chunks │
                    │    (Output)     │
                    └─────────────────┘
```

#### 3.3.3 Model Selection

| Model | Use Case | Cost | Speed |
|-------|----------|------|-------|
| `gpt-4o-mini` | Primary extraction | $0.15/1M tokens | Fast |
| `claude-3-haiku` | Alternative/validation | $0.25/1M tokens | Fast |
| `gpt-4o` | Complex chunks (fallback) | $2.50/1M tokens | Medium |

**Strategy**: Use `gpt-4o-mini` for 95% of chunks. Escalate to `gpt-4o` only when:
- Extraction confidence < 0.6
- JSON validation fails after retry
- Chunk contains >5 figure references

### 3.4 Ontology Mapping

#### 3.4.1 FMA (Foundational Model of Anatomy) Integration

```typescript
// Ontology lookup function
async function mapToFMA(structureName: string): Promise<string | null> {
  // Query FMA SPARQL endpoint or local database
  // Returns FMA ID like "FMA:50986" for "Basal vein"
  
  // Fuzzy matching for variations:
  // "basal vein of Rosenthal" -> "FMA:50986"
  // "Rosenthal's vein" -> "FMA:50986"
  // "vein of Rosenthal" -> "FMA:50986"
}
```

#### 3.4.2 Synonym Resolution

Build a synonym table from:
1. Figure caption abbreviation blocks
2. LLM-extracted aliases
3. Manual neuroanatomy thesaurus

```json
{
  "synonyms": {
    "sylvian fissure": ["lateral sulcus", "fissure of Sylvius"],
    "vein of Galen": ["great vein", "great cerebral vein", "Galen's vein"],
    "superior sagittal sinus": ["SSS", "sup. sag. sinus"]
  }
}
```

### 3.5 Quality Control

#### 3.5.1 Extraction Validation Rules

| Rule | Check | Action on Fail |
|------|-------|----------------|
| JSON Valid | Schema validation | Retry with same model |
| Non-Empty | At least 1 entity extracted | Flag for manual review |
| Consistency | Subject/object in relations exist in structures | Auto-correct if possible |
| Confidence Threshold | Average confidence > 0.7 | Escalate to stronger model |
| Hallucination Check | All entities present in source text | Remove hallucinated entities |

#### 3.5.2 Sampling Validation

```
For 5% random sample of enriched chunks:
1. Human reviewer verifies entity extraction accuracy
2. Measures: Precision, Recall, F1 for entity types
3. Target: F1 > 0.85 for anatomical structures
4. Iterate on prompt if below threshold
```

### 3.6 Deliverables

| Deliverable | Format | Location |
|-------------|--------|----------|
| Enriched chunks | JSON | `processed/03_enriched/chunks_enriched.json` |
| Entity index | JSON | `processed/03_enriched/entity_index.json` |
| Synonym table | JSON | `processed/03_enriched/synonyms.json` |
| Ontology mappings | JSON | `processed/03_enriched/ontology_map.json` |
| Enrichment script | TypeScript/Python | `scripts/03_enrich.ts` |
| Quality report | Markdown | `processed/03_enriched/quality_report.md` |

### 3.7 Acceptance Criteria

- [ ] 100% of chunks processed through enrichment pipeline
- [ ] Average extraction confidence > 0.75
- [ ] JSON schema validation passes for all outputs
- [ ] Entity index contains >500 unique anatomical structures
- [ ] Synonym table covers all abbreviations from figure captions
- [ ] FMA mapping coverage > 60% of identified structures
- [ ] Hallucination rate < 2% (verified on sample)
- [ ] Unit tests pass: `bun test scripts/__tests__/enrich.test.ts`

---

## Implementation Timeline

| Phase | Duration | Dependencies | Parallelizable |
|-------|----------|--------------|----------------|
| Phase 1: Ingestion | 2-3 days | None | No |
| Phase 2: Chunking | 2-3 days | Phase 1 complete | No |
| Phase 3: Enrichment | 3-5 days | Phase 2 complete | Yes (batched) |

**Total Estimated Duration**: 7-11 days

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Figure-to-image mapping fails | Medium | High | Fallback: manual mapping for critical figures |
| LLM extraction hallucinations | Medium | High | Strict validation + sampling QA |
| FMA ontology gaps | Low | Medium | Use SNOMED CT as secondary ontology |
| Token limit exceeded | Low | Low | Escalate long chunks to chunking refinement |
| Cost overrun on LLM calls | Low | Medium | Use mini models, batch efficiently |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Document Coverage | 100% | All source text in at least one chunk |
| Chunk Quality | <600 tokens, >80 tokens | Automated size validation |
| Entity Extraction Accuracy | F1 > 0.85 | Human evaluation on 5% sample |
| Ontology Mapping Coverage | >60% | FMA ID presence in entity index |
| Processing Time | <12 hours total | Pipeline timing logs |

---

## Appendix A: Sample Chunk (Expected Output)

```json
{
  "chunk_id": "rhoton-veins-chunk-0042",
  "breadcrumb": ["THE CEREBRAL VEINS", "THE SUPERFICIAL VEINS", "Tentorial Group"],
  "breadcrumb_text": "[Context: THE CEREBRAL VEINS > THE SUPERFICIAL VEINS > Tentorial Group]",
  "content": "The tentorial group of bridging veins drains into the sinuses coursing in the tentorium, called the tentorial sinuses, or into the transverse and superior petrosal sinuses in the tentorial margins. This group is composed of the veins draining the lateral surface of the temporal lobe and the basal surface of the temporal and occipital lobes.",
  "content_with_context": "[Context: THE CEREBRAL VEINS > THE SUPERFICIAL VEINS > Tentorial Group]\n\nThe tentorial group of bridging veins drains into the sinuses coursing in the tentorium...",
  "page_numbers": [3],
  "token_count": 89,
  "figure_references": [
    {
      "figure_id": "Fig. 4.4",
      "image_path": "images/image-15.jpg",
      "caption_snippet": "Tentorial group of bridging veins..."
    }
  ],
  "entities": {
    "structures": [
      {
        "name": "tentorial group",
        "type": "vein",
        "aliases": ["tentorial bridging veins"],
        "location_description": "drains into tentorium sinuses"
      },
      {
        "name": "tentorial sinuses",
        "type": "sinus",
        "aliases": [],
        "location_description": "within the tentorium"
      },
      {
        "name": "transverse sinus",
        "type": "sinus",
        "aliases": [],
        "location_description": "tentorial margin"
      },
      {
        "name": "superior petrosal sinus",
        "type": "sinus",
        "aliases": [],
        "location_description": "tentorial margin"
      },
      {
        "name": "temporal lobe",
        "type": "gyrus",
        "aliases": [],
        "location_description": "lateral surface drained"
      },
      {
        "name": "occipital lobe",
        "type": "gyrus",
        "aliases": [],
        "location_description": "basal surface drained"
      }
    ]
  },
  "spatial_relations": [
    {
      "subject": "tentorial group",
      "predicate": "drains_into",
      "object": "tentorial sinuses",
      "confidence": 0.95
    },
    {
      "subject": "tentorial group",
      "predicate": "drains_into",
      "object": "transverse sinus",
      "confidence": 0.90
    },
    {
      "subject": "tentorial group",
      "predicate": "receives_from",
      "object": "temporal lobe",
      "confidence": 0.95
    }
  ],
  "clinical_relevance": {
    "is_surgical_landmark": true,
    "is_danger_zone": false,
    "surgical_considerations": ["Critical for temporal lobe approaches"]
  },
  "ontology_ids": {
    "fma": ["FMA:52640", "FMA:52416"],
    "snomed_ct": []
  },
  "enrichment_confidence": 0.91
}
```

---

## Appendix B: Directory Structure

```
/knowledge_base
├── raw/
│   ├── rhoton_supratentorial_cerebral_veins_ventric.pdf
│   ├── rhoton_supratentorial_cerebral_veins_ventric.pdf.json
│   ├── rhoton_supratentorial_cerebral_veins_ventric.pdf.markdown
│   └── images/
│       ├── image-1.jpg
│       └── ... (188 images)
├── processed/
│   ├── 01_normalized/
│   │   ├── document.json
│   │   ├── figure_map.json
│   │   └── content.md
│   ├── 02_chunks/
│   │   ├── chunks.json
│   │   ├── chunk_index.json
│   │   └── preview.html
│   └── 03_enriched/
│       ├── chunks_enriched.json
│       ├── entity_index.json
│       ├── synonyms.json
│       ├── ontology_map.json
│       └── quality_report.md
├── scripts/
│   ├── 01_ingest.ts
│   ├── 02_chunk.ts
│   ├── 03_enrich.ts
│   └── __tests__/
│       ├── ingest.test.ts
│       ├── chunk.test.ts
│       └── enrich.test.ts
└── config/
    ├── prompts.yaml
    └── ontology_cache.json
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-24 | Prometheus | Initial PRD for Phases 1-3 |
