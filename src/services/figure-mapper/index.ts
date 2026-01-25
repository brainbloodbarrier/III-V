/**
 * Figure mapper module exports.
 */

export {
  extractInlineImage,
  extractFigureId,
  extractCaptionText,
  extractCaption,
  type CaptionInfo,
} from "./caption-extractor.ts";

export {
  parseFigureNumber,
  expandFigureRange,
  findFigureReferences,
  type FigureNumber,
} from "./reference-finder.ts";

export {
  isAbbreviationLine,
  parseAbbreviations,
  findAbbreviationBlock,
  extractAbbreviationsFromCaption,
} from "./abbreviation-parser.ts";

export {
  buildFigureMap,
  calculateFigureSummary,
  createFigureMapOutput,
} from "./mapper.ts";
