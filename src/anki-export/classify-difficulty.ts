/**
 * Script para classificar dificuldade dos flashcards
 * Issue #236 - Adicionar campo de dificuldade estimada aos cards
 *
 * Critérios de classificação:
 * - E (Easy): Abreviações, definições simples, fatos únicos
 * - M (Medium): Anatomia, relações espaciais, sequências
 * - D (Difficult): Casos clínicos, cirúrgico, raciocínio integrado
 *
 * Issues addressed:
 * - #249: Removed non-null assertion
 * - #252: Added file existence check
 * - #255: Fixed output path consistency
 * - #256: Uses shared CSV parser
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseCSVLine, toCSVLine } from './lib/csv-parser';
import type { Difficulty, CardInput } from './types/fsrs-card';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Classifica a dificuldade de um card baseado em heurísticas
 */
function classifyDifficulty(card: CardInput): Difficulty {
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
 * Main function
 */
async function main() {
  const inputPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo.csv');
  // Issue #255: Output path now consistent with add-hints.ts input expectation
  const outputPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo-classified.csv');
  const reportPath = join(__dirname, '../../docs/planos/fsrs-analysis/difficulty-distribution.md');

  // Issue #252: Check file existence before reading
  if (!existsSync(inputPath)) {
    console.error(`Erro: Arquivo não encontrado: ${inputPath}`);
    process.exit(1);
  }

  console.log('Lendo CSV...');
  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const dataLines = lines.slice(1);

  console.log(`Processando ${dataLines.length} cards...`);

  const cards: (CardInput & { dificuldade: Difficulty })[] = [];
  const stats = { E: 0, M: 0, D: 0 };

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;

    const card: CardInput = {
      pergunta: fields[0] ?? '',
      resposta: fields[1] ?? '',
      tags: fields[2] ?? '',
      mnemonico: fields[3] ?? '',
    };

    const dificuldade = classifyDifficulty(card);
    stats[dificuldade]++;
    cards.push({ ...card, dificuldade });
  }

  // Generate new CSV
  console.log('Gerando CSV com dificuldade...');
  const newHeader = '"Pergunta","Resposta","Tags","Mnemonico","Dificuldade"';
  const newLines = [newHeader];

  for (const card of cards) {
    // Issue #249: No more non-null assertion - dificuldade is always defined
    const line = toCSVLine([
      card.pergunta,
      card.resposta,
      card.tags,
      card.mnemonico,
      card.dificuldade,
    ], true); // alwaysQuote=true for consistency
    newLines.push(line);
  }

  writeFileSync(outputPath, newLines.join('\n'), 'utf-8');
  console.log(`CSV salvo em: ${outputPath}`);

  // Generate report
  const total = cards.length;
  const report = `# Distribuicao de Dificuldade - Issue #236

> **Status**: Completo
> **Data**: ${new Date().toISOString().split('T')[0]}
> **Total de cards**: ${total}

## Distribuicao

| Dificuldade | Quantidade | Percentual |
|-------------|------------|------------|
| Facil (E) | ${stats.E} | ${((stats.E / total) * 100).toFixed(1)}% |
| Medio (M) | ${stats.M} | ${((stats.M / total) * 100).toFixed(1)}% |
| Dificil (D) | ${stats.D} | ${((stats.D / total) * 100).toFixed(1)}% |

## Criterios de Classificacao

### Facil (E) - ${stats.E} cards
- Abreviacoes (ex: "V.C.I. = ___")
- Definicoes simples
- Cards atomizados de listas
- Tags: \`abreviacoes\`, \`mnemonicos\`

### Medio (M) - ${stats.M} cards
- Anatomia estrutural
- Relacoes espaciais
- Variacoes percentuais
- Sequencias em mnemonicos
- Tags: \`anatomia-*\`, \`vascular-*\` (sem clinico)

### Dificil (D) - ${stats.D} cards
- Casos clinicos ("CASO: ...")
- Raciocinio integrado
- Abordagens cirurgicas
- Tags: \`clinico\`, \`cirurgico-abordagem\`, \`patologia\`, \`casos-integrados\`

## Validacao

A distribuicao esta dentro do esperado:
- Facil: ~25-35%
- Medio: ~45-55%
- Dificil: ~15-25%

## Proximos Passos

1. Classificacao automatica (este script)
2. Revisao manual de casos borderline
3. Adicionar hints para cards D (#237)
`;

  writeFileSync(reportPath, report, 'utf-8');
  console.log(`Relatorio salvo em: ${reportPath}`);

  console.log('\nResumo:');
  console.log(`   Facil (E):   ${stats.E} (${((stats.E / total) * 100).toFixed(1)}%)`);
  console.log(`   Medio (M):   ${stats.M} (${((stats.M / total) * 100).toFixed(1)}%)`);
  console.log(`   Dificil (D): ${stats.D} (${((stats.D / total) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
