/**
 * Anki Setup Script
 * Configures Anki with FSRS-3V note type and imports cards
 * Requires AnkiConnect addon (code: 2055492159) running on port 8765
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ANKI_CONNECT_URL = 'http://localhost:8765';

interface AnkiResponse {
  result: unknown;
  error: string | null;
}

/**
 * Send request to AnkiConnect
 */
async function ankiRequest(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const response = await fetch(ANKI_CONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  });

  const data = (await response.json()) as AnkiResponse;

  if (data.error) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }

  return data.result;
}

/**
 * Create the FSRS-3V note type
 */
async function createNoteType(): Promise<void> {
  console.log('📝 Creating note type FSRS-3V...');

  const templatePath = join(__dirname, '../../docs/planos/anki-export/note-type-templates.json');
  const template = JSON.parse(readFileSync(templatePath, 'utf-8'));

  // Check if note type already exists
  const modelNames = (await ankiRequest('modelNames')) as string[];
  if (modelNames.includes('FSRS-3V')) {
    console.log('   Note type FSRS-3V already exists, updating...');

    // Update styling
    await ankiRequest('updateModelStyling', {
      model: { name: 'FSRS-3V', css: template.css },
    });

    // Update templates
    await ankiRequest('updateModelTemplates', {
      model: {
        name: 'FSRS-3V',
        templates: {
          'Card 1': {
            Front: template.templates[0].qfmt,
            Back: template.templates[0].afmt,
          },
        },
      },
    });

    console.log('   ✅ Note type updated');
    return;
  }

  // Create new note type
  await ankiRequest('createModel', {
    modelName: 'FSRS-3V',
    inOrderFields: template.fields,
    css: template.css,
    cardTemplates: [
      {
        Name: 'Card 1',
        Front: template.templates[0].qfmt,
        Back: template.templates[0].afmt,
      },
    ],
  });

  console.log('   ✅ Note type created');
}

/**
 * Create the deck hierarchy
 */
async function createDeck(): Promise<void> {
  console.log('📚 Creating deck III-V::Terceiro-Ventriculo...');

  await ankiRequest('createDeck', { deck: 'III-V::Terceiro-Ventriculo' });

  console.log('   ✅ Deck created');
}

/**
 * Parse the import file and add notes
 */
async function importCards(): Promise<void> {
  console.log('📥 Importing cards...');

  const importPath = join(__dirname, '../../docs/planos/anki-export/terceiro-ventriculo-fsrs.txt');
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
    const tagList = tags
      .split(' ')
      .filter((t) => t.trim())
      .map((t) => t.replace('3V::', ''));

    notes.push({
      deckName: 'III-V::Terceiro-Ventriculo',
      modelName: 'FSRS-3V',
      fields: {
        Pergunta: pergunta || '',
        Resposta: resposta || '',
        Tags: tags || '',
        Mnemônico: mnemonico || '',
        Dificuldade: dificuldade || 'M',
        Hint: hint || '',
      },
      tags: tagList,
    });
  }

  console.log(`   Encontrados ${notes.length} cards para importar...`);

  // Add notes in batches
  const batchSize = 50;
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

  console.log(`\n   ✅ ${added} cards adicionados (${duplicates} duplicados ignorados)`);
}

/**
 * Configure deck options for FSRS
 */
async function configureFSRS(): Promise<void> {
  console.log('⚙️  Configurando FSRS...');

  // Note: FSRS configuration needs to be done manually in Anki GUI
  // because AnkiConnect doesn't support FSRS-specific settings yet

  console.log('   ⚠️  FSRS deve ser habilitado manualmente:');
  console.log('      1. Anki → Deck Options (clique no ícone de engrenagem)');
  console.log('      2. FSRS → Enable FSRS: ✅');
  console.log('      3. Desired Retention: 0.90');
  console.log('      4. Learning Steps: 10m 30m');
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  console.log('🚀 Anki Setup - Terceiro Ventrículo FSRS\n');

  try {
    // Test connection
    console.log('🔌 Testing AnkiConnect...');
    const version = await ankiRequest('version');
    console.log(`   ✅ Connected (version ${version})\n`);

    // Setup steps
    await createNoteType();
    await createDeck();
    await importCards();
    await configureFSRS();

    console.log('\n✅ Setup completo!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Verificar cards em Browse → deck:III-V::Terceiro-Ventriculo');
    console.log('   2. Habilitar FSRS em Deck Options');
    console.log('   3. Iniciar estudos!');
  } catch (error) {
    console.error('\n❌ Erro:', error instanceof Error ? error.message : error);
    console.error('\nVerifique se:');
    console.error('   1. Anki está aberto');
    console.error('   2. AnkiConnect addon está instalado (código: 2055492159)');
    process.exit(1);
  }
}

main();
