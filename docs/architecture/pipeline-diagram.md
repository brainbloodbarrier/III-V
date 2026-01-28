# III-V Pipeline Architecture

## Data Flow Diagram

```mermaid
flowchart TB
    subgraph Input["Input Sources"]
        PDF[PDF Document]
        JSON[JSON Export]
        MD[Markdown Export]
        IMG[Images Directory]
    end

    subgraph Phase1["Phase 1: Data Ingestion"]
        direction TB
        Parse["Parser<br/><small>json-parser.ts</small>"]
        Norm["Normalizer<br/><small>ligatures, hyphenation</small>"]
        FigMap["Figure Mapper<br/><small>image linking</small>"]
        Val1["Validator<br/><small>quality gates</small>"]
    end

    subgraph Out1["Phase 1 Output"]
        Doc["document.json<br/><small>RhotonDocument</small>"]
        FigOut["figure_map.json<br/><small>FigureMap</small>"]
        ValReport["validation_report.json"]
    end

    subgraph Phase2["Phase 2: Structural Chunking"]
        direction TB
        Split["Splitter<br/><small>token-aware</small>"]
        Merge["Merger<br/><small>combine small chunks</small>"]
        Link["Figure Linker<br/><small>embed figure refs</small>"]
        Val2["Validator<br/><small>token limits</small>"]
    end

    subgraph Out2["Phase 2 Output"]
        Chunks["chunks.json<br/><small>ChunksOutput</small>"]
        Index["chunk_index.json<br/><small>ChunkIndex</small>"]
        Preview["preview.html"]
    end

    PDF --> JSON & MD & IMG
    JSON --> Parse
    MD --> Parse
    Parse --> Norm
    Norm --> FigMap
    IMG --> FigMap
    FigMap --> Val1
    Val1 --> Doc & FigOut & ValReport

    Doc --> Split
    FigOut --> Link
    Split --> Merge
    Merge --> Link
    Link --> Val2
    Val2 --> Chunks & Index & Preview
```

## Service Layer

```mermaid
graph LR
    subgraph Services["src/services/"]
        Parser["parser/"]
        Normalizer["normalizer/"]
        FigureMapper["figure-mapper/"]
        Chunker["chunker/"]
        Validator["validator/"]
        Writer["writer/"]
    end

    subgraph Models["src/models/"]
        Schemas["schemas.ts<br/><small>Zod validation</small>"]
        Types["chunk.ts, document.ts, figure.ts<br/><small>TypeScript interfaces</small>"]
    end

    subgraph Config["src/config/"]
        ChunkLimits["chunking.ts<br/><small>token limits</small>"]
        ValGates["validation-gates.ts<br/><small>quality thresholds</small>"]
    end

    Parser --> Schemas
    Normalizer --> Schemas
    FigureMapper --> Schemas
    Chunker --> Schemas
    Validator --> ValGates
    Writer --> Schemas
```

## Validation Flow

```mermaid
flowchart LR
    Input["Raw Data"] --> SafeParse["Schema.safeParse()"]
    SafeParse --> Success{"success?"}
    Success -->|Yes| Validated["Validated Data"]
    Success -->|No| Error["Log Error Details"]
    Error --> Skip["Skip/Report Item"]
    Validated --> Write["Write Output"]
```

## Token Limits

| Stage | Constant | Value | Purpose |
|-------|----------|-------|---------|
| Split | `MAX_TOKENS` | 512 | Target chunk size |
| Merge | `MIN_TOKENS` | 80 | Merge threshold |
| Validate | `HARD_MAX_TOKENS` | 600 | Schema maximum |
