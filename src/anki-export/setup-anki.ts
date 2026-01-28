/**
 * Anki Setup Script
 * Configures Anki with FSRS-3V note type and imports cards
 * Requires AnkiConnect addon (code: 2055492159) running on port 8765
 *
 * Issues addressed:
 * - #251: AnkiConnect URL configurable via environment variable
 * - #252: Added file existence checks
 * - #253: Wrapped JSON.parse in try-catch
 * - #254: Added timeout to fetch requests
 * - #262: Made batch size configurable
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Issue #251: Configurable via environment variable
const ANKI_CONNECT_URL = process.env.ANKI_CONNECT_URL ?? 'http://localhost:8765';

// Issue #262: Configurable batch size
const ANKI_IMPORT_BATCH_SIZE = Number(process.env.ANKI_BATCH_SIZE) || 50;

// Issue #254: Configurable timeout (default 10 seconds)
const ANKI_REQUEST_TIMEOUT_MS = Number(process.env.ANKI_TIMEOUT_MS) || 10000;

interface AnkiResponse {
  result: unknown;
  error: string | null;
}

/**
 * Send request to AnkiConnect with timeout
 * Issue #254: Added AbortController for timeout
 */
async function ankiRequest(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANKI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANKI_CONNECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = (await response.json()) as AnkiResponse;

    if (data.error) {
      throw new Error(`AnkiConnect error: ${data.error}`);
    }

    return data.result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `AnkiConnect timeout após ${ANKI_REQUEST_TIMEOUT_MS}ms - verifique se Anki está aberto e AnkiConnect instalado`
      );
    }

    throw error;
  }
}

/**
 * Load and parse JSON file with error handling
 * Issue #252: File existence check
 * Issue #253: JSON.parse error handling
 */
