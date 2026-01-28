# Guia de Configuração FSRS para Anatomia - Issue #238

> **Status**: ✅ Completo
> **Data**: 2026-01-27
> **Versão**: 1.0

## Configurações Recomendadas

### Configuração Principal (Copy-Paste Ready)

```
┌─────────────────────────────────────────────────────────────┐
│ FSRS Settings - Deck Terceiro Ventrículo                    │
├─────────────────────────────────────────────────────────────┤
│ ✓ Enable FSRS: ON                                           │
│                                                             │
│ Desired Retention: 0.90                                     │
│ (sweet spot médico - >0.93 aumenta reviews demais)          │
│                                                             │
│ Learning Steps: 10m, 30m                                    │
│ (CRÍTICO: completar no MESMO DIA!)                          │
│                                                             │
│ Re-learning Steps: 10m                                      │
│ (breve revisão após lapso)                                  │
│                                                             │
│ Maximum Interval: 365 dias                                  │
│ (conservador para residência/provas)                        │
│                                                             │
│ Graduating Interval: 1 dia                                  │
│ Easy Interval: 4 dias                                       │
│                                                             │
│ ⚠️ Reschedule on Change: OFF                                │
│ (manter OFF até acumular 400+ reviews)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Explicação de Cada Parâmetro

### 1. Enable FSRS
- **O que faz**: Ativa o algoritmo FSRS em vez do SM-2 padrão
- **Por que ON**: FSRS é 20-30% mais eficiente para mesma retenção
- **Onde**: Deck Options → Advanced/FSRS

### 2. Desired Retention (0.90)
- **O que faz**: Define a probabilidade alvo de lembrar um card
- **Por que 0.90**:
  - <0.85: Esquece demais, frustrante
  - 0.90: Sweet spot para medicina
  - >0.93: Reviews aumentam exponencialmente
- **Impacto**: +0.05 retention ≈ +40% reviews

### 3. Learning Steps (10m, 30m)
- **O que faz**: Intervalos para cards novos no primeiro dia
- **Por que curtos**:
  - FSRS precisa controlar intervalos longos
  - Steps >1h interferem na otimização
  - Devem ser completáveis no MESMO DIA
- **Anti-pattern**: ❌ 1d, 3d, 7d (muito longos)

### 4. Re-learning Steps (10m)
- **O que faz**: Intervalo após "Again" em card maduro
- **Por que curto**: Revisão rápida antes de re-graduar
- **Nota**: FSRS calcula o próximo intervalo automaticamente

### 5. Maximum Interval (365)
- **O que faz**: Limite máximo entre revisões
- **Por que 365**:
  - Conservador para ciclos de estudo anuais
  - Provas de residência têm ciclo ~1 ano
  - Pode aumentar para 3650 se muito confiante

### 6. Graduating Interval (1)
- **O que faz**: Primeiro intervalo após sair de "learning"
- **Por que 1**: FSRS ajusta rapidamente baseado em performance

### 7. Easy Interval (4)
- **O que faz**: Intervalo se marcar "Easy" durante learning
- **Por que 4**: Boost moderado para cards óbvios

### 8. Reschedule on Change (OFF)
- **O que faz**: Reagenda todos os cards quando muda configuração
- **Por que OFF inicialmente**:
  - Transição suave de SM-2
  - Evita shock de muitos reviews
  - Ligar após validar que FSRS funciona bem

---

## Processo de Setup no Anki

### Passo 1: Habilitar FSRS
```
1. Abrir Anki Desktop (24.04+ recomendado)
2. Tools → Preferences → Review → Enable FSRS (global)
   OU
   Deck Options → FSRS section → Enable
```

### Passo 2: Configurar Parâmetros
```
1. Clicar no deck → Options (engrenagem)
2. Seção "FSRS" ou "Advanced"
3. Inserir valores conforme tabela acima
4. Salvar
```

### Passo 3: Otimizar (após 400+ reviews)
```
1. Deck Options → FSRS → Optimize
2. Aguardar cálculo (~30s)
3. Verificar RMSE (target: <0.05)
4. Clicar "Apply"
```

### Passo 4: Avaliar
```
1. Deck Options → FSRS → Evaluate
2. Verificar métricas:
   - RMSE: quanto menor, melhor
   - Log Loss: quanto menor, melhor
3. Re-otimizar mensalmente
```

---

## Anti-Patterns a Evitar

### ❌ Learning Steps Longos
```
ERRADO: 10m, 1h, 1d, 3d
CERTO:  10m, 30m

Por quê: Steps >1 dia impedem FSRS de otimizar
```

### ❌ Retention Muito Alta
```
ERRADO: 0.97
CERTO:  0.90

Por quê: 0.97 = ~3x mais reviews que 0.90
```

### ❌ Usar Hard como Fail
```
ERRADO: Não lembrei → Hard
CERTO:  Não lembrei → Again

Por quê: FSRS aprende padrões errados
```

### ❌ Add-ons Incompatíveis
```
EVITAR:
- Ease factor modifiers
- Interval modifiers
- Custom scheduling add-ons

COMPATÍVEIS:
- Review analytics
- Heatmaps
- Statistics
```

### ❌ Muitos Cards Novos/Dia
```
ERRADO: 50+ new cards/day
CERTO:  10-20 new cards/day

Por quê: Backlog de reviews cresce exponencialmente
```

---

## Troubleshooting

### "Muitos reviews por dia"
1. Verificar desired retention (reduzir para 0.88)
2. Verificar new cards/day (reduzir para 10)
3. Verificar se não está usando Easy demais

### "Esquecendo cards maduros"
1. Verificar se está usando Again quando esquece
2. Aumentar desired retention (0.92)
3. Re-otimizar parâmetros

### "RMSE muito alto (>0.10)"
1. Acumular mais reviews (mínimo 400)
2. Verificar consistência de rating
3. Re-otimizar após 2 semanas

### "Intervalos parecem errados"
1. Confiar no algoritmo por 2 semanas
2. FSRS é contra-intuitivo inicialmente
3. Avaliar retention real, não intervalos

---

## Quando Re-otimizar

| Condição | Ação |
|----------|------|
| Primeiras 2 semanas | Não otimizar (poucos dados) |
| 400+ reviews acumulados | Primeira otimização |
| Cada 30 dias | Re-otimizar |
| 512+ novos reviews | Re-otimizar |
| Mudança de hábito de estudo | Re-otimizar após 2 semanas |

---

## Referências

- [FSRS4Anki Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- [FSRS Algorithm Paper](https://github.com/open-spaced-repetition/fsrs4anki#references)
- [Anki Forums - FSRS Med School](https://forums.ankiweb.net/t/fsrs-med-school-anki)

---

## Checklist de Verificação

Após importar o deck, verificar:

- [ ] FSRS está habilitado (Deck Options → FSRS toggle)
- [ ] Desired Retention = 0.90
- [ ] Learning steps = 10m, 30m
- [ ] Re-learning steps = 10m
- [ ] Maximum interval = 365
- [ ] Reschedule on Change = OFF
- [ ] New cards/day = 10-20
