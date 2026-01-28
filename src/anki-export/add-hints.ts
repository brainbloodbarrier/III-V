/**
 * Script para adicionar hints aos cards difíceis (D)
 * Issue #237 - Adicionar campo de hints para cards difíceis
 *
 * Estratégia de hints:
 * - Casos clínicos: "Pense na estrutura em risco na região"
 * - Cirúrgico: "Qual estrutura deve ser evitada/preservada?"
 * - Integrados: Usar o mnemônico como base
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Card {
  pergunta: string;
  resposta: string;
  tags: string;
  mnemonico: string;
  dificuldade: string;
  hint?: string;
}

/**
 * Gera hint contextual baseado no conteúdo do card
 */
function generateHint(card: Card): string {
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
  const outputPath = join(__dirname, '../../docs/planos/flashcards-terceiro-ventriculo-with-hints.csv');
  const reportPath = join(__dirname, '../../docs/planos/fsrs-analysis/hints-report.md');

  console.log('📖 Lendo CSV...');
  const content = readFileSync(inputPath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const dataLines = lines.slice(1);

  console.log(`📊 Processando ${dataLines.length} cards...`);

  const cards: Card[] = [];
  const hintsAdded: { pergunta: string; hint: string; tags: string }[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;

    const card: Card = {
      pergunta: fields[0],
      resposta: fields[1],
      tags: fields[2],
      mnemonico: fields[3] || '',
      dificuldade: fields[4] || 'M',
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
  console.log('📝 Gerando CSV com hints...');
  const newHeader = '"Pergunta","Resposta","Tags","Mnemônico","Dificuldade","Hint"';
  const newLines = [newHeader];

  for (const card of cards) {
    const line = [
      escapeCSV(card.pergunta),
      escapeCSV(card.resposta),
      escapeCSV(card.tags),
      escapeCSV(card.mnemonico),
      escapeCSV(card.dificuldade),
      escapeCSV(card.hint || ''),
    ].join(',');
    newLines.push(line);
  }

  writeFileSync(outputPath, newLines.join('\n'), 'utf-8');
  console.log(`✅ CSV salvo em: ${outputPath}`);

  // Generate report
  const report = `# Hints para Cards Difíceis - Issue #237

> **Status**: ✅ Completo
> **Data**: ${new Date().toISOString().split('T')[0]}
> **Cards com hints**: ${hintsAdded.length}

## Estratégia de Hints

Hints foram gerados automaticamente baseados em:

1. **Mnemônicos existentes** → Usados como base quando úteis
2. **Tipo de pergunta** → Casos clínicos, V/F, comparações
3. **Tags** → Cirúrgico, vascular, patologia
4. **Contexto** → Abordagem, estrutura, conceito

## Categorias de Hints

| Categoria | Quantidade | Exemplo |
|-----------|------------|---------|
| Casos clínicos | ${hintsAdded.filter(h => h.pergunta.toLowerCase().includes('caso:')).length} | "Pense nas estruturas adjacentes" |
| Abordagens | ${hintsAdded.filter(h => h.tags.includes('cirurgico-abordagem')).length} | "Via transchoroidal = pelo fórnice" |
| V/F | ${hintsAdded.filter(h => h.pergunta.toLowerCase().includes('verdadeiro')).length} | "Verifique cada termo" |
| Vascular clínico | ${hintsAdded.filter(h => h.tags.includes('vascular') && h.tags.includes('clinico')).length} | "Considere consequências vasculares" |
| Outros | ${hintsAdded.length - hintsAdded.filter(h => h.pergunta.toLowerCase().includes('caso:') || h.tags.includes('cirurgico-abordagem') || h.pergunta.toLowerCase().includes('verdadeiro') || (h.tags.includes('vascular') && h.tags.includes('clinico'))).length} | "Revise o conceito central" |

## Exemplos de Hints Gerados

${hintsAdded.slice(0, 15).map((h, i) => `### ${i + 1}. ${h.pergunta}
- **Tags**: \`${h.tags}\`
- **Hint**: "${h.hint}"
`).join('\n')}

## Uso no Anki

1. O campo "Hint" aparecerá como botão \`[Mostrar Dica]\`
2. Configurar template para exibir hint apenas quando clicado
3. Hints não devem dar a resposta, apenas direcionar raciocínio

## Validação Manual Recomendada

Os hints foram gerados automaticamente e podem precisar de ajustes para:
- Cards com contexto muito específico
- Casos onde o mnemônico já é suficiente
- Abordagens menos comuns

## Próximos Passos

1. ✅ Geração automática de hints (este script)
2. ⏳ Revisão manual dos 15 primeiros hints
3. ⏳ Ajuste fino de hints genéricos
4. ⏳ Integrar no template Anki (#244)
`;

  writeFileSync(reportPath, report, 'utf-8');
  console.log(`📊 Relatório salvo em: ${reportPath}`);

  console.log(`\n📈 Resumo:`);
  console.log(`   Total de cards: ${cards.length}`);
  console.log(`   Cards com hints: ${hintsAdded.length}`);
  console.log(`   Cards sem hints: ${cards.length - hintsAdded.length}`);
}

main().catch(console.error);
