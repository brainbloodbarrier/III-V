/**
 * Script para adicionar hints aos cards difíceis (D)
 * Issue #237 - Adicionar campo de hints para cards difíceis
 *
 * Estratégia de hints:
 * - Casos clínicos: "Pense na estrutura em risco na região"
 * - Cirúrgico: "Qual estrutura deve ser evitada/preservada?"
 * - Integrados: Usar o mnemônico como base
 *
 * Issues addressed:
 * - #252: Added file existence check
 * - #256: Uses shared CSV parser
 * - #260: Uses CardInput type
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseCSVLine, toCSVLine } from './lib/csv-parser';
import type { CardInput, Difficulty } from './types/fsrs-card';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CardWithDifficulty extends CardInput {
  dificuldade: Difficulty;
  hint?: string;
}

/**
 * Gera hint contextual baseado no conteúdo do card
 */
function generateHint(card: CardWithDifficulty): string {
  const { pergunta, resposta, tags, mnemonico } = card;
  const tagsLower = tags.toLowerCase();
  const perguntaLower = pergunta.toLowerCase();

  // Se já tem mnemônico útil, usar como base do hint
  if (mnemonico && mnemonico.length > 2 && !mnemonico.includes('=')) {
    // Mnemônicos curtos são dicas diretas
    if (mnemonico.length <= 20) {
      return `Lembre-se: ${mnemonico}`;
    }
  }

  // CASOS CLÍNICOS - hints sobre raciocínio
  if (perguntaLower.startsWith('caso:')) {
    if (tagsLower.includes('forame-monro')) {
      return 'Pense nas estruturas adjacentes ao forame de Monro';
    }
    if (tagsLower.includes('vascular') && tagsLower.includes('clinico')) {
      return 'Considere as consequências do comprometimento vascular';
    }
    if (tagsLower.includes('cirurgico') || tagsLower.includes('abordagem')) {
      return 'Qual estrutura está em risco nesta região?';
    }
    return 'Analise a localização anatômica e estruturas adjacentes';
  }

  // VERDADEIRO/FALSO - hints sobre conceito comum errado
  if (perguntaLower.includes('verdadeiro ou falso')) {
    return 'Cuidado com a afirmação - verifique cada termo';
  }

  // ABORDAGENS CIRÚRGICAS
  if (tagsLower.includes('cirurgico-abordagem')) {
    if (tagsLower.includes('transchoroidal')) {
      return 'Via transchoroidal = pelo fórnice';
    }
    if (tagsLower.includes('interforniceal')) {
      return 'Interforniceal = entre os fórnices, preservando colunas';
    }
    if (tagsLower.includes('translaminar')) {
      return 'Translaminar = através da lâmina terminal';
    }
    if (perguntaLower.includes('preservar') || perguntaLower.includes('preservada')) {
      return 'Liste mentalmente as estruturas nobres da região';
    }
    if (perguntaLower.includes('estrutura')) {
      return 'Pense nos marcos anatômicos desta abordagem';
    }
    return 'Qual é o princípio desta abordagem?';
  }

  // PATOLOGIA / HERNIAÇÃO
  if (tagsLower.includes('patologia') || tagsLower.includes('herniacao')) {
    return 'Considere a fisiopatologia do processo';
  }

  // TRÍADE / SÍNDROME
  if (perguntaLower.includes('tríade') || perguntaLower.includes('síndrome') ||
      perguntaLower.includes('3 hs') || resposta.toLowerCase().includes('3 hs')) {
    return 'Mnemônico: 3 Hs (Hemi-)';
  }

  // INFARTO AChA
  if (tagsLower.includes('vascular-arterias') && tagsLower.includes('clinico')) {
    if (perguntaLower.includes('acha') || perguntaLower.includes('coroidal anterior')) {
      return 'Lembre: 3 Hs - cápsula, tálamo, via óptica';
    }
    return 'Quais territórios esta artéria irriga?';
  }

  // FISSURA COROIDAL
  if (tagsLower.includes('fissura')) {
    return 'Fissura = fenda entre fórnice e tálamo';
  }

  // VEIAS - PRESERVAÇÃO
  if (tagsLower.includes('veias') && perguntaLower.includes('sacrific')) {
    return 'Pense no limite seguro de sacrifício venoso';
  }

  // CALOSO
  if (tagsLower.includes('caloso')) {
    return 'Secção anterior é mais segura';
  }

  // PERCENTUAIS / VARIAÇÕES
  if (perguntaLower.includes('%') || perguntaLower.includes('máximo')) {
    return 'Lembre-se do valor numérico aproximado';
  }

  // VCI
  if ((tagsLower.includes('vci') || resposta.toLowerCase().includes('vci')) &&
      tagsLower.includes('clinico')) {
    return 'VCI bilateral = consequência grave';
  }

  // COMPARAÇÕES
  if (perguntaLower.includes('qual a diferença') || perguntaLower.includes('por que é mais')) {
    return 'Compare as características principais';
  }

  // Atomizados de lista
  if (tagsLower.includes('atomizado')) {
    if (mnemonico) {
      const parts = mnemonico.split('-');
      if (parts.length > 1) {
        return `Sequência: ${mnemonico}`;
      }
    }
    return 'Pense na sequência completa';
  }

  // Default para cards D sem hint específico
  return 'Revise o conceito central deste tópico';
}

