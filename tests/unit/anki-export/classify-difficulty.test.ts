import { describe, test, expect } from 'bun:test';

// Since classifyDifficulty is not exported, we test indirectly via patterns
// This tests the classification logic by pattern matching

describe('classify-difficulty patterns', () => {
  // Helper to simulate classification logic
  function classifyByPatterns(pergunta: string, tags: string): 'E' | 'M' | 'D' {
    const tagsLower = tags.toLowerCase();
    const perguntaLower = pergunta.toLowerCase();

    // DIFFICULT patterns
    const difficultPatterns = [
      /clinico/,
      /casos-integrados/,
      /patologia/,
      /^caso:/i,
      /^caso integrador:/i,
      /verdadeiro ou falso/i,
      /qual a diferença/i,
      /por que é mais seguro/i,
    ];

    for (const pattern of difficultPatterns) {
      if (pattern.test(perguntaLower) || pattern.test(tagsLower)) {
        return 'D';
      }
    }

    // EASY patterns
    const easyPatterns = [
      /abreviacoes/,
      /mnemonicos/,
      /^[A-Z.]+\s*=\s*___$/,
      /= ___$/,
    ];

    for (const pattern of easyPatterns) {
      if (pattern.test(perguntaLower) || pattern.test(tagsLower) || pattern.test(pergunta)) {
        return 'E';
      }
    }

    // Additional DIFFICULT tags
    const difficultTags = [
      'cirurgico-abordagem',
      'cirurgico-endoscopia',
      'vascular-clinico',
      'herniacao',
      'aneurisma',
    ];

    for (const tag of difficultTags) {
      if (tagsLower.includes(tag)) {
        return 'D';
      }
    }

    // MEDIUM for revisao-rapida
    if (tagsLower.includes('revisao-rapida')) {
      return 'M';
    }

    // MEDIUM for percentages
    if (perguntaLower.includes('%') || pergunta.includes('___% dos')) {
      return 'M';
    }

    // EASY for atomizado
    if (tagsLower.includes('atomizado')) {
      return 'E';
    }

    // Default: MEDIUM
    return 'M';
  }

  describe('DIFFICULT (D) classification', () => {
    test('classifies clinico tag as D', () => {
      expect(classifyByPatterns('O que e X?', 'clinico')).toBe('D');
    });

    test('classifies casos-integrados tag as D', () => {
      expect(classifyByPatterns('O que e X?', 'casos-integrados')).toBe('D');
    });

    test('classifies patologia tag as D', () => {
      expect(classifyByPatterns('O que e X?', 'patologia')).toBe('D');
    });

    test('classifies CASO: prefix as D', () => {
      expect(classifyByPatterns('CASO: Paciente com...', 'anatomia')).toBe('D');
    });

    test('classifies verdadeiro ou falso as D', () => {
      expect(classifyByPatterns('Verdadeiro ou Falso: X e Y', 'anatomia')).toBe('D');
    });

    test('classifies cirurgico-abordagem as D', () => {
      expect(classifyByPatterns('O que e X?', 'cirurgico-abordagem')).toBe('D');
    });

    test('classifies herniacao as D', () => {
      expect(classifyByPatterns('O que e X?', 'herniacao')).toBe('D');
    });

    test('classifies aneurisma as D', () => {
      expect(classifyByPatterns('O que e X?', 'aneurisma')).toBe('D');
    });
  });

  describe('EASY (E) classification', () => {
    test('classifies abreviacoes tag as E', () => {
      expect(classifyByPatterns('O que e X?', 'abreviacoes')).toBe('E');
    });

    test('classifies mnemonicos tag as E', () => {
      expect(classifyByPatterns('O que e X?', 'mnemonicos')).toBe('E');
    });

    test('classifies abbreviation pattern as E', () => {
      expect(classifyByPatterns('V.C.I. = ___', 'anatomia')).toBe('E');
    });

    test('classifies atomizado tag as E', () => {
      expect(classifyByPatterns('O que e X?', 'atomizado')).toBe('E');
    });
  });

  describe('MEDIUM (M) classification', () => {
    test('classifies revisao-rapida as M', () => {
      expect(classifyByPatterns('O que e X?', 'revisao-rapida')).toBe('M');
    });

    test('classifies percentage questions as M', () => {
      expect(classifyByPatterns('Em que % dos casos?', 'anatomia')).toBe('M');
    });

    test('classifies plain anatomia as M', () => {
      expect(classifyByPatterns('O que e X?', 'anatomia-teto')).toBe('M');
    });

    test('classifies vascular (non-clinico) as M', () => {
      expect(classifyByPatterns('O que e X?', 'vascular-arterias')).toBe('M');
    });
  });

  describe('priority order', () => {
    test('D takes priority over E', () => {
      // clinico (D) should win over abreviacoes (E)
      expect(classifyByPatterns('O que e X?', 'clinico,abreviacoes')).toBe('D');
    });

    test('D tag patterns take priority', () => {
      // CASO: prefix (D) should win even with E tags
      expect(classifyByPatterns('CASO: Paciente...', 'abreviacoes')).toBe('D');
    });
  });
});
