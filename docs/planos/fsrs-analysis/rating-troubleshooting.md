# Erros Comuns de Rating e Troubleshooting - Issue #243

> **Status**: ✅ Completo
> **Data**: 2026-01-27
> **Versão**: 1.0

## Erros Comuns de Rating

### ❌ Erro 1: Hard como Fail

```
┌─────────────────────────────────────────────────────────────┐
│ SITUAÇÃO                                                    │
│ Não lembrou a resposta, mas usou Hard porque "quase lembrei"│
│                                                             │
│ IMPACTO NO FSRS                                             │
│ • FSRS interpreta Hard como "lembrei com dificuldade"       │
│ • Calcula estabilidade maior do que deveria                 │
│ • Próximo intervalo será muito longo                        │
│                                                             │
│ RESULTADO                                                   │
│ • Esquece o card no próximo review                          │
│ • Marca Again → intervalo cai drasticamente                 │
│ • Loop de frustração                                        │
│                                                             │
│ SOLUÇÃO                                                     │
│ Se não lembrou = AGAIN. Sempre. Sem exceção.                │
└─────────────────────────────────────────────────────────────┘
```

**Exemplo com deck 3V:**
```
Pergunta: "Qual a 3ª camada do teto do 3V (FSVIP)?"
Pensou: "F... S... V... qual era?"
Resposta correta: Velum interpositum

ERRADO: Marcar Hard porque "sabia que era V de alguma coisa"
CERTO:  Marcar Again porque não lembrou "Velum interpositum"
```

---

### ❌ Erro 2: Easy Excessivo

```
┌─────────────────────────────────────────────────────────────┐
│ SITUAÇÃO                                                    │
│ Usa Easy toda vez que acerta, independente do tempo         │
│                                                             │
│ IMPACTO NO FSRS                                             │
│ • FSRS aumenta estabilidade muito rapidamente               │
│ • Intervalos crescem 2-3x mais rápido que deveriam          │
│                                                             │
│ RESULTADO                                                   │
│ • Cards "maduros" em 2 semanas (deveria ser 2 meses)        │
│ • Retenção real cai para 70-80%                            │
│ • Sensação de "esquecendo tudo"                             │
│                                                             │
│ SOLUÇÃO                                                     │
│ Easy apenas para respostas INSTANTÂNEAS (<2 seg)            │
│ Máximo 10-15% dos ratings devem ser Easy                    │
└─────────────────────────────────────────────────────────────┘
```

**Distribuição saudável:**
```
Again: 10-15%  ████░░░░░░░░░░░░░░░░
Hard:  15-20%  ███████░░░░░░░░░░░░░
Good:  60-70%  █████████████████████  ← MAIORIA
Easy:  10-15%  ████░░░░░░░░░░░░░░░░
```

---

### ❌ Erro 3: Rating pelo Desejo

```
┌─────────────────────────────────────────────────────────────┐
│ SITUAÇÃO                                                    │
│ "Quero ver esse card de novo" → Again                       │
│ "Não quero ver tão cedo" → Easy                             │
│                                                             │
│ IMPACTO NO FSRS                                             │
│ • FSRS aprende padrões de DESEJO, não de MEMÓRIA            │
│ • Parâmetros otimizados ficam enviesados                    │
│ • Scheduling não reflete capacidade real                    │
│                                                             │
│ RESULTADO                                                   │
│ • Algoritmo "quebrado" para seu perfil                      │
│ • Intervalos não fazem sentido                              │
│ • Precisa reset e recomeçar                                 │
│                                                             │
│ SOLUÇÃO                                                     │
│ Rate pela MEMÓRIA: "Eu lembrei?" + "Quanto tempo demorei?"  │
│ Ignore o que você QUER que aconteça com o card              │
└─────────────────────────────────────────────────────────────┘
```

---

### ❌ Erro 4: Inconsistência por Humor

```
┌─────────────────────────────────────────────────────────────┐
│ SITUAÇÃO                                                    │
│ Dia bom → ratings mais generosos (mais Good/Easy)           │
│ Dia ruim → ratings mais rigorosos (mais Again/Hard)         │
│                                                             │
│ IMPACTO NO FSRS                                             │
│ • Ruído nos dados de treinamento                            │
│ • FSRS não consegue modelar sua memória real                │
│ • RMSE alto mesmo com muitos reviews                        │
│                                                             │
│ SOLUÇÃO                                                     │
│ Usar critérios OBJETIVOS:                                   │
│ 1. Resposta correta? (Sim/Não)                              │
│ 2. Tempo de resposta? (<2s, 2-5s, >5s)                      │
│ Não importa como você se SENTE sobre o card                 │
└─────────────────────────────────────────────────────────────┘
```

---

### ❌ Erro 5: Parar no Meio da Sessão

```
┌─────────────────────────────────────────────────────────────┐
│ SITUAÇÃO                                                    │
│ Começar review de 50 cards, parar nos 10 primeiros          │
│                                                             │
│ IMPACTO NO FSRS                                             │
│ • Selection bias: só revisa cards fáceis (aparecem primeiro)│
│ • Cards difíceis acumulam no backlog                        │
│ • Dados de review enviesados                                │
│                                                             │
│ SOLUÇÃO                                                     │
│ • Completar sessões OU                                      │
│ • Usar limite diário CONSISTENTE (ex: sempre 30 cards)      │
│ • Não parar no meio por "cansaço de cards difíceis"         │
└─────────────────────────────────────────────────────────────┘
```

---

## Diagnóstico de Problemas

### Sintoma: Intervalos Muito Longos

