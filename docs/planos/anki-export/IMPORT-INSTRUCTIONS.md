# Instruções de Importação - Deck Terceiro Ventrículo

> **Gerado em**: 2026-01-28T00:51:23.419Z
> **Total de cards**: 272
> **Preset recomendado**: 3V-Core

## Passo 1: Criar Note Type

1. Anki → Tools → Manage Note Types
2. Add → Clone: Basic
3. Renomear para: **FSRS-3V**
4. Fields → Configurar:
   - Pergunta
   - Resposta
   - Tags
   - Mnemônico
   - Dificuldade
   - Hint

5. Cards → Copiar templates de `note-type-templates.json`:
   - Front Template
   - Back Template
   - Styling (CSS)

## Passo 2: Configurar FSRS

1. Anki → Deck Options
2. FSRS → Enable FSRS: ✅
3. Desired Retention: **0.90** (ajustar por preset)
4. Learning Steps: **10m 30m**
5. Graduating Interval: **1 day**
6. Easy Interval: **4 days**

### Presets Disponíveis

| Preset | Retention | Cards/dia | Uso |
|--------|-----------|-----------|-----|
| 3V-Core | 0.90 | 15 | Anatomia geral |
| 3V-Vascular | 0.92 | 10 | Vascularização |
| 3V-Surgical | 0.93 | 8 | Abordagens cirúrgicas |
| 3V-Clinical | 0.88 | 5 | Casos clínicos |
| 3V-Reference | 0.85 | 20 | Abreviações |

## Passo 3: Importar Cards

1. Anki → File → Import
2. Selecionar: `terceiro-ventriculo-fsrs.txt`
3. Verificar configurações:
   - Type: FSRS-3V
   - Deck: III-V::Terceiro-Ventriculo
   - Fields mapped correctly
4. Import

## Passo 4: Verificar

1. Browse → deck:III-V::Terceiro-Ventriculo
2. Conferir total: **272 cards**
3. Distribuição por dificuldade:
   - Fácil (E): 49
   - Médio (M): 138
   - Difícil (D): 85

## Dicas de Uso

1. **Primeira semana**: Limite a 10-15 cards novos/dia
2. **Complete sessões**: Não pare no meio do review
3. **Rating consistente**: Use o guia de rating
4. **Otimize após 400 reviews**: FSRS → Optimize

## Suporte

- Issues: #244, #245, #246
- Guia de Rating: docs/planos/fsrs-analysis/rating-guide.md
- Troubleshooting: docs/planos/fsrs-analysis/rating-troubleshooting.md
