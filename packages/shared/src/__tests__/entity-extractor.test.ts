import { EntityExtractorOrchestrator } from '../pipeline/entity-extractor';
import {
  CoordinateExtractor,
  AssetTypeExtractor,
  CajaCodeExtractor,
  MuffleCodeExtractor,
  PowerExtractor,
  PortExtractor,
  FiberExtractor,
  ColorExtractor,
  ObservationsExtractor,
} from '../pipeline/entity-extractor';
import type { EntityExtractorStrategy, ExtractionResult } from '../pipeline/entity-extractor';

// ---------------------------------------------------------------------------
// CoordinateExtractor
// ---------------------------------------------------------------------------
describe('CoordinateExtractor', () => {
  const extractor = new CoordinateExtractor();

  it.each([
    ['5.158860,-75.034560', { latitude: 5.15886, longitude: -75.03456 }],
    ['5.158860 -75.034560', { latitude: 5.15886, longitude: -75.03456 }],
    ['coord: 5.158860, -75.034560', { latitude: 5.15886, longitude: -75.03456 }],
    ['lat: 5.158860 lon: -75.034560', { latitude: 5.15886, longitude: -75.03456 }],
  ])('extracts coordinates from "%s"', (input, expected) => {
    const result = extractor.extract(input);
    expect(result).not.toBeNull();
    expect(result!.data.coordinates).toEqual(expected);
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('matches "0, 0" as valid (origin is within bounds)', () => {
    const result = extractor.extract('0, 0');
    expect(result).not.toBeNull();
    expect(result!.data.coordinates).toEqual({ latitude: 0, longitude: 0 });
  });

  it.each([
    ['100, 200'],
    ['abc, def'],
    [''],
    ['no coordinates here'],
  ])('returns null for invalid input "%s"', (input) => {
    expect(extractor.extract(input)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AssetTypeExtractor
// ---------------------------------------------------------------------------
describe('AssetTypeExtractor', () => {
  const extractor = new AssetTypeExtractor();

  it('extracts CAJA with code from "caja B.0.4"', () => {
    const result = extractor.extract('caja B.0.4');
    expect(result).not.toBeNull();
    expect(result!.data.entityType).toBe('CAJA');
    expect(result!.data.code).toBe('B.0.4');
    expect(result!.data.name).toBe('CAJA B.0.4');
    expect(result!.confidence).toBe(0.85);
  });

  it('extracts MUFFLE with code from "mufla norte"', () => {
    const result = extractor.extract('mufla norte');
    expect(result).not.toBeNull();
    expect(result!.data.entityType).toBe('MUFFLE');
    expect(result!.data.code).toBe('norte');
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('extracts CTO from "terminal principal"', () => {
    const result = extractor.extract('terminal principal');
    expect(result).not.toBeNull();
    expect(result!.data.entityType).toBe('CTO');
    expect(result!.data.code).toBe('principal');
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('returns null when no asset keyword matches', () => {
    expect(extractor.extract('revisando instalación')).toBeNull();
  });

  it('matches CAJA (not CTO) for "cto principal" due to keyword overlap', () => {
    const result = extractor.extract('cto principal');
    expect(result).not.toBeNull();
    expect(result!.data.entityType).toBe('CAJA');
  });
});

// ---------------------------------------------------------------------------
// CajaCodeExtractor
// ---------------------------------------------------------------------------
describe('CajaCodeExtractor', () => {
  const extractor = new CajaCodeExtractor();

  it.each([
    ['Caja 0.4', 'CAJA', '0.4'],
    ['caja 3.2', 'CAJA', '3.2'],
    ['Caja: 8.1', 'CAJA', '8.1'],
    ['Caja B04', 'CAJA', 'B04'],
  ])('extracts caja code from "%s"', (input, expectedType, expectedCode) => {
    const result = extractor.extract(input);
    expect(result).not.toBeNull();
    expect(result!.data.entityType).toBe(expectedType);
    expect(result!.data.code).toBe(expectedCode);
    expect(result!.confidence).toBe(0.9);
  });

  it('returns null when "caja" is absent', () => {
    expect(extractor.extract('sin referencia')).toBeNull();
  });

  it('returns null for "Caja B.0.4" (letter + dot + digit not matched by pattern)', () => {
    expect(extractor.extract('Caja B.0.4')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// MuffleCodeExtractor
// ---------------------------------------------------------------------------
describe('MuffleCodeExtractor', () => {
  const extractor = new MuffleCodeExtractor();

  it.each([
    ['mufla 1', 'MUFFLE', '1'],
    ['mufla: 2', 'MUFFLE', '2'],
    ['Mufla 04', 'MUFFLE', '04'],
  ])('extracts muffle code from "%s"', (input, expectedType, expectedCode) => {
    const result = extractor.extract(input);
    expect(result).not.toBeNull();
    expect(result!.data.entityType).toBe(expectedType);
    expect(result!.data.code).toBe(expectedCode);
    expect(result!.confidence).toBe(0.9);
  });

  it('returns null when "mufla" is absent', () => {
    expect(extractor.extract('some text')).toBeNull();
  });

  it('returns null for non-numeric muffle codes (handled by AssetTypeExtractor)', () => {
    expect(extractor.extract('Mufla Norte')).toBeNull();
    expect(extractor.extract('mufla central')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PowerExtractor
// ---------------------------------------------------------------------------
describe('PowerExtractor', () => {
  const extractor = new PowerExtractor();

  it.each([
    ['Potencia -22', -22],
    ['Potencia: -18.5', -18.5],
    ['nivel -24', -24],
  ])('extracts power from "%s"', (input, expected) => {
    const result = extractor.extract(input);
    expect(result).not.toBeNull();
    expect(result!.data.power).toBe(expected);
    expect(result!.confidence).toBe(0.85);
  });

  it.each([
    ['no power data'],
    ['something else'],
  ])('returns null when no power pattern matches "%s"', (input) => {
    expect(extractor.extract(input)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PortExtractor
// ---------------------------------------------------------------------------
describe('PortExtractor', () => {
  const extractor = new PortExtractor();

  it('extracts free ports from "Puertos libres 5"', () => {
    const result = extractor.extract('Puertos libres 5');
    expect(result).not.toBeNull();
    expect(result!.data.freePorts).toBe(5);
    expect(result!.confidence).toBe(0.8);
  });

  it('extracts ports from "Puertos 8"', () => {
    const result = extractor.extract('Puertos 8');
    expect(result).not.toBeNull();
    expect(result!.data.ports).toBe(8);
    expect(result!.confidence).toBe(0.8);
  });

  it('returns null for "Libres 3" (missing "puertos" context)', () => {
    expect(extractor.extract('Libres 3')).toBeNull();
  });

  it('extracts ports from "8 puertos"', () => {
    const result = extractor.extract('8 puertos');
    expect(result).not.toBeNull();
    expect(result!.data.ports).toBe(8);
    expect(result!.confidence).toBe(0.8);
  });

  it('returns null when no port keyword present', () => {
    expect(extractor.extract('no ports here')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FiberExtractor
// ---------------------------------------------------------------------------
describe('FiberExtractor', () => {
  const extractor = new FiberExtractor();

  it.each([
    ['Fibra 12 hilos', 12],
    ['12 fibras', 12],
    ['Fibra de 24 hilos', 24],
  ])('extracts fiber count from "%s"', (input, expected) => {
    const result = extractor.extract(input);
    expect(result).not.toBeNull();
    expect(result!.data.fiberCount).toBe(expected);
    expect(result!.confidence).toBe(0.8);
  });

  it('returns null when no fiber/hilo keyword present', () => {
    expect(extractor.extract('no fiber data')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ColorExtractor
// ---------------------------------------------------------------------------
describe('ColorExtractor', () => {
  const extractor = new ColorExtractor();

  it('extracts color from "Color rosado" via regex', () => {
    const result = extractor.extract('Color rosado');
    expect(result).not.toBeNull();
    expect(result!.data.fiberColor).toBe('rosado');
    expect(result!.confidence).toBe(0.75);
  });

  it('extracts color from "Color: azul" via regex', () => {
    const result = extractor.extract('Color: azul');
    expect(result).not.toBeNull();
    expect(result!.data.fiberColor).toBe('azul');
    expect(result!.confidence).toBe(0.75);
  });

  it('extracts color from "Verde" via keyword fallback', () => {
    const result = extractor.extract('Verde');
    expect(result).not.toBeNull();
    expect(result!.data.fiberColor).toBe('verde');
    expect(result!.confidence).toBe(0.6);
  });

  it('returns null when no known color is found', () => {
    expect(extractor.extract('Color: unknownish')).toBeNull();
  });

  it('matches "morado" as a known color via keyword fallback', () => {
    const result = extractor.extract('morado');
    expect(result).not.toBeNull();
    expect(result!.data.fiberColor).toBe('morado');
  });
});

// ---------------------------------------------------------------------------
// ObservationsExtractor
// ---------------------------------------------------------------------------
describe('ObservationsExtractor', () => {
  const extractor = new ObservationsExtractor();

  it('captures residual text longer than 3 characters', () => {
    const result = extractor.extract('texto sobrante aquí');
    expect(result).not.toBeNull();
    expect(result!.data.observations).toBeTruthy();
    expect((result!.data.observations as string).length).toBeGreaterThan(3);
    expect(result!.confidence).toBe(0.4);
  });

  it('returns null when residual text is too short', () => {
    expect(extractor.extract('caja')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// EntityExtractorOrchestrator
// ---------------------------------------------------------------------------
describe('EntityExtractorOrchestrator', () => {
  it('extracts all fields from a compound message without ambiguous substrings', () => {
    const orchestrator = new EntityExtractorOrchestrator();
    const result = orchestrator.extractText(
      'Caja 04, 5.158860,-75.034560, Potencia -22, Fibra 12 hilos, Color rosado',
    );

    expect(result.entityType).toBe('CAJA');
    expect(result.code).toBe('04');
    expect(result.coordinates).toEqual({ latitude: 5.15886, longitude: -75.03456 });
    expect(result.power).toBe(-22);
    expect(result.fiberCount).toBe(12);
    expect(result.fiberColor).toBe('rosado');
    expect(result.rawConfidence).toBeGreaterThan(0.5);
  });

  it('registers and uses a custom strategy', () => {
    const custom: EntityExtractorStrategy = {
      name: 'custom-test',
      extract(text: string): ExtractionResult | null {
        if (text.includes('CUSTOM')) {
          return {
            data: { observations: 'custom-observed' },
            confidence: 0.99,
            method: 'custom',
          };
        }
        return null;
      },
    };

    const orchestrator = new EntityExtractorOrchestrator();
    orchestrator.registerStrategy(custom);

    const result = orchestrator.extractText('CUSTOM marker');
    expect(result.observations).toBe('custom-observed');
    expect(result.rawConfidence).toBeGreaterThan(0);
  });

  it('does not mutate result when no strategies match', () => {
    const orchestrator = new EntityExtractorOrchestrator();
    const result = orchestrator.extractText('');
    expect(result.rawConfidence).toBe(0);
  });

  it('skips strategies that throw', () => {
    const throwing: EntityExtractorStrategy = {
      name: 'thrower',
      extract(): ExtractionResult | null {
        throw new Error('boom');
      },
    };

    const orchestrator = new EntityExtractorOrchestrator();
    orchestrator.registerStrategy(throwing);

    const result = orchestrator.extractText('some input');
    expect(result).toBeDefined();
    expect(result.rawConfidence).toBeGreaterThanOrEqual(0);
  });

  it('merges overlapping strategies, last non-null wins per key', () => {
    const strategyA: EntityExtractorStrategy = {
      name: 'a',
      extract(): ExtractionResult | null {
        return { data: { entityType: 'CAJA', code: 'A' }, confidence: 0.9, method: 'a' };
      },
    };
    const strategyB: EntityExtractorStrategy = {
      name: 'b',
      extract(): ExtractionResult | null {
        return { data: { entityType: 'MUFFLE', code: 'B' }, confidence: 0.9, method: 'b' };
      },
    };

    const orchestrator = new EntityExtractorOrchestrator([strategyA, strategyB]);
    const result = orchestrator.extractText('test');
    expect(result.entityType).toBe('MUFFLE');
    expect(result.code).toBe('B');
  });
});