```
OBSERVAÇÃO: Cards novos já têm intervalos de 30+ dias

CAUSAS POSSÍVEIS:
□ Usando Easy demais
□ Usando Hard quando deveria usar Again
□ Retention target muito baixo (<0.85)

DIAGNÓSTICO:
1. Anki → Stats → Answer Buttons
2. Verificar distribuição de ratings
3. Se Easy >20% → problema identificado

SOLUÇÃO:
1. Corrigir comportamento de rating
2. Considerar reset de cards problemáticos
3. Re-otimizar após 2 semanas de rating correto
```

---

### Sintoma: Muitos Reviews por Dia

```
OBSERVAÇÃO: 100+ reviews/dia mesmo com deck pequeno

CAUSAS POSSÍVEIS:
□ Retention target muito alto (>0.93)
□ Muitos new cards/day
□ Usando Again demais (cards mal formulados?)

DIAGNÓSTICO:
1. Verificar desired retention (Deck Options)
2. Verificar new cards/day
3. Stats → Answer Buttons → % Again

SOLUÇÃO:
Se retention >0.93:
  → Reduzir para 0.90

Se new cards >20/day:
  → Reduzir para 10-15

Se Again >25%:
  → Revisar formulação dos cards
  → Verificar se está usando Again corretamente
```

---

### Sintoma: Esquecendo Cards "Maduros"

```
OBSERVAÇÃO: Cards com intervalos longos (60+ dias) sendo esquecidos

CAUSAS POSSÍVEIS:
□ Inflou ratings no passado (Easy/Good quando deveria Hard)
□ Card tem problema de formulação
□ Interferência de cards similares

DIAGNÓSTICO:
1. Browse → Card específico → Card Info
2. Verificar histórico de ratings
3. Se muitos Easy/Good no início → inflação

SOLUÇÃO:
1. Para cards específicos: Reset (Forget)
2. Para padrão geral:
   - Aumentar desired retention (+0.02)
   - Re-otimizar parâmetros
3. Corrigir comportamento de rating
```

---

### Sintoma: RMSE Alto (>0.10)

```
OBSERVAÇÃO: FSRS → Evaluate mostra RMSE >0.10

CAUSAS POSSÍVEIS:
□ Poucos reviews (<400)
□ Rating muito inconsistente
□ Mudança de hábito de estudo no meio

DIAGNÓSTICO:
1. Verificar total de reviews (Stats)
2. Se <400 → dados insuficientes
3. Se >400 → inconsistência de rating

SOLUÇÃO:
Se poucos reviews:
  → Esperar acumular 400+
  → Usar parâmetros default

Se muitos reviews mas RMSE alto:
  → Revisar guia de rating
  → Manter consistência por 2 semanas
  → Re-otimizar
```

---

## Como Recalibrar

### Se Percebeu que Estava Fazendo Errado

```
┌─────────────────────────────────────────────────────────────┐
│ PASSO 1: Não entre em pânico                                │
│          FSRS é resiliente a algum ruído                    │
│                                                             │
│ PASSO 2: Corrija comportamento AGORA                        │
│          Releia o guia de rating                            │
│          Imprima o cheat sheet                              │
│                                                             │
│ PASSO 3: Continue usando o deck normalmente                 │
│          Novos dados "corretos" diluem dados "errados"      │
│                                                             │
│ PASSO 4: Em 2-4 semanas, re-otimize                         │
│          FSRS → Optimize                                    │
│          FSRS se adapta aos novos padrões                   │
│                                                             │
│ PASSO 5: Monitore RMSE                                      │
│          Deve melhorar com o tempo                          │
└─────────────────────────────────────────────────────────────┘
```

### Reset Completo (Último Recurso)

```
⚠️ AVISO: Perde todo histórico de aprendizado

QUANDO USAR:
• Rating completamente errado por meses
• Mudança drástica de objetivo de estudo
• Recomeçar do zero é preferível

COMO FAZER:
1. Anki → Browse → Selecionar deck
2. Edit → Select All
3. Cards → Forget
4. Confirmar reset
5. Recomeçar como se fossem cards novos
```

---

## Checklist de Auto-Diagnóstico

Execute semanalmente nas primeiras 4 semanas:

```
□ Minha distribuição de ratings está saudável?
  - Again: 10-15%
  - Hard: 15-20%
  - Good: 60-70%
  - Easy: 10-15%

□ Estou usando Again quando esqueço (não Hard)?

□ Estou usando Easy apenas para respostas instantâneas?

□ Estou completando sessões inteiras?

□ Meu RMSE está melhorando (ou estável)?

□ Minha retenção real está próxima do target?
```

---

## FAQ de Troubleshooting

### "Marquei errado, posso corrigir?"

```
SIM, mas com cuidado:

1. Durante o review: Use "Undo" (Ctrl+Z)
2. Após o review: Browse → Card → Card Info →
   Não há como editar, mas um rating errado
   ocasional não quebra o FSRS

Não se preocupe com erros ocasionais.
```

### "FSRS parece não estar funcionando"

```
Verificar:
1. FSRS está habilitado? (Deck Options → FSRS toggle)
2. Tem reviews suficientes? (mínimo 400 para otimizar)
3. Está usando Anki 23.10+?
4. Add-ons incompatíveis? (ease modifiers, etc.)
```

### "Intervalos parecem aleatórios"

```
FSRS é contra-intuitivo no início:

1. Intervalos variam por CARD, não por rating
2. Good em card difícil ≠ Good em card fácil
3. Confie no algoritmo por 2 semanas
4. Avalie retenção REAL, não intervalos individuais
```

### "Devo usar o mesmo rating para cards similares?"

```
NÃO necessariamente.

Rate cada card INDEPENDENTEMENTE:
- Como VOCÊ lembrou ESTE card?
- Quanto tempo VOCÊ demorou?

Cards similares podem ter dificuldades diferentes
para você pessoalmente.
```