/**
 * Main function
 */
async function main() {
  // Input can be either the classified version or original
  const classifiedPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo-classified.csv');
  const originalPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo.csv');
  const outputPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo-with-hints.csv');
  const reportPath = join(__dirname, '../../docs/planos/fsrs-analysis/hints-report.md');

  // Issue #252: Check file existence before reading
  let inputPath = classifiedPath;
  if (!existsSync(classifiedPath)) {
    if (!existsSync(originalPath)) {
      console.error(`Erro: Nenhum arquivo de entrada encontrado.`);
      console.error(`  Esperado: ${classifiedPath}`);
      console.error(`  Ou: ${originalPath}`);
      process.exit(1);
    }
    inputPath = originalPath;
    console.log('Usando arquivo original (sem classificação prévia)');
  }

  console.log('Lendo CSV...');
  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const dataLines = lines.slice(1);

  console.log(`Processando ${dataLines.length} cards...`);

  const cards: CardWithDifficulty[] = [];
  const hintsAdded: { pergunta: string; hint: string; tags: string }[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;

    const card: CardWithDifficulty = {
      pergunta: fields[0] ?? '',
      resposta: fields[1] ?? '',
      tags: fields[2] ?? '',
      mnemonico: fields[3] ?? '',
      dificuldade: (fields[4] as Difficulty) || 'M',
    };

    // Adicionar hint apenas para cards D
    if (card.dificuldade === 'D') {
      card.hint = generateHint(card);
      hintsAdded.push({
        pergunta: card.pergunta.substring(0, 60) + '...',
        hint: card.hint,
        tags: card.tags,
      });
    } else {
      card.hint = '';
    }

    cards.push(card);
  }

  // Generate new CSV with hints
  console.log('Gerando CSV com hints...');
  const newHeader = '"Pergunta","Resposta","Tags","Mnemonico","Dificuldade","Hint"';
  const newLines = [newHeader];

  for (const card of cards) {
    const line = toCSVLine([
      card.pergunta,
      card.resposta,
      card.tags,
      card.mnemonico,
      card.dificuldade,
      card.hint ?? '',
    ], true);
    newLines.push(line);
  }

  writeFileSync(outputPath, newLines.join('\n'), 'utf-8');
  console.log(`CSV salvo em: ${outputPath}`);

  // Generate report
  const report = `# Hints para Cards Dificeis - Issue #237

> **Status**: Completo
> **Data**: ${new Date().toISOString().split('T')[0]}
> **Cards com hints**: ${hintsAdded.length}

## Estrategia de Hints

Hints foram gerados automaticamente baseados em:

1. **Mnemonicos existentes** - Usados como base quando uteis
2. **Tipo de pergunta** - Casos clinicos, V/F, comparacoes
3. **Tags** - Cirurgico, vascular, patologia
4. **Contexto** - Abordagem, estrutura, conceito

## Categorias de Hints

| Categoria | Quantidade | Exemplo |
|-----------|------------|---------|
| Casos clinicos | ${hintsAdded.filter(h => h.pergunta.toLowerCase().includes('caso:')).length} | "Pense nas estruturas adjacentes" |
| Abordagens | ${hintsAdded.filter(h => h.tags.includes('cirurgico-abordagem')).length} | "Via transchoroidal = pelo fornice" |
| V/F | ${hintsAdded.filter(h => h.pergunta.toLowerCase().includes('verdadeiro')).length} | "Verifique cada termo" |
| Vascular clinico | ${hintsAdded.filter(h => h.tags.includes('vascular') && h.tags.includes('clinico')).length} | "Considere consequencias vasculares" |
| Outros | ${hintsAdded.length - hintsAdded.filter(h => h.pergunta.toLowerCase().includes('caso:') || h.tags.includes('cirurgico-abordagem') || h.pergunta.toLowerCase().includes('verdadeiro') || (h.tags.includes('vascular') && h.tags.includes('clinico'))).length} | "Revise o conceito central" |

## Exemplos de Hints Gerados

${hintsAdded.slice(0, 15).map((h, i) => `### ${i + 1}. ${h.pergunta}
- **Tags**: \`${h.tags}\`
- **Hint**: "${h.hint}"
`).join('\n')}

## Uso no Anki

1. O campo "Hint" aparecera como botao \`[Mostrar Dica]\`
2. Configurar template para exibir hint apenas quando clicado
3. Hints nao devem dar a resposta, apenas direcionar raciocinio

## Validacao Manual Recomendada

Os hints foram gerados automaticamente e podem precisar de ajustes para:
- Cards com contexto muito especifico
- Casos onde o mnemonico ja e suficiente
- Abordagens menos comuns

## Proximos Passos

1. Geracao automatica de hints (este script)
2. Revisao manual dos 15 primeiros hints
3. Ajuste fino de hints genericos
4. Integrar no template Anki (#244)
`;

  writeFileSync(reportPath, report, 'utf-8');
  console.log(`Relatorio salvo em: ${reportPath}`);

  console.log(`\nResumo:`);
  console.log(`   Total de cards: ${cards.length}`);
  console.log(`   Cards com hints: ${hintsAdded.length}`);
  console.log(`   Cards sem hints: ${cards.length - hintsAdded.length}`);
}

main().catch(console.error);