function loadJSON<T>(filepath: string): T {
  if (!existsSync(filepath)) {
    throw new Error(`Arquivo não encontrado: ${filepath}`);
  }

  const content = readFileSync(filepath, 'utf-8');

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON inválido em ${filepath}: ${message}`);
  }
}

interface NoteTypeTemplate {
  name: string;
  fields: string[];
  templates: Array<{ name: string; qfmt: string; afmt: string }>;
  css: string;
}

/**
 * Create the FSRS-3V note type
 */
async function createNoteType(): Promise<void> {
  console.log('Criando note type FSRS-3V...');

  const templatePath = join(__dirname, '../../docs/planos/anki-export/note-type-templates.json');
  const template = loadJSON<NoteTypeTemplate>(templatePath);

  // Check if note type already exists
  const modelNames = (await ankiRequest('modelNames')) as string[];
  if (modelNames.includes('FSRS-3V')) {
    console.log('   Note type FSRS-3V já existe, atualizando...');

    // Update styling
    await ankiRequest('updateModelStyling', {
      model: { name: 'FSRS-3V', css: template.css },
    });

    // Update templates
    const firstTemplate = template.templates[0];
    if (firstTemplate) {
      await ankiRequest('updateModelTemplates', {
        model: {
          name: 'FSRS-3V',
          templates: {
            'Card 1': {
              Front: firstTemplate.qfmt,
              Back: firstTemplate.afmt,
            },
          },
        },
      });
    }

    console.log('   Note type atualizado');
    return;
  }

  // Create new note type
  const firstTemplate = template.templates[0];
  await ankiRequest('createModel', {
    modelName: 'FSRS-3V',
    inOrderFields: template.fields,
    css: template.css,
    cardTemplates: firstTemplate
      ? [
          {
            Name: 'Card 1',
            Front: firstTemplate.qfmt,
            Back: firstTemplate.afmt,
          },
        ]
      : [],
  });

  console.log('   Note type criado');
}

/**
 * Create the deck hierarchy
 */
async function createDeck(): Promise<void> {
  console.log('Criando deck III-V::Terceiro-Ventriculo...');

  await ankiRequest('createDeck', { deck: 'III-V::Terceiro-Ventriculo' });

  console.log('   Deck criado');
}

/**
 * Parse the import file and add notes
 * Issue #252: File existence check
 * Issue #262: Configurable batch size
 */
async function importCards(): Promise<void> {
  console.log('Importando cards...');

  const importPath = join(__dirname, '../../docs/planos/anki-export/terceiro-ventriculo-fsrs.txt');

  // Issue #252: Check file existence
  if (!existsSync(importPath)) {
    throw new Error(`Arquivo de importação não encontrado: ${importPath}`);
  }

  const content = readFileSync(importPath, 'utf-8');
  const lines = content.split('\n');

  // Skip header comments
  const dataLines = lines.filter((line) => !line.startsWith('#') && line.trim());

  const notes: Array<{
    deckName: string;
    modelName: string;
    fields: Record<string, string>;
    tags: string[];
  }> = [];

  for (const line of dataLines) {
    const fields = line.split('\t');
    if (fields.length < 6) continue;

    const [pergunta, resposta, tags, mnemonico, dificuldade, hint] = fields;

    // Parse tags from space-separated format
    const tagList = (tags ?? '')
      .split(' ')
      .filter((t) => t.trim())
      .map((t) => t.replace('3V::', ''));

    notes.push({
      deckName: 'III-V::Terceiro-Ventriculo',
      modelName: 'FSRS-3V',
      fields: {
        Pergunta: pergunta ?? '',
        Resposta: resposta ?? '',
        Tags: tags ?? '',
        Mnemônico: mnemonico ?? '',
        Dificuldade: dificuldade ?? 'M',
        Hint: hint ?? '',
      },
      tags: tagList,
    });
  }

  console.log(`   Encontrados ${notes.length} cards para importar...`);

  // Add notes in batches (Issue #262: configurable batch size)
  const batchSize = ANKI_IMPORT_BATCH_SIZE;
  let added = 0;
  let duplicates = 0;

  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize);

    const results = (await ankiRequest('addNotes', { notes: batch })) as (number | null)[];

    for (const result of results) {
      if (result !== null) {
        added++;
      } else {
        duplicates++;
      }
    }

    process.stdout.write(`\r   Progresso: ${Math.min(i + batchSize, notes.length)}/${notes.length}`);
  }

  console.log(`\n   ${added} cards adicionados (${duplicates} duplicados ignorados)`);
}

/**
 * Configure deck options for FSRS
 */
async function configureFSRS(): Promise<void> {
  console.log('Configurando FSRS...');

  // Note: FSRS configuration needs to be done manually in Anki GUI
  // because AnkiConnect doesn't support FSRS-specific settings yet

  console.log('   FSRS deve ser habilitado manualmente:');
  console.log('      1. Anki → Deck Options (clique no ícone de engrenagem)');
  console.log('      2. FSRS → Enable FSRS');
  console.log('      3. Desired Retention: 0.90');
  console.log('      4. Learning Steps: 10m 30m');
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  console.log('Anki Setup - Terceiro Ventrículo FSRS\n');
  console.log(`AnkiConnect URL: ${ANKI_CONNECT_URL}`);
  console.log(`Batch size: ${ANKI_IMPORT_BATCH_SIZE}`);
  console.log(`Timeout: ${ANKI_REQUEST_TIMEOUT_MS}ms\n`);

  try {
    // Test connection
    console.log('Testando conexão com AnkiConnect...');
    const version = await ankiRequest('version');
    console.log(`   Conectado (versão ${version})\n`);

    // Setup steps
    await createNoteType();
    await createDeck();
    await importCards();
    await configureFSRS();

    console.log('\nSetup completo!');
    console.log('\nPróximos passos:');
    console.log('   1. Verificar cards em Browse → deck:III-V::Terceiro-Ventriculo');
    console.log('   2. Habilitar FSRS em Deck Options');
    console.log('   3. Iniciar estudos!');
  } catch (error) {
    console.error('\nErro:', error instanceof Error ? error.message : error);
    console.error('\nVerifique se:');
    console.error('   1. Anki está aberto');
    console.error('   2. AnkiConnect addon está instalado (código: 2055492159)');
    console.error(`   3. AnkiConnect está rodando em ${ANKI_CONNECT_URL}`);
    process.exit(1);
  }
}

main();
