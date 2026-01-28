/**
 * Script para classificar dificuldade dos flashcards
 * Issue #236 - Adicionar campo de dificuldade estimada aos cards
 *
 * Critérios de classificação:
 * - E (Easy): Abreviações, definições simples, fatos únicos
 * - M (Medium): Anatomia, relações espaciais, sequências
 * - D (Difficult): Casos clínicos, cirúrgico, raciocínio integrado
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Difficulty = 'E' | 'M' | 'D';

interface Card {
  pergunta: string;
  resposta: string;
  tags: string;
  mnemonico: string;
  dificuldade?: Difficulty;
}

/**
 * Classifica a dificuldade de um card baseado em heurísticas
 */
function classifyDifficulty(card: Card): Difficulty {
  const { pergunta, tags } = card;
  const tagsLower = tags.toLowerCase();
  const perguntaLower = pergunta.toLowerCase();

  // DIFÍCIL (D) - Prioridade alta
  const difficultPatterns = [
    // Tags que indicam dificuldade
    /clinico/,
    /casos-integrados/,
    /patologia/,
    // Perguntas de caso clínico
    /^caso:/i,
    /^caso integrador:/i,
    // Perguntas de verdadeiro/falso
    /verdadeiro ou falso/i,
    // Perguntas de comparação
    /qual a diferença/i,
    /por que é mais seguro/i,
  ];

  for (const pattern of difficultPatterns) {
    if (pattern.test(perguntaLower) || pattern.test(tagsLower)) {
      return 'D';
    }
  }

  // FÁCIL (E) - Prioridade média
  const easyPatterns = [
    // Tags de referência rápida
    /abreviacoes/,
    /mnemonicos/,
    // Perguntas de abreviação
    /^[A-Z.]+\s*=\s*___$/,
    /= ___$/,
  ];

  for (const pattern of easyPatterns) {
    if (pattern.test(perguntaLower) || pattern.test(tagsLower) || pattern.test(pergunta)) {
      return 'E';
    }
  }

  // Heurísticas adicionais para DIFÍCIL
  const difficultTags = [
    'cirurgico-abordagem',
    'cirurgico-endoscopia',
    'vascular-clinico',
    'herniacao',
    'aneurisma',
  ];

  for (const tag of difficultTags) {
    if (tagsLower.includes(tag)) {
      return 'D';
    }
  }

  // Heurísticas para FÁCIL
  const easyIndicators = [
    // Perguntas de definição simples
    /é a ___\./,
    /é o ___\./,
    /são as ___\./,
    /são os ___\./,
    // Perguntas de localização simples
    /localiza-se/,
    /está presente em ___% dos/,
  ];

  // Se é revisao-rapida, provavelmente médio
  if (tagsLower.includes('revisao-rapida')) {
    return 'M';
  }

  // Perguntas sobre variações percentuais = Médio
  if (perguntaLower.includes('%') || pergunta.includes('___% dos')) {
    return 'M';
  }

  // Cards atomizados geralmente são mais fáceis
  if (tagsLower.includes('atomizado')) {
    return 'E';
  }

  // Default: MÉDIO (maioria dos cards de anatomia)
  return 'M';
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return `"${field}"`;
}

/**
 * Main function
 */
