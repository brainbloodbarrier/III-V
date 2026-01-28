# Guia de Presets FSRS por Área Anatômica - Issue #239

> **Status**: ✅ Completo
> **Data**: 2026-01-27
> **Versão**: 1.0

## Conceito de Presets

Presets FSRS permitem configurações diferentes para grupos de cards com características distintas. No Anki, cada preset pode ter:
- Parâmetros FSRS otimizados separadamente
- Desired retention diferente
- Learning steps personalizados

---

## Presets Recomendados para o Deck 3V

### Preset 1: `3V-Core` (Anatomia Base)

```yaml
Nome: 3V-Core
Descrição: Base anatômica do terceiro ventrículo
Retenção Alvo: 0.90

Tags Incluídas:
  - anatomia-teto
  - anatomia-assoalho
  - anatomia-lateral
  - anatomia-anterior
  - anatomia-posterior
  - anatomia-recessos
  - anatomia-cisternas
  - anatomia-circuitos
  - anatomia-fornix
  - anatomia-ventriculo-lateral

Justificativa: Fundamento para todo o resto. 90% é suficiente
              pois será reforçado pelos cards clínicos.

Cards Estimados: ~100 cards
```

### Preset 2: `3V-Vascular` (Alto Risco Cirúrgico)

```yaml
Nome: 3V-Vascular
Descrição: Anatomia vascular - alto risco cirúrgico
Retenção Alvo: 0.92

Tags Incluídas:
  - vascular-veias
  - vascular-arterias
  - vascular-clinico

Justificativa: Erro vascular = risco de vida.
              2% extra de retenção vale o custo de reviews.

Cards Estimados: ~60 cards
```

### Preset 3: `3V-Surgical` (Aplicação Direta)

```yaml
Nome: 3V-Surgical
Descrição: Corredores e abordagens cirúrgicas
Retenção Alvo: 0.93

Tags Incluídas:
  - cirurgico-abordagem
  - cirurgico-endoscopia
  - cirurgico-hidrocefalia
  - forame-monro

Justificativa: Aplicação direta no centro cirúrgico.
              Máxima retenção para segurança do paciente.

Cards Estimados: ~45 cards
```

### Preset 4: `3V-Clinical` (Casos e Patologia)

```yaml
Nome: 3V-Clinical
Descrição: Patologias e casos clínicos integrados
Retenção Alvo: 0.88

Tags Incluídas:
  - patologia
  - cisto-coloide
  - pineal
  - aneurisma
  - herniacao
  - casos-integrados

Justificativa: Menos frequente, menor urgência de recall.
              Raciocínio clínico compensa retenção menor.

Cards Estimados: ~35 cards
```

### Preset 5: `3V-Reference` (Consulta Rápida)

```yaml
Nome: 3V-Reference
Descrição: Abreviações, mnemônicos, revisão rápida
Retenção Alvo: 0.85

Tags Incluídas:
  - abreviacoes
  - mnemonicos
  - revisao-rapida

Justificativa: Reconhecimento > recall profundo.
              85% suficiente para consulta de legendas.

Cards Estimados: ~35 cards
```

---

## Tabela Resumo

| Preset | Tags | Retention | Cards | Reviews/dia* |
|--------|------|-----------|-------|--------------|
| 3V-Core | anatomia-* | 0.90 | ~100 | ~15 |
| 3V-Vascular | vascular-* | 0.92 | ~60 | ~12 |
| 3V-Surgical | cirurgico-*, forame-monro | 0.93 | ~45 | ~10 |
| 3V-Clinical | patologia, casos-* | 0.88 | ~35 | ~4 |
| 3V-Reference | abreviacoes, mnemonicos | 0.85 | ~35 | ~3 |

*Estimativa após cards maduros (30+ dias)

---

## Implementação no Anki

### Opção A: Subdecks (Recomendado)

```
III-V :: Terceiro Ventrículo
├── 01-Core (preset: 3V-Core)
├── 02-Vascular (preset: 3V-Vascular)
├── 03-Surgical (preset: 3V-Surgical)
├── 04-Clinical (preset: 3V-Clinical)
└── 05-Reference (preset: 3V-Reference)
```

