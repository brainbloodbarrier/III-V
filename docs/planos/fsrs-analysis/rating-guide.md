# Guia de Rating Consistente para FSRS - Issue #242

> **Status**: ✅ Completo
> **Data**: 2026-01-27
> **Versão**: 1.0

## Regra de Ouro

```
┌─────────────────────────────────────────────────────────────┐
│ 🚨 REGRA #1: Esqueceu = AGAIN (nunca Hard!)                 │
│                                                             │
│ 🎯 REGRA #2: Good é o padrão (60-70% dos ratings)          │
│                                                             │
│ ⏱️ REGRA #3: Tempo importa                                  │
│    - <2s automático → Easy                                  │
│    - 2-5s fluido → Good                                     │
│    - >5s hesitou mas correto → Hard                         │
│    - Errado → Again                                         │
│                                                             │
│ 🔄 REGRA #4: Seja consistente (mais que perfeito)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Guia Detalhado por Botão

### 🔴 Again (1) - "Esqueci"

**Definição**: Não conseguiu recuperar a informação correta.

**Usar quando**:
- ❌ Não lembrei nada
- ❌ Lembrei ERRADO (confundi estruturas)
- ❌ Lembrei parcialmente e o erro importa
- ❌ Chutei e acertei por sorte

**Exemplos com deck 3V**:

| Pergunta | Sua Resposta | Correta | Rating |
|----------|--------------|---------|--------|
| "5 camadas do teto (FSVIP)" | "Fórnice, tela, velum, plexo" | Faltou 1 | **AGAIN** |
| "VCI drena para..." | "Seio sagital superior" | Veia de Galeno | **AGAIN** |
| "Limite anterior FM" | Não lembrei | Colunas do fórnice | **AGAIN** |
| "Trajeto veia basal" | "Crural, quadrigeminal..." | CAQ | **AGAIN** |

**⚠️ CRÍTICO**: Se você não lembrou, é AGAIN. Nunca Hard!

---

### 🟠 Hard (2) - "Lembrei com dificuldade"

**Definição**: Lembrei corretamente, mas com hesitação significativa.

**Usar quando**:
- ⏰ Demorei >5 segundos para responder
- 🤔 Hesitei entre opções antes de acertar
- 😅 Quase errei mas me corrigi
- 🔄 Precisei "derivar" a resposta

**Exemplos com deck 3V**:

| Pergunta | Processo Mental | Rating |
|----------|-----------------|--------|
| "Trajeto veia basal (CAQ)" | "Crural... ambiente... qual era?" ...pausa... "Quadrigeminal!" | **HARD** |
| "% massa intermédia" | "70... não, espera... 70-80%!" | **HARD** |
| "Mnemônico assoalho" | Precisou reconstruir letra por letra | **HARD** |
| "Limite posterior velum" | "É o esplênio... a margem inferior dele" | **HARD** |

**Tempo típico**: 5-15 segundos

---

### 🟢 Good (3) - "Lembrei normalmente"

**Definição**: Recuperação correta com esforço moderado.

**Este é o rating PADRÃO. Use na maioria dos casos.**

**Usar quando**:
- ✅ Lembrei corretamente
- ⏱️ Tempo: 2-5 segundos
- 💭 Esforço moderado mas fluido
- 🎯 Sem hesitação significativa

**Exemplos com deck 3V**:

| Pergunta | Processo Mental | Rating |
|----------|-----------------|--------|
| "Camada mais superior teto" | "Fórnice" (2-3 seg) | **GOOD** |
| "VCI forma-se na margem..." | "Posterior do FM" (3 seg) | **GOOD** |
| "Primeiro sinal Parinaud" | "Paralisia olhar para cima" (4 seg) | **GOOD** |
| "Limite inferior lâmina terminal" | "Quiasma" (2 seg) | **GOOD** |

**Distribuição esperada**: 60-70% dos ratings

---

### 🔵 Easy (4) - "Lembrei instantaneamente"

**Definição**: Resposta automática, sem esforço consciente.

**Usar com MODERAÇÃO (apenas ~10-15% dos ratings)**

**Usar quando**:
- ⚡ Resposta veio automática (<2 segundos)
- 0️⃣ Zero hesitação
- 🤷 "Óbvio" para você após muita prática

**Exemplos com deck 3V**:

| Pergunta | Processo Mental | Rating |
|----------|-----------------|--------|
| "V.C.I. = ?" | "Veia Cerebral Interna" (instantâneo) | **EASY** |
| "Mnemônico teto" | "FSVIP" (automático) | **EASY** |
| "Bilateral VCI = ?" | "Fatal" (reflexo) | **EASY** |

**⚠️ Cuidado**: Easy excessivo = intervalos muito longos = esquecimento futuro

---

## Flowchart de Decisão

```
                    ┌─────────────────────┐
                    │ Você lembrou a      │
                    │ resposta?           │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │ NÃO           │               │ SIM
              ▼               │               ▼
        ┌─────────┐           │         ┌─────────────────┐
        │ AGAIN   │           │         │ A resposta está │
        │   🔴    │           │         │ CORRETA?        │
        └─────────┘           │         └────────┬────────┘
                              │                  │
                              │    ┌─────────────┼─────────────┐
                              │    │ NÃO         │             │ SIM
                              │    ▼             │             ▼
                              │  ┌─────────┐     │      ┌──────────────┐
                              │  │ AGAIN   │     │      │ Quanto tempo │
                              │  │   🔴    │     │      │ demorou?     │
                              │  └─────────┘     │      └──────┬───────┘
                              │                  │             │
                              │           ┌──────┴──────┬──────┴──────┐
                              │           │             │             │
                              │        <2 seg      2-5 seg        >5 seg
                              │       automático    fluido       hesitou
                              │           │             │             │
                              │           ▼             ▼             ▼
                              │      ┌─────────┐  ┌─────────┐  ┌─────────┐
                              │      │  EASY   │  │  GOOD   │  │  HARD   │
                              │      │   🔵    │  │   🟢    │  │   🟠    │
                              │      └─────────┘  └─────────┘  └─────────┘
                              │           │             │             │
                              │           ▼             ▼             ▼
                              │        ~10-15%      ~60-70%       ~15-20%
                              │       esperado      esperado      esperado
                              │
                              └───────────────────────────────────────────
