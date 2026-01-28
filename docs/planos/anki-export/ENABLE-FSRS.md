# Habilitar FSRS no Anki - Guia Rápido

> ⏱️ Tempo estimado: 2 minutos

## Status Atual

✅ Anki instalado
✅ AnkiConnect funcionando
✅ Note Type "FSRS-3V" criado
✅ Deck "III-V::Terceiro-Ventriculo" criado
✅ 272 cards importados
⏳ **FSRS precisa ser habilitado manualmente**

---

## Passo a Passo

### 1. Abrir Deck Options

```
┌─────────────────────────────────────────────────────────────┐
│ Na tela principal do Anki:                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Decks                                                   │ │
│ │ ├── III-V                                               │ │
│ │ │   └── Terceiro-Ventriculo  [⚙️] ← CLIQUE AQUI        │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Ou: selecione o deck → clique em "Options" na barra        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Habilitar FSRS

```
┌─────────────────────────────────────────────────────────────┐
│ Deck Options                                                │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Daily limits                                            │ │
│ │   New cards/day: [15]                                   │ │
│ │   Maximum reviews/day: [200]                            │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │                                                         │ │
│ │ FSRS                                                    │ │
│ │   [✅] Enable FSRS  ← MARCAR ESTA OPÇÃO                 │ │
│ │                                                         │ │
│ │   Desired retention: [0.90] ← CONFIGURAR PARA 0.90     │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3. Configurar Learning Steps

```
┌─────────────────────────────────────────────────────────────┐
│ Na seção "New cards":                                       │
│                                                             │
│   Learning steps: [10m 30m] ← CONFIGURAR ESTES VALORES     │
│   Graduating interval: [1]                                  │
│   Easy interval: [4]                                        │
└─────────────────────────────────────────────────────────────┘
```

### 4. Salvar

Clique em **Save** para aplicar as configurações.

---

## Configurações Recomendadas

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| New cards/day | 15 | Sustentável para iniciantes |
| Maximum reviews | 200 | Evita sobrecarga |
| Enable FSRS | ✅ | Algoritmo otimizado |
| Desired retention | 0.90 | 90% de retenção |
| Learning steps | 10m 30m | Consolidação inicial |
| Graduating interval | 1 | Primeiro review no dia seguinte |
| Easy interval | 4 | Para cards muito fáceis |

---

## Verificação

Após salvar, confirme que:

1. O ícone FSRS aparece nas opções do deck
2. Ao estudar, os intervalos mostrados fazem sentido (1d, 3d, 7d, etc.)
3. O botão "Optimize" está disponível (será útil após 400 reviews)

---

## Pronto para Estudar!

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🎓 Seu deck está pronto!                                  │
│                                                             │
│   • 272 cards sobre Terceiro Ventrículo                     │
│   • Hints disponíveis para cards difíceis (D)               │
│   • Mnemônicos visuais em cada card                         │
│   • Dificuldade classificada (E/M/D)                        │
│                                                             │
│   Clique em "Study Now" para começar!                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

**FSRS não aparece nas opções?**
- Verifique se está usando Anki 23.10+ (versão com FSRS nativo)
- Atualize o Anki se necessário: https://apps.ankiweb.net/

**Cards não aparecem no deck?**
- Vá em Browse → deck:III-V::Terceiro-Ventriculo
- Confirme que há 272 cards listados

**Erro ao estudar?**
- Verifique se o Note Type "FSRS-3V" existe em Tools → Manage Note Types