**Como criar:**
1. Deck Options → Manage Presets → Add
2. Criar 5 presets com configurações acima
3. Criar subdecks e associar preset a cada um
4. Mover cards por tag para subdecks

### Opção B: Filtered Decks (Avançado)

```
# Filtered deck para cada preset
deck:3V tag:vascular-*    → 3V-Vascular-Filtered
deck:3V tag:cirurgico-*   → 3V-Surgical-Filtered
```

**Vantagem**: Não precisa mover cards
**Desvantagem**: Mais complexo de gerenciar

### Opção C: Single Deck (Simples)

Usar preset único `3V-Default` com retention 0.90.

**Quando usar**:
- Início (poucos dados para otimizar)
- Se não quiser gerenciar múltiplos presets

---

## Criação de Presets no Anki

### Passo a Passo

```
1. Abrir Anki → Selecionar deck
2. Clicar em Options (engrenagem)
3. No topo, clicar no nome do preset → "Manage Presets"
4. Clicar "Add"
5. Nomear preset (ex: "3V-Vascular")
6. Configurar:
   - FSRS → Enable: ON
   - Desired Retention: 0.92
   - Learning Steps: 10m 30m
   - Re-learning: 10m
   - Max Interval: 365
7. Salvar
8. Repetir para cada preset
```

### Associar Preset a Subdeck

```
1. Selecionar subdeck
2. Options → No topo, selecionar preset correto
3. Confirmar "Save to All Subdecks": NÃO
```

---

## Mapeamento Tag → Preset

### Script de Movimentação (PowerShell/Bash)

```bash
# No Anki Browser, usar Find and Replace ou Add-on "Tag Manager"

# Mover cards por tag:
# Browse → tag:vascular-* → Select All → Change Deck → 3V::02-Vascular
```

### Mapeamento Completo

| Tag Pattern | Subdeck | Preset |
|-------------|---------|--------|
| `anatomia-*` | 01-Core | 3V-Core |
| `limites` (sem outro) | 01-Core | 3V-Core |
| `vascular-*` | 02-Vascular | 3V-Vascular |
| `cirurgico-*` | 03-Surgical | 3V-Surgical |
| `forame-monro` | 03-Surgical | 3V-Surgical |
| `patologia` | 04-Clinical | 3V-Clinical |
| `casos-*` | 04-Clinical | 3V-Clinical |
| `abreviacoes` | 05-Reference | 3V-Reference |
| `mnemonicos` | 05-Reference | 3V-Reference |
| `revisao-rapida` | 05-Reference | 3V-Reference |

---

## Quando Usar Presets Diferentes

### Cenário 1: Pré-Prova de Residência
```
Aumentar retention temporariamente:
- 3V-Surgical: 0.93 → 0.95
- 3V-Vascular: 0.92 → 0.94

Nota: Mais reviews, mas maior segurança
```

### Cenário 2: Manutenção Pós-Prova
```
Reduzir retention para sustentabilidade:
- 3V-Reference: 0.85 → 0.80
- 3V-Clinical: 0.88 → 0.85

Nota: Menos reviews diários
```

### Cenário 3: Foco em Área Específica
```
Usar Custom Study → Increase today's new card limit
apenas no subdeck relevante.
```

---

## Otimização por Preset

Após acumular 400+ reviews POR PRESET, otimizar cada um separadamente:

```
1. Selecionar subdeck
2. Deck Options → FSRS → Optimize
3. Verificar RMSE (target <0.05)
4. Repetir para cada preset
```

**Frequência**: Mensal ou após mudança significativa de estudo.

---

## Checklist de Implementação

- [ ] Criar 5 presets no Anki
- [ ] Criar estrutura de subdecks
- [ ] Mover cards por tag
- [ ] Verificar contagem por subdeck
- [ ] Testar uma sessão de review
- [ ] Agendar re-otimização mensal
