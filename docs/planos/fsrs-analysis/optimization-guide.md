# Guia de Otimização Contínua FSRS - Issue #247

> **Status**: ✅ Completo
> **Data**: 2026-01-28
> **Deck**: III-V::Terceiro-Ventriculo

## Visão Geral

Este guia estabelece o processo de otimização contínua do FSRS para o deck de Terceiro Ventrículo, incluindo métricas a monitorar, cronograma de otimização e troubleshooting.

---

## Métricas Chave

### 1. Retenção Real vs Target

```
┌─────────────────────────────────────────────────────────────┐
│ MÉTRICA: True Retention                                     │
│                                                             │
│ ONDE ENCONTRAR:                                             │
│ Anki → Stats → True Retention (FSRS)                        │
│                                                             │
│ ALVO: 90% (±2%)                                             │
│                                                             │
│ INTERPRETAÇÃO:                                              │
│ • <88%: Aumentar desired retention ou revisar rating        │
│ • 88-92%: Saudável, manter configuração                     │
│ • >92%: Pode reduzir retention para otimizar tempo          │
│                                                             │
│ AÇÃO SE FORA DO ALVO:                                       │
│ 1. Verificar distribuição de ratings                        │
│ 2. Ajustar desired retention em ±0.02                       │
│ 3. Re-otimizar após 2 semanas                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. RMSE (Root Mean Square Error)

```
┌─────────────────────────────────────────────────────────────┐
│ MÉTRICA: RMSE                                               │
│                                                             │
│ ONDE ENCONTRAR:                                             │
│ Deck Options → FSRS → Evaluate                              │
│                                                             │
│ INTERPRETAÇÃO:                                              │
│ • <0.05: Excelente - modelo altamente preciso               │
│ • 0.05-0.08: Bom - modelo funcional                         │
│ • 0.08-0.10: Aceitável - pode melhorar                      │
│ • >0.10: Ruim - revisar rating ou dados insuficientes       │
│                                                             │
│ FATORES QUE AUMENTAM RMSE:                                  │
│ • Poucos reviews (<400)                                     │
│ • Rating inconsistente                                      │
│ • Mudança brusca de hábitos                                 │
│ • Cards mal formulados                                      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Distribuição de Ratings

```
┌─────────────────────────────────────────────────────────────┐
│ MÉTRICA: Answer Buttons Distribution                        │
│                                                             │
│ ONDE ENCONTRAR:                                             │
│ Anki → Stats → Answer Buttons                               │
│                                                             │
│ DISTRIBUIÇÃO SAUDÁVEL:                                      │
│ Again: 10-15%  ████░░░░░░░░░░░░░░░░                         │
│ Hard:  15-20%  ███████░░░░░░░░░░░░░                         │
│ Good:  60-70%  █████████████████████                        │
│ Easy:  10-15%  ████░░░░░░░░░░░░░░░░                         │
│                                                             │
│ SINAIS DE PROBLEMA:                                         │
│ • Again >25%: Cards difíceis demais ou rating errado        │
│ • Easy >25%: Inflação de rating                             │
│ • Good <50%: Rating extremo demais                          │
└─────────────────────────────────────────────────────────────┘
```

### 4. Carga de Reviews

```
┌─────────────────────────────────────────────────────────────┐
│ MÉTRICA: Reviews por Dia                                    │
│                                                             │
│ ONDE ENCONTRAR:                                             │
│ Anki → Stats → Reviews (gráfico diário)                     │
│                                                             │
│ ALVOS POR FASE:                                             │
│ Semana 1-2:  20-40 reviews/dia (ramp up)                    │
│ Semana 3-4:  40-80 reviews/dia (estabilização)              │
│ Mês 2+:      50-100 reviews/dia (manutenção)                │
│                                                             │
│ SE CARGA EXCESSIVA (>150/dia):                              │
│ 1. Reduzir new cards/day                                    │
│ 2. Verificar desired retention (pode estar muito alto)      │
│ 3. Considerar suspender cards menos prioritários            │
└─────────────────────────────────────────────────────────────┘
```

---

## Cronograma de Otimização

### Semana 1: Baseline

```
┌─────────────────────────────────────────────────────────────┐
│ DIA 1-3: Setup inicial                                      │
│ • Importar deck                                             │
│ • Configurar FSRS com preset 3V-Core                        │
│ • Estudar máximo 15 cards novos/dia                         │
│                                                             │
│ DIA 4-7: Calibração                                         │
│ • Manter rating consistente (usar guia)                     │
│ • Não otimizar ainda (dados insuficientes)                  │
│ • Anotar dificuldades percebidas                            │
│                                                             │
│ CHECKPOINT SEMANA 1:                                        │
│ □ True retention próxima de 90%?                            │
│ □ Distribuição de ratings saudável?                         │
│ □ Carga de reviews tolerável?                               │
└─────────────────────────────────────────────────────────────┘
```

### Semana 2-4: Estabilização

```
┌─────────────────────────────────────────────────────────────┐
│ AÇÕES SEMANAIS:                                             │
│ • Manter ritmo de estudos                                   │
│ • Verificar stats no fim de cada semana                     │
│ • Ajustar new cards/day se necessário                       │
│                                                             │
│ CHECKPOINT SEMANA 4 (mínimo 400 reviews):                   │
│ □ Executar primeira otimização FSRS                         │
│ □ Anotar RMSE e true retention                              │
│ □ Comparar com baseline                                     │
└─────────────────────────────────────────────────────────────┘
```

### Mês 2+: Manutenção

