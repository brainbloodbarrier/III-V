import { describe, test, expect } from 'bun:test';
import {
  DifficultySchema,
  FSRSCardSchema,
  FSRSPresetSchema,
  validateCard,
  validateCards,
  getPresetForCard,
  DEFAULT_PRESETS,
} from '../../../src/anki-export/types/fsrs-card';

describe('fsrs-card types', () => {
  describe('DifficultySchema', () => {
    test('accepts valid difficulty values', () => {
      expect(DifficultySchema.parse('E')).toBe('E');
      expect(DifficultySchema.parse('M')).toBe('M');
      expect(DifficultySchema.parse('D')).toBe('D');
    });

    test('rejects invalid difficulty values', () => {
      expect(() => DifficultySchema.parse('X')).toThrow();
      expect(() => DifficultySchema.parse('')).toThrow();
      expect(() => DifficultySchema.parse('easy')).toThrow();
    });
  });

  describe('FSRSCardSchema', () => {
    const validCard = {
      pergunta: 'O que e X?',
      resposta: 'X e Y',
      tags: 'anatomia',
      dificuldade: 'M' as const,
    };

    test('accepts valid card', () => {
      const result = FSRSCardSchema.safeParse(validCard);
      expect(result.success).toBe(true);
    });

    test('requires pergunta', () => {
      const result = FSRSCardSchema.safeParse({ ...validCard, pergunta: '' });
      expect(result.success).toBe(false);
    });

    test('requires resposta', () => {
      const result = FSRSCardSchema.safeParse({ ...validCard, resposta: '' });
      expect(result.success).toBe(false);
    });

    test('requires valid dificuldade', () => {
      const result = FSRSCardSchema.safeParse({ ...validCard, dificuldade: 'X' });
      expect(result.success).toBe(false);
    });

    test('sets default values for optional fields', () => {
      const result = FSRSCardSchema.parse(validCard);
      expect(result.mnemonico).toBe('');
      expect(result.hint).toBe('');
      expect(result.noteType).toBe('FSRS-3V');
    });

    test('accepts optional fields', () => {
      const cardWithOptionals = {
        ...validCard,
        mnemonico: 'ABC',
        hint: 'Pense em X',
        deckName: 'Test Deck',
      };
      const result = FSRSCardSchema.parse(cardWithOptionals);
      expect(result.mnemonico).toBe('ABC');
      expect(result.hint).toBe('Pense em X');
      expect(result.deckName).toBe('Test Deck');
    });
  });

  describe('FSRSPresetSchema', () => {
    test('validates DEFAULT_PRESETS', () => {
      for (const [name, preset] of Object.entries(DEFAULT_PRESETS)) {
        const result = FSRSPresetSchema.safeParse(preset);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(name);
        }
      }
    });

    test('requires desiredRetention between 0.7 and 0.99', () => {
      const base = DEFAULT_PRESETS['3V-Core'];

      const tooLow = FSRSPresetSchema.safeParse({ ...base, desiredRetention: 0.5 });
      expect(tooLow.success).toBe(false);

      const tooHigh = FSRSPresetSchema.safeParse({ ...base, desiredRetention: 1.0 });
      expect(tooHigh.success).toBe(false);

      const valid = FSRSPresetSchema.safeParse({ ...base, desiredRetention: 0.85 });
      expect(valid.success).toBe(true);
    });

    test('requires fsrsEnabled to be true', () => {
      const base = DEFAULT_PRESETS['3V-Core'];
      const result = FSRSPresetSchema.safeParse({ ...base, fsrsEnabled: false });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCard', () => {
    test('returns validated card for valid input', () => {
      const card = {
        pergunta: 'Test?',
        resposta: 'Answer',
        tags: 'test',
        dificuldade: 'E' as const,
      };
      const result = validateCard(card);
      expect(result.pergunta).toBe('Test?');
      expect(result.dificuldade).toBe('E');
    });

    test('throws for invalid input', () => {
      expect(() => validateCard({ pergunta: '' })).toThrow();
    });
  });

  describe('validateCards', () => {
    test('validates array of cards', () => {
      const cards = [
        { pergunta: 'Q1?', resposta: 'A1', tags: 'a', dificuldade: 'E' as const },
        { pergunta: 'Q2?', resposta: 'A2', tags: 'b', dificuldade: 'M' as const },
      ];
      const result = validateCards(cards);
      expect(result).toHaveLength(2);
    });

    test('throws with card index on invalid card', () => {
      const cards = [
        { pergunta: 'Q1?', resposta: 'A1', tags: 'a', dificuldade: 'E' as const },
        { pergunta: '', resposta: 'A2', tags: 'b', dificuldade: 'M' as const },
      ];
      expect(() => validateCards(cards)).toThrow(/Card 2/);
    });
  });

  describe('getPresetForCard', () => {
    test('returns 3V-Surgical for cirurgico tags', () => {
      expect(getPresetForCard('cirurgico-abordagem')).toBe('3V-Surgical');
      expect(getPresetForCard('cirurgico-endoscopia')).toBe('3V-Surgical');
    });

    test('returns 3V-Clinical for clinico tags', () => {
      expect(getPresetForCard('clinico')).toBe('3V-Clinical');
      expect(getPresetForCard('casos-integrados')).toBe('3V-Clinical');
    });

    test('returns 3V-Vascular for vascular tags', () => {
      expect(getPresetForCard('vascular-arterias')).toBe('3V-Vascular');
      expect(getPresetForCard('vascular-veias')).toBe('3V-Vascular');
    });

    test('returns 3V-Reference for reference tags', () => {
      expect(getPresetForCard('abreviacoes')).toBe('3V-Reference');
      expect(getPresetForCard('mnemonicos')).toBe('3V-Reference');
    });

    test('returns 3V-Core for anatomia tags', () => {
      expect(getPresetForCard('anatomia-teto')).toBe('3V-Core');
      expect(getPresetForCard('anatomia-assoalho')).toBe('3V-Core');
    });

    test('returns 3V-Core as default', () => {
      expect(getPresetForCard('unknown')).toBe('3V-Core');
      expect(getPresetForCard('')).toBe('3V-Core');
    });

    test('is case insensitive', () => {
      expect(getPresetForCard('CIRURGICO-ABORDAGEM')).toBe('3V-Surgical');
      expect(getPresetForCard('Clinico')).toBe('3V-Clinical');
    });
  });
});
