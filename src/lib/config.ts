/**
 * Configuration loader for the data ingestion pipeline.
 * Loads source-paths.json and validates required fields.
 */

import { createLogger } from "./logger";

const log = createLogger("config");

/**
 * Security constant: Maximum file size for input files (100 MB).
 * Prevents memory exhaustion from maliciously large or corrupted files.
 *
 * Rationale: The largest expected document is ~500 pages of medical text with
 * embedded figure references. At ~2KB/page for structured JSON, this yields
 * ~1MB typical size. 100MB provides generous headroom while preventing
 * memory attacks.
 *
 * @see Issue #208 - File size validation security enhancement
 */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export interface SourcePaths {
  json: string;
  markdown: string;
  imageDir: string;
}

export interface OutputPaths {
  baseDir: string;
  document: string;
  figureMap: string;
  content: string;
  validationReport: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  author: string;
}

export interface PipelineConfig {
  sources: SourcePaths;
  output: OutputPaths;
  document: DocumentInfo;
}

let cachedConfig: PipelineConfig | null = null;

export async function loadConfig(
  configPath = "./config/source-paths.json"
): Promise<PipelineConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  log.info("Loading configuration", { path: configPath });

  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const config = (await file.json()) as PipelineConfig;

  // Validate required fields
  validateConfig(config);

  cachedConfig = config;
  log.info("Configuration loaded successfully", {
    documentId: config.document.id,
    sources: Object.keys(config.sources),
  });

  return config;
}

function validateConfig(config: PipelineConfig): void {
  const requiredSources: (keyof SourcePaths)[] = ["json", "markdown", "imageDir"];
  for (const key of requiredSources) {
    if (!config.sources[key]) {
      throw new Error(`Missing required source path: ${key}`);
    }
  }

  const requiredOutputs: (keyof OutputPaths)[] = [
    "baseDir",
    "document",
    "figureMap",
    "content",
  ];
  for (const key of requiredOutputs) {
    if (!config.output[key]) {
      throw new Error(`Missing required output path: ${key}`);
    }
  }

  if (!config.document.id || !config.document.title || !config.document.author) {
    throw new Error("Missing required document metadata (id, title, author)");
  }
}

export function getOutputPath(config: PipelineConfig, file: keyof OutputPaths): string {
  if (file === "baseDir") {
    return config.output.baseDir;
  }
  return `${config.output.baseDir}/${config.output[file]}`;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