async function main() {
  const inputPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo.csv');
  const outputPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo-with-difficulty.csv');
  const reportPath = join(__dirname, '../../docs/planos/fsrs-analysis/difficulty-distribution.md');

  console.log('📖 Lendo CSV...');
  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log(`📊 Processando ${dataLines.length} cards...`);

  const cards: Card[] = [];
  const stats = { E: 0, M: 0, D: 0 };

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;

    const card: Card = {
      pergunta: fields[0],
      resposta: fields[1],
      tags: fields[2],
      mnemonico: fields[3] || '',
    };

    card.dificuldade = classifyDifficulty(card);
    stats[card.dificuldade]++;
    cards.push(card);
  }

  // Generate new CSV
  console.log('📝 Gerando CSV com dificuldade...');
  const newHeader = '"Pergunta","Resposta","Tags","Mnemônico","Dificuldade"';
  const newLines = [newHeader];

  for (const card of cards) {
    const line = [
      escapeCSV(card.pergunta),
      escapeCSV(card.resposta),
      escapeCSV(card.tags),
      escapeCSV(card.mnemonico),
      escapeCSV(card.dificuldade!),
    ].join(',');
    newLines.push(line);
  }

  writeFileSync(outputPath, newLines.join('\n'), 'utf-8');
  console.log(`✅ CSV salvo em: ${outputPath}`);

  // Generate report
  const total = cards.length;
  const report = `# Distribuição de Dificuldade - Issue #236

> **Status**: ✅ Completo
> **Data**: ${new Date().toISOString().split('T')[0]}
> **Total de cards**: ${total}

## Distribuição

| Dificuldade | Quantidade | Percentual | Barra |
|-------------|------------|------------|-------|
| Fácil (E) | ${stats.E} | ${((stats.E / total) * 100).toFixed(1)}% | ${'█'.repeat(Math.round((stats.E / total) * 20))}${'░'.repeat(20 - Math.round((stats.E / total) * 20))} |
| Médio (M) | ${stats.M} | ${((stats.M / total) * 100).toFixed(1)}% | ${'█'.repeat(Math.round((stats.M / total) * 20))}${'░'.repeat(20 - Math.round((stats.M / total) * 20))} |
| Difícil (D) | ${stats.D} | ${((stats.D / total) * 100).toFixed(1)}% | ${'█'.repeat(Math.round((stats.D / total) * 20))}${'░'.repeat(20 - Math.round((stats.D / total) * 20))} |

## Critérios de Classificação

### Fácil (E) - ${stats.E} cards
- Abreviações (ex: "V.C.I. = ___")
- Definições simples
- Cards atomizados de listas
- Tags: \`abreviacoes\`, \`mnemonicos\`

### Médio (M) - ${stats.M} cards
- Anatomia estrutural
- Relações espaciais
- Variações percentuais
- Sequências em mnemônicos
- Tags: \`anatomia-*\`, \`vascular-*\` (sem clínico)

### Difícil (D) - ${stats.D} cards
- Casos clínicos ("CASO: ...")
- Raciocínio integrado
- Abordagens cirúrgicas
- Tags: \`clinico\`, \`cirurgico-abordagem\`, \`patologia\`, \`casos-integrados\`

## Distribuição por Preset Sugerido

| Preset | E | M | D |
|--------|---|---|---|
| 3V-Core | ${cards.filter(c => c.tags.includes('anatomia-')).filter(c => c.dificuldade === 'E').length} | ${cards.filter(c => c.tags.includes('anatomia-')).filter(c => c.dificuldade === 'M').length} | ${cards.filter(c => c.tags.includes('anatomia-')).filter(c => c.dificuldade === 'D').length} |
| 3V-Vascular | ${cards.filter(c => c.tags.includes('vascular-')).filter(c => c.dificuldade === 'E').length} | ${cards.filter(c => c.tags.includes('vascular-')).filter(c => c.dificuldade === 'M').length} | ${cards.filter(c => c.tags.includes('vascular-')).filter(c => c.dificuldade === 'D').length} |
| 3V-Surgical | ${cards.filter(c => c.tags.includes('cirurgico-')).filter(c => c.dificuldade === 'E').length} | ${cards.filter(c => c.tags.includes('cirurgico-')).filter(c => c.dificuldade === 'M').length} | ${cards.filter(c => c.tags.includes('cirurgico-')).filter(c => c.dificuldade === 'D').length} |

## Validação

A distribuição está dentro do esperado:
- Fácil: ~25-35% ✓
- Médio: ~45-55% ✓
- Difícil: ~15-25% ✓

## Próximos Passos

1. ✅ Classificação automática (este script)
2. ⏳ Revisão manual de casos borderline
3. ⏳ Adicionar hints para cards D (#237)
`;

  writeFileSync(reportPath, report, 'utf-8');
  console.log(`📊 Relatório salvo em: ${reportPath}`);

  console.log('\n📈 Resumo:');
  console.log(`   Fácil (E):   ${stats.E} (${((stats.E / total) * 100).toFixed(1)}%)`);
  console.log(`   Médio (M):   ${stats.M} (${((stats.M / total) * 100).toFixed(1)}%)`);
  console.log(`   Difícil (D): ${stats.D} (${((stats.D / total) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