```

---

## Distribuição Esperada de Ratings

```
┌────────────────────────────────────────────────────────────┐
│ Distribuição Saudável de Ratings                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Again (🔴): ████░░░░░░░░░░░░░░░░  10-15%                 │
│  Hard  (🟠): ███████░░░░░░░░░░░░░  15-20%                 │
│  Good  (🟢): █████████████████████ 60-70%  ← MAIORIA      │
│  Easy  (🔵): █████░░░░░░░░░░░░░░░  10-15%                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Se sua distribuição está muito diferente:**
- Again >25% → Cards muito difíceis ou mal formulados
- Hard >30% → Provavelmente usando Hard como Again
- Good <50% → Revisar critérios de rating
- Easy >25% → Inflando ratings, intervalos ficarão longos demais

---

## Erros Comuns

### ❌ Erro 1: Hard como Fail
```
SITUAÇÃO: Não lembrei, mas marquei Hard porque "quase lembrei"

PROBLEMA: FSRS acha que você lembra melhor do que realmente lembra
RESULTADO: Intervalos muito longos → esquece mais → frustração

SOLUÇÃO: Se não lembrou = AGAIN. Sempre.
```

### ❌ Erro 2: Easy Excessivo
```
SITUAÇÃO: Marca Easy sempre que acerta

PROBLEMA: FSRS aumenta intervalos muito rápido
RESULTADO: Retenção real cai abaixo do target

SOLUÇÃO: Easy apenas para cards realmente automáticos (<10%)
```

### ❌ Erro 3: Rating pelo Desejo
```
SITUAÇÃO: "Quero ver esse card de novo" → Again
          "Não quero ver tão cedo" → Easy

PROBLEMA: FSRS aprende padrões de desejo, não de memória
RESULTADO: Scheduling quebrado

SOLUÇÃO: Rate pela MEMÓRIA, não pelo desejo de revisão
```

### ❌ Erro 4: Inconsistência por Humor
```
SITUAÇÃO: Dia bom → ratings mais altos
          Dia ruim → ratings mais baixos

PROBLEMA: Ruído nos dados
RESULTADO: FSRS não consegue modelar sua memória

SOLUÇÃO: Critérios objetivos (tempo, correção), não subjetivos
```

---

## Cheat Sheet (Versão para Impressão)

```
╔══════════════════════════════════════════════════════════╗
║         GUIA RÁPIDO DE RATING - FSRS                     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🔴 AGAIN: Não lembrei OU errei                         ║
║            NUNCA use Hard para isso!                     ║
║                                                          ║
║  🟠 HARD:  Lembrei CORRETO mas demorei (>5 seg)         ║
║            Hesitei significativamente                    ║
║                                                          ║
║  🟢 GOOD:  Lembrei correto (2-5 seg)                    ║
║            Este é o PADRÃO - use mais                    ║
║                                                          ║
║  🔵 EASY:  Automático (<2 seg)                          ║
║            Use com moderação (~10%)                      ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  RESUMO: Errou? AGAIN. Acertou? Tempo decide.           ║
╚══════════════════════════════════════════════════════════╝
```

---

## Referências

- [FSRS4Anki Tutorial](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md)
- [How to Rate Cards](https://github.com/open-spaced-repetition/fsrs4anki/wiki/FAQ)
