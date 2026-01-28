/**
 * Centralized token limit configuration for the chunking pipeline.
 *
 * This module is the single source of truth for all token-related constants.
 * Both the splitter logic and Zod schema validation reference these values
 * to prevent drift between splitting targets and validation limits.
 *
 * TOKEN LIMIT ARCHITECTURE:
 *
 *   MAX_TOKENS (512)         - Target size for splitting. The splitter aims to
 *                              create chunks at or below this size. This is a
 *                              "soft" limit used during chunk construction.
 *
 *   HARD_MAX_TOKENS (600)    - Absolute maximum enforced by Zod schema validation.
 *                              Provides ~17% headroom above MAX_TOKENS to accommodate:
 *                              - Overlap tokens added during merge phase
 *                              - Edge cases in sentence boundary detection
 *                              - Breadcrumb context overhead variations
 *
 *   MIN_TOKENS (80)          - Minimum viable chunk size. Chunks below this
 *                              threshold are merged with neighbors when possible.
 *
 * RUNTIME VS COMPILE-TIME ENFORCEMENT:
 *
 *   TypeScript's type system cannot enforce numeric range constraints at compile
 *   time. The `token_count` field is typed as `number` in the Chunk interface,
 *   but the actual range constraint (1 <= token_count <= HARD_MAX_TOKENS) is
 *   enforced at runtime via Zod schema validation.
 *
 *   This is an intentional design decision:
 *   - All chunk outputs pass through Zod validation before serialization
 *   - Invalid token counts will throw validation errors at runtime
 *   - Constitution Principle II requires all outputs validate against schemas
 *
 *   For code that needs to signal "this number has been validated as a token
 *   count", use the ValidatedTokenCount branded type exported below.
 *
 * @see src/models/schemas.ts - ChunkSchema uses HARD_MAX_TOKENS
 * @see src/services/chunker/splitter.ts - Uses MAX_TOKENS for splitting
 * @see src/services/chunker/validator.ts - Validates chunks against schema
 */

/**
 * Token limit constants for the chunking pipeline.
 * These values are used by both the splitter and the Zod schema.
 */
export const CHUNKING_LIMITS = {
  /**
   * Target maximum tokens per chunk during splitting.
   * The splitter aims to create chunks at or below this size.
   */
  MAX_TOKENS: 512,

  /**
   * Hard maximum tokens enforced by Zod schema validation.
   * Provides headroom for overlap tokens and edge cases.
   * This is the value used in ChunkSchema.token_count.max().
   */
  HARD_MAX_TOKENS: 600,

  /**
   * Minimum tokens for a viable chunk.
   * Chunks below this may be merged with neighbors.
   */
  MIN_TOKENS: 80,
} as const;

/**
 * Figure linking configuration constants.
 */
export const FIGURE_LINKING_LIMITS = {
  /**
   * Maximum length for caption snippets in figure references.
   * Captions longer than this are truncated at word boundaries with "...".
   * Value chosen to provide meaningful context while keeping chunk metadata compact.
   */
  CAPTION_SNIPPET_MAX_LENGTH: 100,
} as const;

/**
 * Branded type for token counts that have been validated.
 *
 * This is a nominal/branded type that signals to readers that a number
 * has passed through validation and is known to be within bounds.
 *
 * IMPORTANT: This is a documentation/intent mechanism, not a compile-time
 * guarantee. TypeScript cannot enforce numeric ranges at compile time.
 * The actual enforcement happens via Zod schema validation at runtime.
 *
 * Usage:
 * ```typescript
 * // After Zod validation, you can assert the branded type:
 * const validated = chunk.token_count as ValidatedTokenCount;
 *
 * // Or use the helper function:
 * const count = assertValidTokenCount(chunk.token_count);
 * ```
 */
export type ValidatedTokenCount = number & {
  readonly __brand: "ValidatedTokenCount";
};

/**
 * Assert that a number is a valid token count.
 *
 * This function validates the token count is within bounds and returns
 * a branded type. Use this when you have a raw number that needs validation
 * outside of the normal Zod schema flow.
 *
 * @throws Error if token count is out of bounds
 */
export function assertValidTokenCount(count: number): ValidatedTokenCount {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > CHUNKING_LIMITS.HARD_MAX_TOKENS
  ) {
    throw new Error(
      `Invalid token count: ${count}. Must be integer between 1 and ${CHUNKING_LIMITS.HARD_MAX_TOKENS}.`
    );
  }
  return count as ValidatedTokenCount;
}

/**
 * Check if a number is a valid token count without throwing.
 */
export function isValidTokenCount(count: number): count is ValidatedTokenCount {
  return (
    Number.isInteger(count) &&
    count >= 1 &&
    count <= CHUNKING_LIMITS.HARD_MAX_TOKENS
  );
}
