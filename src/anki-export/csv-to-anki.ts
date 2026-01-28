/**
 * CSV to Anki Converter
 * Issue #245 - Implement CSV to Anki conversion script
 *
 * Converts the Third Ventricle flashcards CSV to Anki-importable format
 * with proper FSRS configuration and note type setup.
 *
 * Issues addressed:
 * - #250: Log Zod validation errors with details
 * - #252: Added file existence check
 * - #256: Uses shared CSV parser
 * - #261: Loads templates from external files
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseCSVLine } from './lib/csv-parser';
import {
  type FSRSCard,
  FSRSCardSchema,
  DEFAULT_PRESETS,
  getPresetForCard,
  type DeckConfig,
  type Difficulty,
} from './types/fsrs-card';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load template file with existence check
 * Issue #252: File existence check
 */
function loadTemplate(filename: string): string {
  const templatePath = join(__dirname, 'templates', filename);
  if (!existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Parse CSV file to FSRSCard array
 * Issue #250: Log Zod validation errors with details
 */
function parseCSV(filePath: string): FSRSCard[] {
  // Issue #252: Check file existence
  if (!existsSync(filePath)) {
    throw new Error(`Arquivo CSV não encontrado: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const dataLines = lines.slice(1);

  const cards: FSRSCard[] = [];
  let invalidCount = 0;

  for (let lineNum = 0; lineNum < dataLines.length; lineNum++) {
    const line = dataLines[lineNum];
    if (!line?.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;

    const card = {
      pergunta: fields[0] ?? '',
      resposta: fields[1] ?? '',
      tags: fields[2] ?? '',
      mnemonico: fields[3] ?? '',
      dificuldade: (fields[4] ?? 'M') as Difficulty,
      hint: fields[5] ?? '',
    };

    // Validate with Zod
    const validated = FSRSCardSchema.safeParse(card);
    if (validated.success) {
      cards.push(validated.data);
    } else {
      // Issue #250: Log Zod validation errors with details
      invalidCount++;
      const issues = validated.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      console.warn(`Linha ${lineNum + 2}: Card inválido - ${issues}`);
      console.warn(`  Pergunta: ${card.pergunta.substring(0, 50)}...`);
    }
  }

  if (invalidCount > 0) {
    console.warn(`\nTotal de cards inválidos ignorados: ${invalidCount}`);
  }

  return cards;
}

/**
 * Generate Anki note type HTML templates
 * Issue #261: Load templates from external files
 */
function generateNoteTypeTemplates(): { qfmt: string; afmt: string; css: string } {
  const qfmt = loadTemplate('card-front.html');
  const afmt = loadTemplate('card-back.html');
  const css = loadTemplate('styles.css');
  return { qfmt, afmt, css };
}

/**
 * Generate Anki-importable text file
 */
function generateAnkiImportFile(cards: FSRSCard[], outputPath: string): void {
  // Anki import format: tab-separated values
  // Fields: Pergunta, Resposta, Tags, Mnemônico, Dificuldade, Hint

  const lines: string[] = [];

  // Add header comment for Anki
  lines.push('#separator:Tab');
  lines.push('#html:true');
  lines.push('#deck:III-V::Terceiro-Ventriculo');
  lines.push('#notetype:FSRS-3V');
  lines.push('#tags column:3');
  lines.push('');

  for (const card of cards) {
    // Convert tags to Anki format (space-separated with deck prefix)
    const ankiTags = card.tags
      .split(',')
      .map((t) => `3V::${t.trim()}`)
      .join(' ');

    // Escape HTML and special characters
    const escapeForAnki = (text: string): string => {
      return text
        .replace(/\t/g, '    ')
        .replace(/\n/g, '<br>')
        .replace(/"/g, '&quot;');
    };

    const fields = [
      escapeForAnki(card.pergunta),
      escapeForAnki(card.resposta),
      ankiTags,
      escapeForAnki(card.mnemonico ?? ''),
      card.dificuldade,
      escapeForAnki(card.hint ?? ''),
    ];

    lines.push(fields.join('\t'));
  }

  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

/**
 * Generate deck configuration JSON
 */
function generateDeckConfig(cards: FSRSCard[]): DeckConfig {
  const byDifficulty = { E: 0, M: 0, D: 0 };

  for (const card of cards) {
    byDifficulty[card.dificuldade]++;
  }

  // Determine primary preset based on card distribution
  const presetCounts: Record<string, number> = {};
  for (const card of cards) {
    const preset = getPresetForCard(card.tags);
    presetCounts[preset] = (presetCounts[preset] ?? 0) + 1;
  }

  const primaryPreset =
    Object.entries(presetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '3V-Core';

  return {
    deckName: 'III-V::Terceiro-Ventriculo',
    noteTypeName: 'FSRS-3V',
    preset: primaryPreset,
    totalCards: cards.length,
    byDifficulty,
    exportDate: new Date().toISOString(),
  };
}

/**
 * Generate complete export package
 */
function generateExportPackage(cards: FSRSCard[], outputDir: string): void {
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 1. Generate Anki import file
  const importFile = join(outputDir, 'terceiro-ventriculo-fsrs.txt');
  generateAnkiImportFile(cards, importFile);
  console.log(`Arquivo de importação: ${importFile}`);

  // 2. Generate note type templates
  const templates = generateNoteTypeTemplates();
  const templatesFile = join(outputDir, 'note-type-templates.json');
  writeFileSync(
    templatesFile,
    JSON.stringify(
      {
        name: 'FSRS-3V',
        fields: ['Pergunta', 'Resposta', 'Tags', 'Mnemônico', 'Dificuldade', 'Hint'],
        templates: [{ name: 'Card 1', qfmt: templates.qfmt, afmt: templates.afmt }],
        css: templates.css,
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`Templates do note type: ${templatesFile}`);

  // 3. Generate deck config
  const config = generateDeckConfig(cards);
  const configFile = join(outputDir, 'deck-config.json');
  writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`Configuração do deck: ${configFile}`);

  // 4. Generate FSRS presets
  const presetsFile = join(outputDir, 'fsrs-presets.json');
  writeFileSync(presetsFile, JSON.stringify(DEFAULT_PRESETS, null, 2), 'utf-8');
  console.log(`Presets FSRS: ${presetsFile}`);

  // 5. Generate import instructions
  const instructions = generateImportInstructions(config);
  const instructionsFile = join(outputDir, 'IMPORT-INSTRUCTIONS.md');
  writeFileSync(instructionsFile, instructions, 'utf-8');
  console.log(`Instruções de importação: ${instructionsFile}`);
}

/**
 * Generate import instructions markdown
 */
function generateImportInstructions(config: DeckConfig): string {
  return `# Instruções de Importação - Deck Terceiro Ventrículo

> **Gerado em**: ${config.exportDate}
> **Total de cards**: ${config.totalCards}
> **Preset recomendado**: ${config.preset}

## Passo 1: Criar Note Type

1. Anki → Tools → Manage Note Types
2. Add → Clone: Basic
3. Renomear para: **FSRS-3V**
4. Fields → Configurar:
   - Pergunta
   - Resposta
   - Tags
   - Mnemônico
   - Dificuldade
   - Hint

5. Cards → Copiar templates de \`note-type-templates.json\`:
   - Front Template
   - Back Template
   - Styling (CSS)

## Passo 2: Configurar FSRS

1. Anki → Deck Options
2. FSRS → Enable FSRS: ✅
3. Desired Retention: **0.90** (ajustar por preset)
4. Learning Steps: **10m 30m**
5. Graduating Interval: **1 day**
6. Easy Interval: **4 days**

### Presets Disponíveis

| Preset | Retention | Cards/dia | Uso |
|--------|-----------|-----------|-----|
| 3V-Core | 0.90 | 15 | Anatomia geral |
| 3V-Vascular | 0.92 | 10 | Vascularização |
| 3V-Surgical | 0.93 | 8 | Abordagens cirúrgicas |
| 3V-Clinical | 0.88 | 5 | Casos clínicos |
| 3V-Reference | 0.85 | 20 | Abreviações |

## Passo 3: Importar Cards

1. Anki → File → Import
2. Selecionar: \`terceiro-ventriculo-fsrs.txt\`
3. Verificar configurações:
   - Type: FSRS-3V
   - Deck: III-V::Terceiro-Ventriculo
   - Fields mapped correctly
4. Import

## Passo 4: Verificar

1. Browse → deck:III-V::Terceiro-Ventriculo
2. Conferir total: **${config.totalCards} cards**
3. Distribuição por dificuldade:
   - Fácil (E): ${config.byDifficulty.E}
   - Médio (M): ${config.byDifficulty.M}
   - Difícil (D): ${config.byDifficulty.D}

## Dicas de Uso

1. **Primeira semana**: Limite a 10-15 cards novos/dia
2. **Complete sessões**: Não pare no meio do review
3. **Rating consistente**: Use o guia de rating
4. **Otimize após 400 reviews**: FSRS → Optimize

## Suporte

- Issues: #244, #245, #246
- Guia de Rating: docs/planos/fsrs-analysis/rating-guide.md
- Troubleshooting: docs/planos/fsrs-analysis/rating-troubleshooting.md
`;
}

/**
 * Main function
 */
async function main() {
  console.log('CSV to Anki Converter - Terceiro Ventrículo\n');

  // Input path - prefer the version with hints
  const hintsPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo-with-hints.csv');
  const fallbackPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo.csv');

  // Issue #252: Check file existence
  let inputPath: string;
  if (existsSync(hintsPath)) {
    inputPath = hintsPath;
  } else if (existsSync(fallbackPath)) {
    inputPath = fallbackPath;
    console.log('Usando arquivo sem hints (versão com hints não encontrada)');
  } else {
    console.error('Erro: Nenhum arquivo CSV encontrado.');
    console.error(`  Esperado: ${hintsPath}`);
    console.error(`  Ou: ${fallbackPath}`);
    process.exit(1);
  }

  console.log(`Lendo: ${inputPath}`);

  // Parse CSV
  const cards = parseCSV(inputPath);
  console.log(`Cards válidos: ${cards.length}\n`);

  // Output directory
  const outputDir = join(__dirname, '../../docs/planos/anki-export');

  // Generate export package
  generateExportPackage(cards, outputDir);

  console.log('\nExportação completa!');
  console.log(`   Diretório: ${outputDir}`);
  console.log('   Siga as instruções em IMPORT-INSTRUCTIONS.md');
}

main().catch(console.error);
