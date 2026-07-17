import { WhatsAppParser } from '../pipeline/whatsapp-parser';
import { WHATSAPP_CHAT } from './fixtures/whatsapp-real';

const BASELINE = {
  detectedEntities: 40,
  relationships: 10,
  conCoordenadas: 17,
  conPotencia: 9,
  conPuertos: 6,
  conFibra: 7,
  caJas: 20,
  muflas: 3,
  noiseMessages: 5,
  totalMessages: 81,
};

type RegressionDeviation = {
  metric: string;
  expected: number;
  actual: number;
  percentChange: number;
  passed: boolean;
};

type RegressionReport = {
  baseline: typeof BASELINE;
  actual: typeof BASELINE;
  deviations: RegressionDeviation[];
  passed: boolean;
  timestamp: string;
};

function computeReport(result: any, baseline: typeof BASELINE): RegressionReport {
  const actual: typeof BASELINE = {
    detectedEntities: result.detectedEntities.length,
    relationships: result.relationships.length,
    conCoordenadas: result.estadisticas.conCoordenadas,
    conPotencia: result.estadisticas.conPotencia,
    conPuertos: result.estadisticas.conPuertos,
    conFibra: result.estadisticas.conFibra,
    caJas: result.estadisticas.porTipo['CAJA'] || 0,
    muflas: result.estadisticas.porTipo['MUFFLE'] || 0,
    noiseMessages: result.noiseMessages,
    totalMessages: result.totalMessages,
  };

  const deviations: RegressionDeviation[] = [];
  for (const key of Object.keys(baseline) as (keyof typeof BASELINE)[]) {
    const expected = baseline[key];
    const actualVal = actual[key];
    const percentChange = expected === 0 ? (actualVal === 0 ? 0 : Infinity) : Math.round(((actualVal - expected) / expected) * 10000) / 100;
    const passed = Math.abs(percentChange) <= 20;
    deviations.push({ metric: key, expected, actual: actualVal, percentChange, passed });
  }

  return {
    baseline,
    actual,
    deviations,
    passed: deviations.every((d) => d.passed),
    timestamp: new Date().toISOString(),
  };
}

function computeAverageConfidence(result: any): number {
  if (result.detectedEntities.length === 0) return 0;
  const sum = result.detectedEntities.reduce((acc: number, e: { rawConfidence: number }) => acc + e.rawConfidence, 0);
  return Math.round((sum / result.detectedEntities.length) * 100) / 100;
}

function parseAndGetResult(parser: WhatsAppParser): any {
  return parser.parseText(WHATSAPP_CHAT);
}

function serializeResult(r: any): string {
  return JSON.stringify({
    totalMessages: r.totalMessages,
    detectedEntities: r.detectedEntities.length,
    relationships: r.relationships.length,
    noiseMessages: r.noiseMessages,
    conCoordenadas: r.estadisticas.conCoordenadas,
    conPotencia: r.estadisticas.conPotencia,
    conPuertos: r.estadisticas.conPuertos,
    conFibra: r.estadisticas.conFibra,
    porTipo: r.estadisticas.porTipo,
    avgConfidence: computeAverageConfidence(r),
  });
}

describe('Regression Suite Permanente', () => {
  let parser: WhatsAppParser;

  beforeEach(() => {
    parser = new WhatsAppParser();
  });

  describe('baseline comparison', () => {
    it('should match all baseline metrics within ±20% tolerance', () => {
      const result = parseAndGetResult(parser);
      const report = computeReport(result, BASELINE);

      for (const deviation of report.deviations) {
        expect(deviation.passed).toBe(true);
      }

      expect(report.passed).toBe(true);
    });

    it('should produce a structured regression report', () => {
      const result = parseAndGetResult(parser);
      const report = computeReport(result, BASELINE);

      expect(report).toHaveProperty('baseline');
      expect(report).toHaveProperty('actual');
      expect(report).toHaveProperty('deviations');
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('timestamp');
      expect(report.deviations.length).toBe(Object.keys(BASELINE).length);
    });
  });

  describe('regression detectors', () => {
    it('detectedEntityCount should not decrease significantly', () => {
      const result = parseAndGetResult(parser);
      const threshold = Math.round(BASELINE.detectedEntities * 0.8);
      expect(result.detectedEntities.length).toBeGreaterThanOrEqual(threshold);
    });

    it('relationshipFound should not decrease', () => {
      const result = parseAndGetResult(parser);
      const threshold = Math.round(BASELINE.relationships * 0.8);
      expect(result.relationships.length).toBeGreaterThanOrEqual(threshold);
    });

    it('noiseFiltered should not decrease', () => {
      const result = parseAndGetResult(parser);
      const threshold = Math.round(BASELINE.noiseMessages * 0.8);
      expect(result.noiseMessages).toBeGreaterThanOrEqual(threshold);
    });

    it('confidenceScores should not drop by more than 20% from baseline', () => {
      const result = parseAndGetResult(parser);
      const avgConfidence = computeAverageConfidence(result);
      const baselineConfidence = 0.75;
      const minConfidence = baselineConfidence * 0.8;
      expect(avgConfidence).toBeGreaterThanOrEqual(minConfidence);
    });
  });

  describe('no false regressions on known input', () => {
    it('should produce identical results when parsing the same fixture 3 times', () => {
      const result1 = parseAndGetResult(parser);
      const result2 = parseAndGetResult(parser);
      const result3 = parseAndGetResult(parser);

      const serialized1 = serializeResult(result1);
      const serialized2 = serializeResult(result2);
      const serialized3 = serializeResult(result3);

      expect(serialized2).toBe(serialized1);
      expect(serialized3).toBe(serialized1);
    });
  });

  describe('repeated parsing stability', () => {
    it('should produce identical results when parsing the same content 5 times', () => {
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(serializeResult(parseAndGetResult(parser)));
      }

      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(results[0]);
      }
    });
  });
});
