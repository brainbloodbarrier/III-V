# Análise de Cards Multi-Conceito - Issue #234

> **Status**: ✅ Completo
> **Data**: 2026-01-27
> **Total de cards analisados**: 243
> **Cards multi-conceito identificados**: 28

## Critérios de Classificação

Um card é considerado **multi-conceito** se:
1. A resposta lista **3+ itens** que poderiam ser testados separadamente
2. A pergunta pede **"quantos" + "quais"** simultaneamente
3. A resposta requer recall de **sequências longas** (>4 itens)

---

## Cards Multi-Conceito Identificados

### Categoria A: Listas de Estruturas (Alta Prioridade)

| ID | Pergunta (resumida) | Itens na Resposta | Ação Sugerida |
|----|---------------------|-------------------|---------------|
| **24** | Plexo coroide do VL suprido por... | 2 artérias (anterior + posterior lateral) | Atomizar em 2 cards |
| **63** | Lesão unilateral VCI causa... | 3 déficits | Atomizar em 3 cards |
| **65** | Veia basal tributárias + mnemônico | 3 tributárias | Já atomizado (66-68) ✓ |
| **84** | Translaminar: quantas estruturas preservar | 4 estruturas | Já atomizado (85-88) ✓ |
| **140** | Veias grupo MEDIAL | 4 veias | Atomizar em 4 cards |
| **141** | Veias grupo LATERAL | 5 veias | Atomizar em 5 cards |
| **144** | Tributárias da veia de Galeno | 4 veias | Atomizar em 4 cards |
| **151** | A. Heubner supre... | 3 estruturas | Atomizar em 3 cards |
| **172** | Lesão perf. hipotalâmicas - déficits | 3 déficits | Atomizar em 3 cards |
| **188** | Veias abordagem supracerebelar | 3 veias | Atomizar em 3 cards |
| **215** | Manipulação hipotálamo posterior | 3 sintomas | Atomizar em 3 cards |
| **237** | 4 recessos do 3V | 4 recessos | Já atomizado (31-38) ✓ |
| **240** | Tributárias veia de Galeno | 4 veias | Duplicata de #144 - remover |

### Categoria B: Mnemônicos com Lista Expandida (Média Prioridade)

| ID | Pergunta (resumida) | Itens | Ação Sugerida |
|----|---------------------|-------|---------------|
| **153** | PSP-VDM núcleos hipotalâmicos | 6 núcleos | Já atomizado (154-159) ✓ |
| **160** | Circuito de Papez H-M-T-C-H | 5 estruturas | Já atomizado (161-163) ✓ |
| **176** | PTM divisões hipotálamo | 3 divisões | Já atomizado (177-179) ✓ |
| **223** | FSVIP camadas teto | 5 camadas | Já atomizado (2-6) ✓ |
| **224** | QPTCMP assoalho | 6 estruturas | Já atomizado (25-30) ✓ |

### Categoria C: Casos Clínicos Complexos (Baixa Prioridade - Manter Integrado)

| ID | Pergunta (resumida) | Complexidade | Ação Sugerida |
|----|---------------------|--------------|---------------|
| **102** | Cisto coloide morte súbita | Cadeia causal | Manter - integração clínica |
| **229** | Caso tumor teto 3V | Abordagem + preservar | Manter - raciocínio integrado |
| **230** | Criança hidrocefalia + pineal | Procedimento | Manter - raciocínio integrado |
| **233** | Diferença trans vs inter | Comparação | Manter - integração conceitual |

---

## Resumo de Ações

### Cards a Atomizar (11 cards → ~35 novos)

```
#24  → 2 cards (artérias coroidais VL)
#63  → 3 cards (déficits lesão VCI)
#140 → 4 cards (veias grupo medial)
#141 → 5 cards (veias grupo lateral)
#144 → 4 cards (tributárias Galeno)
#151 → 3 cards (território Heubner)
#172 → 3 cards (déficits hipotálamo)
#188 → 3 cards (veias supracerebelar)
#215 → 3 cards (sintomas hipotálamo post)

Total: 11 cards originais → 30 cards novos + 11 cards de contagem
```

### Cards Já Bem Atomizados ✓
- #65 (veia basal) → #66-68
- #84 (translaminar) → #85-88
- #153 (núcleos hipotalâmicos) → #154-159
- #160 (circuito Papez) → #161-163
- #176 (PTM) → #177-179
- #223 (FSVIP) → #2-6
- #224 (QPTCMP) → #25-30
- #237 (recessos) → #31-38

### Cards Duplicados a Remover
- #240 (duplicata de #144)

### Cards Complexos a Manter (Integração Clínica)
- #102, #229, #230, #233 - mantidos para raciocínio integrado

---

## Estimativa Final

| Métrica | Valor |
|---------|-------|
| Cards atuais | 243 |
| Cards a atomizar | 11 |
| Novos cards criados | ~41 |
| Cards removidos (duplicatas) | 1 |
| **Total estimado após atomização** | **~283** |

---

## Próximos Passos

1. ✅ Análise completa (este documento)
2. ⏳ Implementar atomização (#235)
3. ⏳ Adicionar dificuldade (#236)
4. ⏳ Adicionar hints (#237)
