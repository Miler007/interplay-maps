import type { ExtractedData, DetectedEntityType, Coordinates } from '../types';
import {
  ASSET_TYPE_KEYWORDS,
  COORDINATE_PATTERNS,
  POWER_PATTERNS,
  PORT_PATTERNS,
  FIBER_PATTERNS,
  COLOR_PATTERNS,
} from '../constants';
import { isValidCoordinate } from '../utils';

/** INTERFACE FOR PLUGGABLE EXTRACTORS — AI models can implement this later */
export interface ExtractionResult {
  data: Partial<ExtractedData>;
  confidence: number;
  method: string;
}

export interface EntityExtractorStrategy {
  name: string;
  extract(text: string): ExtractionResult | null;
}

/** COORDINATE EXTRACTOR */
export class CoordinateExtractor implements EntityExtractorStrategy {
  name = 'coordinate-extractor';

  extract(text: string): ExtractionResult | null {
    for (const pattern of COORDINATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (isValidCoordinate(lat, lng)) {
          return {
            data: { coordinates: { latitude: lat, longitude: lng } },
            confidence: 0.95,
            method: 'regex-coordinate',
          };
        }
      }
    }

    const parts = text.split(/[,\s]+/).map((p) => p.trim());
    for (let i = 0; i < parts.length - 1; i++) {
      const a = parseFloat(parts[i]);
      const b = parseFloat(parts[i + 1]);
      if (!isNaN(a) && !isNaN(b) && isValidCoordinate(a, b)) {
        return {
          data: { coordinates: { latitude: a, longitude: b } },
          confidence: 0.8,
          method: 'numeric-pair',
        };
      }
    }
    return null;
  }
}

/** ASSET TYPE EXTRACTOR */
export class AssetTypeExtractor implements EntityExtractorStrategy {
  name = 'asset-type-extractor';

  extract(text: string): ExtractionResult | null {
    const lowered = text.toLowerCase();
    for (const [type, keywords] of Object.entries(ASSET_TYPE_KEYWORDS)) {
      for (const kw of keywords) {
        const idx = lowered.indexOf(kw);
        if (idx !== -1) {
          const after = text.slice(idx + kw.length).trim();
          const codeMatch = after.match(/^[:\s]*([\w.\-]+)/);
          const code = codeMatch ? codeMatch[1].trim() : undefined;
          return {
            data: {
              entityType: type as DetectedEntityType,
              code,
              name: code ? `${type} ${code}` : type,
            },
            confidence: code ? 0.85 : 0.6,
            method: 'keyword-match',
          };
        }
      }
    }
    return null;
  }
}

/** CAJA CODE EXTRACTOR — specific patterns like "B.0.4", "3.2", "Caja 8.2" */
export class CajaCodeExtractor implements EntityExtractorStrategy {
  name = 'caja-code-extractor';

  extract(text: string): ExtractionResult | null {
    const lowered = text.toLowerCase();
    const cajaIdx = lowered.indexOf('caja');
    if (cajaIdx === -1) return null;

    const after = text.slice(cajaIdx + 4).trim();
    const patterns = [
      /^[:\s]*([A-Za-z]?\d+(?:\.\d+)*)/,
      /^[:\s]*([A-Za-z]?\d+(?:[.-]\d+)+)/,
    ];
    for (const p of patterns) {
      const m = after.match(p);
      if (m) {
        return {
          data: {
            entityType: 'CAJA' as DetectedEntityType,
            code: m[1].toUpperCase(),
            name: `CAJA ${m[1].toUpperCase()}`,
          },
          confidence: 0.9,
          method: 'caja-code',
        };
      }
    }
    return null;
  }
}

/** MUFFLE CODE EXTRACTOR */
export class MuffleCodeExtractor implements EntityExtractorStrategy {
  name = 'muffle-code-extractor';

  extract(text: string): ExtractionResult | null {
    const lowered = text.toLowerCase();
    const idx = lowered.indexOf('mufla');
    if (idx === -1) return null;

    const after = text.slice(idx + 5).trim();
    const patterns = [
      /^[:\s]*([A-Za-z]?\d+(?:\.\d+)*)/,
      /^[:\s]*([A-Za-z]?\d+(?:[.-]\d+)+)/,
    ];
    for (const p of patterns) {
      const m = after.match(p);
      if (m) {
        return {
          data: {
            entityType: 'MUFFLE' as DetectedEntityType,
            code: m[1].toUpperCase(),
            name: `MUFFLE ${m[1].toUpperCase()}`,
          },
          confidence: 0.9,
          method: 'muffle-code',
        };
      }
    }
    return null;
  }
}

/** POWER EXTRACTOR */
export class PowerExtractor implements EntityExtractorStrategy {
  name = 'power-extractor';

