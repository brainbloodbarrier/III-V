# Template de Image Occlusion Cards - Issue #241

> **Status**: ✅ Completo
> **Data**: 2026-01-28
> **Figuras mapeadas**: 24
> **Cards estimados**: 85

## Configuração do Add-on

### Instalação

1. Abrir Anki → Tools → Add-ons → Get Add-ons
2. Código: `1374772155` (Image Occlusion Enhanced)
3. Reiniciar Anki

### Configuração Recomendada

```json
{
  "mask_color": "#FF7F7F",
  "mask_fill_color": "#FFEBA2",
  "default_io_mode": "ao",
  "io_hotkey": "Ctrl+Shift+O",
  "hint_field": true
}
```

- **mask_color**: Vermelho claro para áreas ocultas
- **mask_fill_color**: Amarelo para realce
- **ao mode**: All-or-One (mostrar todas máscaras, testar uma)
- **hint_field**: Habilita campo de hint

---

## Workflow de Criação

### Passo 1: Preparar Imagem

```
┌─────────────────────────────────────────┐
│ 1. Abrir figura Rhoton em alta resolução│
│ 2. Recortar região relevante (se grande)│
│ 3. Ajustar contraste se necessário      │
│ 4. Salvar como PNG (preserva qualidade) │
└─────────────────────────────────────────┘
```

### Passo 2: Criar Oclusões

```
┌─────────────────────────────────────────┐
│ 1. Anki → Add → Image Occlusion        │
│ 2. Selecionar imagem preparada          │
│ 3. Desenhar retângulos sobre estruturas │
│ 4. Adicionar labels (nome da estrutura) │
│ 5. Preencher campos extras              │
└─────────────────────────────────────────┘
```

### Passo 3: Campos Padrão

| Campo | Conteúdo | Exemplo |
|-------|----------|---------|
| Header | Título da figura | "Teto do 3V - Vista Superior" |
| Extra 1 | Tag anatômica | `anatomia-teto` |
| Extra 2 | Mnemônico | "FSVIP" |
| Sources | Referência | "Rhoton Fig 4.1" |

---

## Templates por Figura

### Priority 1: Core Anatomy (9 figuras, ~38 cards)

#### Fig 4.1 - Teto do Terceiro Ventrículo

```yaml
title: "Teto do 3V - Vista Superior"
tags: [anatomia-teto, limites]
mnemonic: "FSVIP"
occlusions:
  - label: "Fórnice (corpo)"
    position: superior
    hint: "F de FSVIP - camada mais superior"

  - label: "Camada superior tela coroídea"
    position: below_fornix
    hint: "S de FSVIP"

  - label: "Velum interpositum"
    position: middle
    hint: "V de FSVIP - espaço triangular"

  - label: "Camada inferior tela coroídea"
    position: above_plexus
    hint: "I de FSVIP"

  - label: "Plexo coroide"
    position: inferior
    hint: "P de FSVIP - camada mais inferior"
```

#### Fig 4.8 - Assoalho do 3V

```yaml
title: "Assoalho do 3V - Vista Sagital"
tags: [anatomia-assoalho, limites]
mnemonic: "QPTCMP"
occlusions:
  - label: "Quiasma óptico"
    position: anterior
    hint: "Q de QPTCMP - mais anterior"

  - label: "Pedúnculo hipofisário"
    position: after_chiasm
    hint: "P de QPTCMP"

  - label: "Túber cinéreo"
    position: middle
    hint: "T de QPTCMP"

  - label: "Corpos mamilares"
    position: after_tuber
    hint: "C de QPTCMP"

  - label: "Substância perfurada posterior"
    position: before_tegmentum
    hint: "M (mesencéfalo adjacente)"

  - label: "Tegmento mesencefálico"
    position: posterior
    hint: "P de QPTCMP - mais posterior"
```

#### Fig 4.15 - Forame de Monro

