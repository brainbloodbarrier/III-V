/**
 * Configuration loader for the data ingestion pipeline.
 * Loads source-paths.json and validates required fields.
 */

import { createLogger } from "./logger.ts";

const log = createLogger("config");

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
