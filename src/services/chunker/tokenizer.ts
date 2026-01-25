/**
 * Estimates token count using chars/4 heuristic.
 * Conservative estimate for chunking purposes.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Token limits for chunking
export const MAX_TOKENS = 512;
export const HARD_MAX_TOKENS = 600;
export const MIN_TOKENS = 80;
