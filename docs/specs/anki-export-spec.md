# Anki Export Module Specification

## Purpose

Convert flashcards CSV to Anki-importable format with FSRS (Free Spaced Repetition Scheduler) optimization. The module enables efficient spaced repetition learning from medical neuroanatomy content.

## Components

```
src/anki-export/
├── csv-to-anki.ts       # Main CSV → Anki conversion pipeline
├── setup-anki.ts        # AnkiConnect deck and note type configuration
├── add-hints.ts         # Hint augmentation for existing cards
├── classify-difficulty.ts # Difficulty classification for cards
├── lib/
│   └── csv-parser.ts    # RFC 4180 compliant CSV parsing
├── templates/
│   ├── card-front.html  # Anki card front template
│   ├── card-back.html   # Anki card back template
│   └── styles.css       # Card styling
└── types/
    └── fsrs-card.ts     # FSRSCard schema and CardInput type
```

## Data Flow

```
CSV Input → Parse (lib/csv-parser.ts)
         → Validate (FSRSCardSchema)
         → Classify Difficulty
         → Render Templates
         → Anki Import File (.txt)
```

## Schemas

### FSRSCardSchema

Located in `types/fsrs-card.ts`. Full card with FSRS fields:

| Field | Type | Description |
|-------|------|-------------|
| `pergunta` | string | Question text (front of card) |
| `resposta` | string | Answer text (back of card) |
| `tags` | string | Comma-separated tags |
| `mnemonico` | string | Mnemonic/memory aid |
| `dificuldade` | Difficulty | easy, medium, hard |
| `hint` | string? | Optional hint |

### CardInput

Pre-validation input type for scripts before FSRS fields are populated:

```typescript
interface CardInput {
  pergunta: string;
  resposta: string;
  tags: string;
  mnemonico: string;
  dificuldade?: Difficulty;
  hint?: string;
}
```

## CLI Usage

```bash
# Convert CSV to Anki format
bun run src/anki-export/csv-to-anki.ts

# Setup Anki via AnkiConnect (requires Anki running with addon 2055492159)
bun run src/anki-export/setup-anki.ts

# Add hints to existing CSV
bun run src/anki-export/add-hints.ts
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANKI_CONNECT_URL` | `http://localhost:8765` | AnkiConnect API endpoint |
| `ANKI_BATCH_SIZE` | `50` | Cards per batch for import |
| `ANKI_TIMEOUT_MS` | `10000` | Request timeout in milliseconds |

## AnkiConnect Setup

Requires Anki desktop with [AnkiConnect addon](https://ankiweb.net/shared/info/2055492159) installed.

1. Install AnkiConnect addon (code: `2055492159`)
2. Restart Anki
3. Run `bun run src/anki-export/setup-anki.ts` to create deck and note type

## Error Handling

The module uses line-by-line validation:

```typescript
const validated = FSRSCardSchema.safeParse(card);
if (validated.success) {
  cards.push(validated.data);
} else {
  const errors = validated.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  console.warn(`Line ${lineNum + 2}: Invalid card - ${errors}`);
  invalidCount++;
}
```

- Invalid cards are logged but do not block processing
- Summary shows total processed vs. invalid count
- File existence is checked before operations

## Templates

Card templates use HTML with Anki field placeholders:

- `templates/card-front.html` - `{{pergunta}}`
- `templates/card-back.html` - `{{resposta}}`, `{{mnemonico}}`, `{{hint}}`
- `templates/styles.css` - Shared styling

## Testing

```bash
# Run anki-export tests
bun test tests/unit/anki-export/

# Run specific test
bun test tests/unit/anki-export/csv-parser.test.ts
```

## Related Documentation

- **FSRS Setup Guide**: `docs/planos/anki-export/ENABLE-FSRS.md`
- **Import Instructions**: `docs/planos/anki-export/IMPORT-INSTRUCTIONS.md`
- **FSRS Configuration**: `docs/planos/fsrs-analysis/`