```yaml
title: "Forame de Monro - Vista Superior"
tags: [forame-monro, limites]
mnemonic: "Colunas anterior, Tálamo posterior"
occlusions:
  - label: "Colunas do fórnice"
    position: anterior_margin
    hint: "Limite ANTERIOR do forame"
    difficulty: M

  - label: "Polo anterior do tálamo"
    position: posterior_margin
    hint: "Limite POSTERIOR do forame"
    difficulty: M

  - label: "Veia talamoestriada"
    position: in_groove
    hint: "Veia no sulco, vira medialmente"
    difficulty: D

  - label: "Genu da cápsula interna"
    position: lateral
    hint: "Única parte da cápsula na superfície"
    difficulty: D
```

---

### Priority 2: Vascular & Surgical (9 figuras, ~33 cards)

#### Fig 4.20 - VCI Formação

```yaml
title: "VCI - Formação e Trajeto"
tags: [vascular-veias]
mnemonic: "T+C → VCI"
occlusions:
  - label: "Veia talamoestriada"
    hint: "T do T+C"
    difficulty: M

  - label: "Veia coroidal superior"
    hint: "C do T+C"
    difficulty: M

  - label: "VCI"
    hint: "Resultado da união T+C"
    difficulty: M
```

#### Fig 4.40 - Abordagem Transchoroidal

```yaml
title: "Abordagem Transchoroidal"
tags: [cirurgico-abordagem]
mnemonic: "Trans = via fórnice"
occlusions:
  - label: "Fissura coroidal aberta"
    hint: "Fenda entre fórnice e tálamo"
    difficulty: D

  - label: "Tenia fornicis"
    hint: "Lado seguro para abertura"
    difficulty: D

  - label: "Velum interpositum exposto"
    hint: "Espaço revelado após abertura"
    difficulty: D
```

---

### Priority 3: Advanced (6 figuras, ~25 cards)

#### Fig 4.60 - Circuito de Papez

```yaml
title: "Circuito de Papez"
tags: [anatomia-circuitos]
mnemonic: "H-M-T-C-H"
occlusions:
  - label: "Hipocampo"
    hint: "H inicial - memória"
    difficulty: D

  - label: "Corpos mamilares"
    hint: "M - retransmissão"
    difficulty: D

  - label: "Tálamo anterior"
    hint: "T - segundo relé"
    difficulty: D

  - label: "Giro do cíngulo"
    hint: "C - emoção"
    difficulty: D
```

---

## Checklist de Criação

Para cada figura:

- [ ] Verificar licenciamento da imagem
- [ ] Preparar imagem (resolução, recorte)
- [ ] Criar oclusões seguindo template
- [ ] Adicionar hints para cards D
- [ ] Testar visualização em dispositivos
- [ ] Revisar labels e tags
- [ ] Exportar para deck

## Notas de Implementação

### Licenciamento

As figuras Rhoton podem ter restrições de uso. Alternativas:

1. **Uso educacional pessoal**: Geralmente permitido
2. **Compartilhamento**: Requer verificação
3. **Alternativa**: Criar diagramas esquemáticos próprios

### Qualidade de Imagem

```
Resolução mínima: 1024x768
Formato preferido: PNG (sem compressão)
Contraste: Alto para visibilidade das estruturas
Fundo: Neutro quando possível
```

### Integração com FSRS

Os cards de Image Occlusion são tratados como cards individuais pelo FSRS:

- Cada estrutura ocluída = 1 card
- Dificuldade inicial baseada no template
- Hints disponíveis para structures D

## Próximos Passos

1. ✅ Mapeamento de figuras (image-occlusion-map.json)
2. ✅ Template de criação (este documento)
3. ⏳ Criar cards para Priority 1 (manual)
4. ⏳ Criar cards para Priority 2 (manual)
5. ⏳ Criar cards para Priority 3 (manual)
6. ⏳ Integrar com deck principal
