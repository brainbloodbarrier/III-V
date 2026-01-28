/**
 * FSRS Card Schema for Third Ventricle Deck
 * Issue #244 - Create TypeScript schema for FSRS cards
 *
 * This schema defines the structure for cards optimized for FSRS scheduling,
 * including all fields needed for Anki export with proper FSRS configuration.
 */

import { z } from 'zod';

// Difficulty levels based on classification script
export const DifficultySchema = z.enum(['E', 'M', 'D']);
export type Difficulty = z.infer<typeof DifficultySchema>;

// Tag categories for filtering and presets
export const TagCategorySchema = z.enum([
  'anatomia-teto',
  'anatomia-assoalho',
  'anatomia-lateral',
  'anatomia-anterior',
  'anatomia-posterior',
  'anatomia-recessos',
  'anatomia-quiasma',
  'anatomia-circuitos',
  'anatomia-cisternas',
  'forame-monro',
  'vascular-arterias',
  'vascular-veias',
  'vascular-clinico',
  'cirurgico-abordagem',
  'cirurgico-endoscopia',
  'clinico',
  'patologia',
  'casos-integrados',
  'herniacao',
  'aneurisma',
  'variacao',
  'limites',
  'fissura',
  'transchoroidal',
  'interforniceal',
  'translaminar',
  'plexo',
  'velum',
  'abreviacoes',
  'mnemonicos',
  'revisao-rapida',
  'atomizado',
  'caloso',
  'veias',
]);
export type TagCategory = z.infer<typeof TagCategorySchema>;

// FSRS Card Schema
export const FSRSCardSchema = z.object({
  // Core content
  pergunta: z.string().min(1, 'Pergunta é obrigatória'),
  resposta: z.string().min(1, 'Resposta é obrigatória'),

  // Metadata
  tags: z.string().describe('Comma-separated tags'),
  mnemonico: z.string().optional().default(''),

  // FSRS-specific fields
  dificuldade: DifficultySchema,
  hint: z.string().optional().default(''),

  // Anki-specific fields (optional, set during export)
  deckName: z.string().optional(),
  noteType: z.string().optional().default('FSRS-3V'),
  guid: z.string().optional(),
});

export type FSRSCard = z.infer<typeof FSRSCardSchema>;

// Anki Note Type Configuration
export const AnkiNoteTypeSchema = z.object({
  name: z.literal('FSRS-3V'),
  fields: z.tuple([
    z.literal('Pergunta'),
    z.literal('Resposta'),
    z.literal('Tags'),
    z.literal('Mnemônico'),
    z.literal('Dificuldade'),
    z.literal('Hint'),
  ]),
  templates: z.array(
    z.object({
      name: z.string(),
      qfmt: z.string(),
      afmt: z.string(),
    })
  ),
  css: z.string(),
});

export type AnkiNoteType = z.infer<typeof AnkiNoteTypeSchema>;

// FSRS Preset Configuration
export const FSRSPresetSchema = z.object({
  name: z.string(),
  desiredRetention: z.number().min(0.7).max(0.99),
  learningSteps: z.array(z.string()),
  graduatingInterval: z.number().positive(),
  easyInterval: z.number().positive(),
  maximumInterval: z.number().positive(),
  newCardsPerDay: z.number().nonnegative(),
  maximumReviewsPerDay: z.number().positive(),
  fsrsEnabled: z.literal(true),
  description: z.string().optional(),
});

export type FSRSPreset = z.infer<typeof FSRSPresetSchema>;

// Default FSRS Presets for Third Ventricle Deck
export const DEFAULT_PRESETS: Record<string, FSRSPreset> = {
  '3V-Core': {
    name: '3V-Core',
    desiredRetention: 0.9,
    learningSteps: ['10m', '30m'],
    graduatingInterval: 1,
    easyInterval: 4,
    maximumInterval: 180,
    newCardsPerDay: 15,
    maximumReviewsPerDay: 100,
    fsrsEnabled: true,
    description: 'Anatomia básica do 3V - equilibrado',
  },
  '3V-Vascular': {
    name: '3V-Vascular',
    desiredRetention: 0.92,
    learningSteps: ['10m', '30m', '1d'],
    graduatingInterval: 2,
    easyInterval: 5,
    maximumInterval: 180,
    newCardsPerDay: 10,
    maximumReviewsPerDay: 80,
    fsrsEnabled: true,
    description: 'Vascularização - retenção maior',
  },
  '3V-Surgical': {
    name: '3V-Surgical',
    desiredRetention: 0.93,
    learningSteps: ['10m', '30m', '1d'],
    graduatingInterval: 2,
    easyInterval: 5,
    maximumInterval: 150,
    newCardsPerDay: 8,
    maximumReviewsPerDay: 60,
    fsrsEnabled: true,
    description: 'Abordagens cirúrgicas - alta retenção',
  },
  '3V-Clinical': {
    name: '3V-Clinical',
    desiredRetention: 0.88,
    learningSteps: ['15m', '1h'],
    graduatingInterval: 1,
    easyInterval: 3,
    maximumInterval: 120,
    newCardsPerDay: 5,
    maximumReviewsPerDay: 50,
    fsrsEnabled: true,
    description: 'Casos clínicos - espaçamento maior',
  },
  '3V-Reference': {
    name: '3V-Reference',
    desiredRetention: 0.85,
    learningSteps: ['30m'],
    graduatingInterval: 3,
    easyInterval: 7,
    maximumInterval: 365,
    newCardsPerDay: 20,
    maximumReviewsPerDay: 150,
    fsrsEnabled: true,
    description: 'Abreviações e referências - manutenção leve',
  },
};

// Deck Configuration
export const DeckConfigSchema = z.object({
  deckName: z.string(),
  noteTypeName: z.string().default('FSRS-3V'),
  preset: z.string(),
  totalCards: z.number(),
  byDifficulty: z.object({
    E: z.number(),
    M: z.number(),
    D: z.number(),
  }),
  exportDate: z.string(),
});

export type DeckConfig = z.infer<typeof DeckConfigSchema>;

// Export Format Schema
export const AnkiExportSchema = z.object({
  config: DeckConfigSchema,
  noteType: AnkiNoteTypeSchema,
  cards: z.array(FSRSCardSchema),
});

export type AnkiExport = z.infer<typeof AnkiExportSchema>;

// Utility function to validate a card
export function validateCard(card: unknown): FSRSCard {
  return FSRSCardSchema.parse(card);
}

// Utility function to validate multiple cards
export function validateCards(cards: unknown[]): FSRSCard[] {
  return cards.map((card, index) => {
    try {
      return FSRSCardSchema.parse(card);
    } catch (error) {
      throw new Error(`Card ${index + 1} inválido: ${error}`);
    }
  });
}

// Get preset by tag analysis
export function getPresetForCard(tags: string): string {
  const tagsLower = tags.toLowerCase();

  if (tagsLower.includes('cirurgico-')) return '3V-Surgical';
  if (tagsLower.includes('clinico') || tagsLower.includes('casos-integrados')) return '3V-Clinical';
  if (tagsLower.includes('vascular-')) return '3V-Vascular';
  if (tagsLower.includes('abreviacoes') || tagsLower.includes('mnemonicos')) return '3V-Reference';

  return '3V-Core';
}