```
┌─────────────────────────────────────────────────────────────┐
│ FREQUÊNCIA DE OTIMIZAÇÃO:                                   │
│ • A cada 2-4 semanas                                        │
│ • Após mudanças significativas de hábito                    │
│ • Quando true retention desviar >3% do target               │
│                                                             │
│ MÉTRICAS A REGISTRAR:                                       │
│ Data | Reviews Total | True Ret | RMSE | Notas              │
│                                                             │
│ AÇÕES DE MANUTENÇÃO:                                        │
│ • Revisar cards com lapse rate alto                         │
│ • Considerar atomizar cards problemáticos                   │
│ • Ajustar presets se área específica está difícil           │
└─────────────────────────────────────────────────────────────┘
```

---

## Processo de Otimização

### Passo 1: Avaliar Estado Atual

```bash
# No Anki, verificar:
1. Stats → True Retention
2. Deck Options → FSRS → Evaluate
3. Stats → Answer Buttons
```

### Passo 2: Decidir se Otimizar

```
┌─────────────────────────────────────────────────────────────┐
│ OTIMIZAR SE:                                                │
│ ✅ Tem 400+ reviews no deck                                 │
│ ✅ RMSE >0.08 (modelo pode melhorar)                        │
│ ✅ True retention desviou >3% do target                     │
│ ✅ Passou 2+ semanas desde última otimização                │
│                                                             │
│ NÃO OTIMIZAR SE:                                            │
│ ❌ <400 reviews (dados insuficientes)                       │
│ ❌ Mudou hábitos de rating recentemente                     │
│ ❌ RMSE já está <0.05 e retention está no alvo              │
└─────────────────────────────────────────────────────────────┘
```

### Passo 3: Executar Otimização

```
1. Anki → Deck Options
2. FSRS → Optimize
3. Aguardar (pode levar alguns minutos)
4. Anotar novos valores:
   - RMSE antes/depois
   - Parâmetros otimizados
```

### Passo 4: Validar Resultado

```
┌─────────────────────────────────────────────────────────────┐
│ APÓS OTIMIZAÇÃO, VERIFICAR:                                 │
│                                                             │
│ 1. RMSE diminuiu? (esperado: -0.01 a -0.03)                 │
│ 2. Parâmetros fazem sentido?                                │
│    - initial stability: 0.1-1.0 (não muito baixo)           │
│    - difficulty weight: ~1.0 (não extremo)                  │
│ 3. Intervalos previstos são razoáveis?                      │
│    - Good em card novo: 1-4 dias                            │
│    - Good em card maduro: 7-90 dias                         │
│                                                             │
│ SE ALGO PARECER ERRADO:                                     │
│ • Não reverter imediatamente                                │
│ • Usar por 1 semana e observar                              │
│ • Se retention cair muito, considerar reset                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Log de Otimização

Use esta tabela para registrar cada otimização:

| Data | Reviews | True Ret | RMSE | Ação | Notas |
|------|---------|----------|------|------|-------|
| 2026-01-28 | 0 | - | - | Setup inicial | Preset 3V-Core |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

---

## Troubleshooting Rápido

### "RMSE não diminui após otimização"

```
CAUSAS POSSÍVEIS:
1. Poucos reviews → esperar mais
2. Rating muito inconsistente → revisar guia
3. Já está otimizado → RMSE ~0.05 é o limite

SOLUÇÃO:
- Garantir consistência de rating por 2 semanas
- Re-otimizar apenas se RMSE >0.08
```

### "True retention muito baixa (<85%)"

```
CAUSAS POSSÍVEIS:
1. Desired retention mal configurado
2. Cards muito difíceis
3. Usando Easy demais (intervalos longos)

SOLUÇÃO:
1. Aumentar desired retention em 0.02
2. Revisar cards com alto lapse rate
3. Usar menos Easy, mais Good
```

### "Carga de reviews explosiva"

```
CAUSAS POSSÍVEIS:
1. Muitos new cards/day
2. Retention muito alta (>0.93)
3. Backlog acumulado

SOLUÇÃO:
1. Reduzir new cards para 5-10/dia
2. Baixar retention para 0.88-0.90
3. Usar "Custom Study" para limpar backlog
```

---

## Presets por Área - Ajustes Finos

### Se área específica está difícil

| Área | Sinal | Ajuste |
|------|-------|--------|
| Anatomia | Retention <85% | Aumentar para 0.92 |
| Vascular | Muitos lapsos | Adicionar step 1d |
| Cirúrgico | Esquecendo | Aumentar para 0.95 |
| Clínico | Fácil demais | Reduzir para 0.85 |
| Referência | Carga alta | Aumentar interval max |

---

## Integração com Workflow de Estudo

### Rotina Recomendada

```
DIÁRIO:
• Completar reviews pendentes
• Estudar new cards (limite configurado)
• Não parar no meio da sessão

SEMANAL:
• Verificar stats (5 min)
• Anotar true retention
• Ajustar new cards/day se necessário

MENSAL:
• Avaliar se precisa otimizar
• Revisar cards problemáticos
• Atualizar log de otimização
```

---

## Checklist Final

Antes de considerar o deck "otimizado":

- [ ] 400+ reviews acumulados
- [ ] RMSE <0.08
- [ ] True retention 88-92%
- [ ] Distribuição de ratings saudável
- [ ] Carga diária sustentável
- [ ] Log de otimização iniciado
- [ ] Cronograma de manutenção definido

---

## Recursos Adicionais

- Guia de Rating: `docs/planos/fsrs-analysis/rating-guide.md`
- Troubleshooting: `docs/planos/fsrs-analysis/rating-troubleshooting.md`
- Presets: `docs/planos/fsrs-analysis/presets-guide.md`
- FSRS Wiki: https://github.com/open-spaced-repetition/fsrs4anki/wiki