  extract(text: string): ExtractionResult | null {
    for (const pattern of POWER_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const val = match[1] ? parseFloat(match[1]) : null;
        if (val !== null && !isNaN(val)) {
          return {
            data: { power: val },
            confidence: 0.85,
            method: 'regex-power',
          };
        }
      }
    }
    return null;
  }
}

/** PORT EXTRACTOR */
export class PortExtractor implements EntityExtractorStrategy {
  name = 'port-extractor';

  extract(text: string): ExtractionResult | null {
    const hasPorts = /puertos?|ports?/i.test(text);
    if (!hasPorts) return null;

    for (const pattern of PORT_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val)) {
          const isFree = /libre/i.test(text);
          return {
            data: isFree ? { freePorts: val } : { ports: val },
            confidence: 0.8,
            method: 'regex-port',
          };
        }
      }
    }
    return null;
  }
}

/** FIBER EXTRACTOR */
export class FiberExtractor implements EntityExtractorStrategy {
  name = 'fiber-extractor';

  extract(text: string): ExtractionResult | null {
    const hasFiber = /fibra|hilo|hebra|fo/i.test(text);
    if (!hasFiber) return null;

    for (const pattern of FIBER_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val)) {
          return {
            data: { fiberCount: val },
            confidence: 0.8,
            method: 'regex-fiber',
          };
        }
      }
    }
    return null;
  }
}

/** COLOR EXTRACTOR */
export class ColorExtractor implements EntityExtractorStrategy {
  name = 'color-extractor';

  private knownColors = [
    'rojo', 'verde', 'azul', 'amarillo', 'blanco', 'negro', 'gris', 'marron',
    'violeta', 'rosa', 'naranja', 'celeste', 'beige', 'transparente',
    'red', 'green', 'blue', 'yellow', 'white', 'black', 'gray', 'brown',
    'rosado', 'morado', 'cafe',
  ];

  extract(text: string): ExtractionResult | null {
    for (const pattern of COLOR_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const color = match[1].toLowerCase();
        if (this.knownColors.includes(color)) {
          return {
            data: { fiberColor: color },
            confidence: 0.75,
            method: 'regex-color',
          };
        }
      }
    }

    for (const color of this.knownColors) {
      if (text.toLowerCase().includes(color)) {
        return {
          data: { fiberColor: color },
          confidence: 0.6,
          method: 'keyword-color',
        };
      }
    }
    return null;
  }
}

/** OBSERVATIONS EXTRACTOR — captures remaining meaningful text after extraction */
export class ObservationsExtractor implements EntityExtractorStrategy {
  name = 'observations-extractor';

  extract(text: string): ExtractionResult | null {
    const cleaned = text
      .replace(COORDINATE_PATTERNS[0], '')
      .replace(COORDINATE_PATTERNS[1], '')
      .replace(/caja|mufla|cto|splitter|poste|nodo/gi, '')
      .replace(/potencia|puerto|fibra|color/gi, '')
      .replace(/[-]{2,}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length > 3) {
      return {
        data: { observations: cleaned },
        confidence: 0.4,
        method: 'residual-text',
      };
    }
    return null;
  }
}

/** ORCHESTRATOR — tries all strategies and merges results */
export class EntityExtractorOrchestrator {
  private strategies: EntityExtractorStrategy[];

  constructor(strategies?: EntityExtractorStrategy[]) {
    this.strategies = strategies || [
      new CajaCodeExtractor(),
      new MuffleCodeExtractor(),
      new AssetTypeExtractor(),
      new CoordinateExtractor(),
      new PowerExtractor(),
      new PortExtractor(),
      new FiberExtractor(),
      new ColorExtractor(),
      new ObservationsExtractor(),
    ];
  }

  registerStrategy(strategy: EntityExtractorStrategy): void {
    this.strategies.push(strategy);
  }

  extractAll(text: string): ExtractedData {
    const result: ExtractedData = { rawConfidence: 0 };
    let totalConfidence = 0;
    let totalWeight = 0;

    for (const strategy of this.strategies) {
      try {
        const extraction = strategy.extract(text);
        if (extraction && extraction.confidence > 0.3) {
          Object.assign(result, extraction.data);
          totalConfidence += extraction.confidence;
          totalWeight++;
        }
      } catch {
        // skip failed strategy
      }
    }

    result.rawConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    return result;
  }

  extractText(text: string): ExtractedData {
    const result: ExtractedData = { rawConfidence: 0 };
    let totalConfidence = 0;
    let totalWeight = 0;

    for (const strategy of this.strategies) {
      try {
        const extraction = strategy.extract(text);
        if (extraction && extraction.confidence > 0.3) {
          Object.assign(result, extraction.data);
          totalConfidence += extraction.confidence;
          totalWeight++;
        }
      } catch {
        // skip
      }
    }

    result.rawConfidence = totalWeight > 0 ? Math.round((totalConfidence / totalWeight) * 100) / 100 : 0;
    return result;
  }
}
