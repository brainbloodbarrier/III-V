/**
 * Figure reference model interfaces.
 * Matches the JSON Schema contract at contracts/figure-map.schema.json
 */

/**
 * Status of a figure-to-image mapping.
 */
export type FigureStatus = "mapped" | "no-image-in-caption" | "unresolved";

/**
 * A reference to a figure with its image mapping.
 */
export interface FigureReference {
  /** Figure ID in format "Fig. X.Y" */
  figure_id: string;
  /** Image filename (present when status=mapped) */
  image_file?: string;
  /** Full path to image file */
  image_path?: string;
  /** Page number where figure appears */
  page_number: number;
  /** Figure caption text */
  caption: string;
  /** Source block ID containing the caption */
  caption_block_id?: string;
  /** Parsed abbreviation key-value pairs */
  abbreviations: Record<string, string>;
  /** Mapping status */
  status: FigureStatus;
  /** Block IDs that reference this figure */
  referencing_blocks?: string[];
}

/**
 * Summary statistics for figure mapping.
 */
export interface FigureSummary {
  total_figures: number;
  mapped_count: number;
  unmapped_count: number;
  coverage_percentage: number;
  by_status?: {
    mapped: number;
    "no-image-in-caption": number;
    unresolved: number;
  };
}

/**
 * Standalone figure map output file structure.
 */
export interface FigureMap {
  /** Reference to parent document ID */
  document_id: string;
  /** Figure entries keyed by figure_id */
  figures: Record<string, FigureReference>;
  /** Summary statistics */
  summary: FigureSummary;
}
