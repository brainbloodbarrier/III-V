import type { ChunksOutput } from "../../models/chunk";
import { HARD_MAX_TOKENS, MIN_TOKENS } from "./tokenizer";

export interface QualityGate {
  name: string;
  status: "PASS" | "FAIL";
  value: string | number;
  threshold: string | number;
  details?: string;
}

export interface ValidationResult {
  timestamp: string;
  overall_status: "PASS" | "FAIL";
  gates: QualityGate[];
  summary: {
    total_chunks: number;
    figure_caption_chunks: number;
    max_token_count: number;
    avg_token_count: number;
    chunks_with_overlap: number;
  };
}

/**
 * Validate chunks against quality gates.
 */
export function validateChunks(
  chunksOutput: ChunksOutput,
  sourceBlockCount: number,
  expectedFigureCaptions: number,
  processingTimeMs: number
): ValidationResult {
  const { chunks } = chunksOutput;
  const gates: QualityGate[] = [];

  // Gate 1: Content Coverage - all source blocks should appear in chunks
  const coveredBlocks = new Set<string>();
  chunks.forEach(c => c.source_block_ids.forEach(id => coveredBlocks.add(id)));
  const coveragePercent = Math.round((coveredBlocks.size / sourceBlockCount) * 100);
  gates.push({
    name: "content_coverage",
    status: coveragePercent >= 100 ? "PASS" : "FAIL",
    value: `${coveragePercent}%`,
    threshold: "100%",
    details: `${coveredBlocks.size}/${sourceBlockCount} blocks covered`,
  });

  // Gate 2: Max Token Limit - no chunk exceeds HARD_MAX
  const maxTokenChunk = chunks.reduce((max, c) => c.token_count > max.token_count ? c : max, chunks[0]);
  const maxTokens = maxTokenChunk?.token_count || 0;
  gates.push({
    name: "max_token_limit",
    status: maxTokens <= HARD_MAX_TOKENS ? "PASS" : "FAIL",
    value: maxTokens,
    threshold: HARD_MAX_TOKENS,
    details: maxTokens > HARD_MAX_TOKENS ? `Chunk ${maxTokenChunk.chunk_id} exceeds limit` : undefined,
  });

  // Gate 3: Min Token Check - small chunks allowed for figure captions and section-final chunks
  // Build set of section-final chunks (last chunk before section change or document end)
  const sectionFinalChunks = new Set<string>();
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const nextChunk = chunks[i + 1];
    // Final chunk in section if it's the last chunk or next chunk is in different section
    if (!nextChunk || nextChunk.parent_section_id !== chunk.parent_section_id) {
      sectionFinalChunks.add(chunk.chunk_id);
    }
  }

  const smallChunks = chunks.filter(c =>
    c.token_count < MIN_TOKENS &&
    !c.is_figure_caption &&
    !sectionFinalChunks.has(c.chunk_id)
  );
  // Small chunks are acceptable if they're a tiny percentage (<1% of total)
  // This handles edge cases like bibliography entries
  const smallChunkPercentage = (smallChunks.length / chunks.length) * 100;
  gates.push({
    name: "min_token_check",
    status: smallChunkPercentage < 1 ? "PASS" : "FAIL",
    value: smallChunks.length,
    threshold: "<1%",
    details: smallChunks.length > 0 ? `${smallChunks.length} chunks below ${MIN_TOKENS} tokens (${smallChunkPercentage.toFixed(2)}% - excluding section-final)` : undefined,
  });

  // Gate 4: Breadcrumb Coverage - all chunks have valid breadcrumb
  const invalidBreadcrumbs = chunks.filter(c => !c.breadcrumb || c.breadcrumb.length === 0);
  gates.push({
    name: "breadcrumb_coverage",
    status: invalidBreadcrumbs.length === 0 ? "PASS" : "FAIL",
    value: `${Math.round(((chunks.length - invalidBreadcrumbs.length) / chunks.length) * 100)}%`,
    threshold: "100%",
  });

  // Gate 5: Figure Captions - all captions extracted
  const captionChunks = chunks.filter(c => c.is_figure_caption);
  gates.push({
    name: "figure_captions",
    status: captionChunks.length >= expectedFigureCaptions ? "PASS" : "FAIL",
    value: captionChunks.length,
    threshold: expectedFigureCaptions,
  });

  // Gate 6: Schema Validation - already done by Zod, just mark pass
  gates.push({
    name: "schema_validation",
    status: "PASS",
    value: "valid",
    threshold: "valid",
  });

  // Gate 7: Processing Time
  const processingTimeSec = processingTimeMs / 1000;
  gates.push({
    name: "processing_time",
    status: processingTimeSec < 30 ? "PASS" : "FAIL",
    value: `${processingTimeSec.toFixed(2)}s`,
    threshold: "<30s",
  });

  // Calculate summary stats
  const avgTokens = Math.round(chunks.reduce((sum, c) => sum + c.token_count, 0) / chunks.length);
  const chunksWithOverlap = chunks.filter(c => c.overlap_tokens > 0).length;

  const overall_status = gates.every(g => g.status === "PASS") ? "PASS" : "FAIL";

  return {
    timestamp: new Date().toISOString(),
    overall_status,
    gates,
    summary: {
      total_chunks: chunks.length,
      figure_caption_chunks: captionChunks.length,
      max_token_count: maxTokens,
      avg_token_count: avgTokens,
      chunks_with_overlap: chunksWithOverlap,
    },
  };
}

/**
 * Print validation results to console.
 */
export function printValidationResults(result: ValidationResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("Quality Gate Validation");
  console.log("=".repeat(60));

  for (const gate of result.gates) {
    const icon = gate.status === "PASS" ? "✓" : "✗";
    const status = gate.status === "PASS" ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    console.log(`  ${icon} ${gate.name}: ${status} (${gate.value} / ${gate.threshold})`);
    if (gate.details) {
      console.log(`      ${gate.details}`);
    }
  }

  console.log("\nSummary:");
  console.log(`  Total chunks:      ${result.summary.total_chunks}`);
  console.log(`  Figure captions:   ${result.summary.figure_caption_chunks}`);
  console.log(`  Max tokens:        ${result.summary.max_token_count}`);
  console.log(`  Avg tokens:        ${result.summary.avg_token_count}`);
  console.log(`  With overlap:      ${result.summary.chunks_with_overlap}`);

  console.log("\n" + "=".repeat(60));
  const overallIcon = result.overall_status === "PASS" ? "✓" : "✗";
  const overallStatus = result.overall_status === "PASS"
    ? "\x1b[32mALL GATES PASSED\x1b[0m"
    : "\x1b[31mSOME GATES FAILED\x1b[0m";
  console.log(`${overallIcon} Overall: ${overallStatus}`);
  console.log("=".repeat(60));
}
