/**
 * Figure mapper - builds figure-to-image mappings.
 */

import type { FigureReference, FigureStatus, FigureMap, FigureSummary } from "../../models/figure.ts";
import type { ContentBlock, RhotonPage } from "../../models/document.ts";
import { extractCaption } from "./caption-extractor.ts";
import { findFigureReferences } from "./reference-finder.ts";
import { extractAbbreviationsFromCaption } from "./abbreviation-parser.ts";
import { createLogger } from "../../lib/logger.ts";

const log = createLogger("figure-mapper");

/**
 * Scans image directory and returns sorted list of image files.
 * Handles both patterns:
 * - Sequential: image-1.jpg, image-2.jpg, ...
 * - Page-based: _page_N_Figure_M.jpeg
 */
async function scanImageDirectory(imageDir: string): Promise<string[]> {
  const images: string[] = [];

  try {
    const glob = new Bun.Glob("*.{jpg,jpeg,png,gif}");
    for await (const file of glob.scan({ cwd: imageDir })) {
      images.push(file);
    }
  } catch {
    log.warn("Failed to scan image directory", { imageDir });
  }

  // Sort images by number extracted from filename
  images.sort((a, b) => {
    // Extract number from patterns like "image-1.jpg" or "_page_5_Figure_1.jpeg"
    const numA = parseInt(a.match(/(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.match(/(\d+)/)?.[1] ?? "0", 10);
    return numA - numB;
  });

  log.info("Scanned image directory", { imageDir, imageCount: images.length });
  return images;
}

/**
 * Sorts figure IDs in natural order (4.1, 4.2, ..., 4.10, 4.11, ...)
 */
function sortFigureIds(ids: string[]): string[] {
  return ids.sort((a, b) => {
    const [aMaj, aMin] = a.split(".").map(Number);
    const [bMaj, bMin] = b.split(".").map(Number);
    return aMaj - bMaj || aMin - bMin;
  });
}

/**
 * Builds figure references from document pages.
 */
export async function buildFigureMap(
  pages: RhotonPage[],
  imageDir: string
): Promise<Record<string, FigureReference>> {
  const figureMap: Record<string, FigureReference> = {};

  // Scan image directory for available images (sorted)
  const availableImages = await scanImageDirectory(imageDir);
  let imageIndex = 0;

  // First pass: collect all figure captions (without image assignment yet)
  const figureEntries: Array<{
    figureId: string;
    pageNumber: number;
    caption: string;
    blockId: string;
    abbreviations: string[];
    inlineImageFile?: string;
  }> = [];

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.block_type !== "figure_caption") continue;

      const captionInfo = extractCaption(block.content);
      if (!captionInfo.figureId) continue;

      const abbreviations = extractAbbreviationsFromCaption(block.raw_html || block.content);

      figureEntries.push({
        figureId: captionInfo.figureId,
        pageNumber: page.page_number,
        caption: captionInfo.captionText,
        blockId: block.id,
        abbreviations,
        inlineImageFile: captionInfo.imageFile,
      });
    }
  }

  // Sort figures by ID for sequential image assignment
  figureEntries.sort((a, b) => {
    const [aMaj, aMin] = a.figureId.split(".").map(Number);
    const [bMaj, bMin] = b.figureId.split(".").map(Number);
    return aMaj - bMaj || aMin - bMin;
  });

  // Second pass: assign images to figures sequentially
  for (const entry of figureEntries) {
    let status: FigureStatus;
    let imageFile: string | undefined;
    let imagePath: string | undefined;

    // Strategy 1: Check if caption contains inline image reference
    if (entry.inlineImageFile) {
      status = "mapped";
      imageFile = entry.inlineImageFile;
      imagePath = `${imageDir}/${imageFile}`;
    } else if (imageIndex < availableImages.length) {
      // Strategy 2: Sequential assignment from sorted image list
      status = "mapped";
      imageFile = availableImages[imageIndex];
      imagePath = `${imageDir}/${imageFile}`;
      imageIndex++;
    } else {
      status = "no-image-in-caption";
    }

    const figRef: FigureReference = {
      figure_id: entry.figureId,
      page_number: entry.pageNumber,
      caption: entry.caption,
      caption_block_id: entry.blockId,
      abbreviations: entry.abbreviations,
      status,
      referencing_blocks: [],
    };

    if (imageFile) {
      figRef.image_file = imageFile;
    }
    if (imagePath) {
      figRef.image_path = imagePath;
    }

    figureMap[entry.figureId] = figRef;
  }

  // Second pass: find all references to figures
  for (const page of pages) {
    for (const block of page.blocks) {
      const refs = findFigureReferences(block.content);
      for (const ref of refs) {
        if (figureMap[ref]) {
          figureMap[ref].referencing_blocks?.push(block.id);
        }
      }
    }
  }

  log.info("Built figure map", {
    totalFigures: Object.keys(figureMap).length,
    mapped: Object.values(figureMap).filter((f) => f.status === "mapped").length,
  });

  return figureMap;
}

/**
 * Calculates summary statistics for figure map.
 */
export function calculateFigureSummary(
  figureMap: Record<string, FigureReference>
): FigureSummary {
  const figures = Object.values(figureMap);
  const total = figures.length;
  const mapped = figures.filter((f) => f.status === "mapped").length;
  const noImage = figures.filter((f) => f.status === "no-image-in-caption").length;
  const unresolved = figures.filter((f) => f.status === "unresolved").length;

  return {
    total_figures: total,
    mapped_count: mapped,
    unmapped_count: total - mapped,
    coverage_percentage: total > 0 ? (mapped / total) * 100 : 0,
    by_status: {
      mapped,
      "no-image-in-caption": noImage,
      unresolved,
    },
  };
}

/**
 * Creates full FigureMap output structure.
 */
export function createFigureMapOutput(
  documentId: string,
  figureMap: Record<string, FigureReference>
): FigureMap {
  return {
    document_id: documentId,
    figures: figureMap,
    summary: calculateFigureSummary(figureMap),
  };
}
