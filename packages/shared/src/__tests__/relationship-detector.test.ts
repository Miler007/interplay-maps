import { RelationshipDetectorOrchestrator, RegexRelationshipDetector, PatternRelationshipDetector } from '../pipeline/relationship-detector';
import type { RelationshipDetectorStrategy } from '../pipeline/relationship-detector';

// ---------------------------------------------------------------------------
// RegexRelationshipDetector
// ---------------------------------------------------------------------------
describe('RegexRelationshipDetector', () => {
  let detector: RegexRelationshipDetector;

  beforeEach(() => {
    detector = new RegexRelationshipDetector();
  });

  // Pattern 1: drop/bajada/derivado desde caja|mufla CODE → ALIMENTADO_POR
  describe('pattern 1 — ALIMENTADO_POR', () => {
    it('detects "Drop desde caja 3.2" as ALIMENTADO_POR with sourceCode "3.2"', () => {
      const result = detector.detect('Drop desde caja 3.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTADO_POR');
      expect(result!.sourceCode).toBe('3.2');
    });

    it('matches first in compound sentence "Drop desde caja 3.2 alimenta caja B.5.1"', () => {
      const result = detector.detect('Drop desde caja 3.2 alimenta caja B.5.1');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTADO_POR');
      expect(result!.sourceCode).toBe('3.2');
    });
  });

  // Pattern 2: alimenta|conecta a caja|mufla CODE → ALIMENTA_A (single capture group)
  describe('pattern 2 — ALIMENTA_A (single code capture)', () => {
    it('detects "Mufla Norte alimenta caja 8.2" with sourceCode "8.2" (pattern 2 wins before pattern 3)', () => {
      const result = detector.detect('Mufla Norte alimenta caja 8.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTA_A');
      expect(result!.sourceCode).toBe('8.2');
      expect(result!.targetCode).toBeUndefined();
    });

    it('detects "caja 5.1 alimenta caja 8.2" with sourceCode "8.2"', () => {
      const result = detector.detect('caja 5.1 alimenta caja 8.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTA_A');
      expect(result!.sourceCode).toBe('8.2');
      expect(result!.targetCode).toBeUndefined();
    });

    it('detects "mufla este alimenta caja B.0.4 y caja 3.2" with sourceCode "b.0.4"', () => {
      const result = detector.detect('mufla este alimenta caja B.0.4 y caja 3.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTA_A');
      expect(result!.sourceCode).toBe('b.0.4');
    });
  });

  // Pattern 3: mufla|muffle|empalme CODE alimenta|conecta caja|mufla CODE → ALIMENTA_A (2 groups)
  describe('pattern 3 — ALIMENTA_A (source + target)', () => {
    it('matches when pattern 2 does not consume the target first (conecta not followed by "a")', () => {
      const result = detector.detect('mufla 1 conecta caja 2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTA_A');
      expect(result!.sourceCode).toBe('1');
      expect(result!.targetCode).toBe('2');
    });
  });

  // Pattern 4: conectado a / desde / hacia caja|mufla CODE → CONECTADO_A
  describe('pattern 4 — CONECTADO_A', () => {
    it('detects "Mufla Central conectada a caja B.0.4" as CONECTADO_A', () => {
      const result = detector.detect('Mufla Central conectada a caja B.0.4');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('CONECTADO_A');
    });

    it('matches "desde" variant in "Fibra desde caja B.0.4 a caja 3.2" (wins over pattern 5)', () => {
      const result = detector.detect('Fibra desde caja B.0.4 a caja 3.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('CONECTADO_A');
      expect(result!.sourceCode).toBe('b.0.4');
    });
  });

  // Pattern 5: fibra|enlace|link desde|entre caja|mufla CODE a|hacia|y caja|mufla CODE
  describe('pattern 5 — ENLACE_FIBRA', () => {
    it('matches when pattern 4 does not match the "desde" clause', () => {
      const result = detector.detect('enlace entre caja B.0.4 a caja 3.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ENLACE_FIBRA');
      expect(result!.sourceCode).toBe('b.0.4');
      expect(result!.targetCode).toBe('3.2');
    });
  });

  describe('noise rejection', () => {
    it('returns null for "Caja revisada"', () => {
      expect(detector.detect('Caja revisada')).toBeNull();
    });

    it('returns null for "Ok, entendido"', () => {
      expect(detector.detect('Ok, entendido')).toBeNull();
    });

    it('returns null for "Coordenadas: 5.158860, -75.034560"', () => {
      expect(detector.detect('Coordenadas: 5.158860, -75.034560')).toBeNull();
    });
  });

  describe('confidence', () => {
    it('sets confidence to 0.75 for single-group matches', () => {
      const result = detector.detect('Drop desde caja 3.2');
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(0.75);
    });

    it('sets confidence to 0.85 when both source and target are captured', () => {
      const result = detector.detect('mufla 1 conecta caja 2');
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(0.85);
    });
  });
});

// ---------------------------------------------------------------------------
// PatternRelationshipDetector
// ---------------------------------------------------------------------------
describe('PatternRelationshipDetector', () => {
  let detector: PatternRelationshipDetector;

  beforeEach(() => {
    detector = new PatternRelationshipDetector();
  });

  describe('drop pattern — ALIMENTADO_POR', () => {
    it('detects "Drop desde caja 3.2" as ALIMENTADO_POR with sourceCode "CAJA"', () => {
      const result = detector.detect('Drop desde caja 3.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTADO_POR');
      expect(result!.sourceCode).toBe('CAJA');
      expect(result!.confidence).toBe(0.7);
    });
  });

  describe('feed pattern — ALIMENTA_A', () => {
    it('detects "caja 5.1 alimenta caja 8.2" with sourceCode "5.1" and targetCode "CAJA"', () => {
      const result = detector.detect('caja 5.1 alimenta caja 8.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('ALIMENTA_A');
      expect(result!.sourceCode).toBe('5.1');
      expect(result!.targetCode).toBe('CAJA');
    });
  });

  describe('fromTo pattern — CONECTADO_A', () => {
    it('detects "desde B.0.4 a 3.2" as CONECTADO_A with source and target codes', () => {
      const result = detector.detect('desde B.0.4 a 3.2');
      expect(result).not.toBeNull();
      expect(result!.relationType).toBe('CONECTADO_A');
      expect(result!.sourceCode).toBe('B.0.4');
      expect(result!.targetCode).toBe('3.2');
    });
  });

  describe('noise rejection', () => {
    it('returns null for "Caja revisada"', () => {
      expect(detector.detect('Caja revisada')).toBeNull();
    });

    it('returns null for "Ok, entendido"', () => {
      expect(detector.detect('Ok, entendido')).toBeNull();
    });

    it('returns null for "Coordenadas: 5.158860, -75.034560"', () => {
      expect(detector.detect('Coordenadas: 5.158860, -75.034560')).toBeNull();
    });
  });

  it('includes a description in the result', () => {
    const result = detector.detect('caja 5.1 alimenta caja 8.2');
    expect(result).not.toBeNull();
    expect(result!.description).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// RelationshipDetectorOrchestrator
// ---------------------------------------------------------------------------
describe('RelationshipDetectorOrchestrator', () => {
  let orchestrator: RelationshipDetectorOrchestrator;

  beforeEach(() => {
    orchestrator = new RelationshipDetectorOrchestrator();
  });

  describe('phrase pattern detection', () => {
    it('detects "Drop desde caja 3.2" with sourceCode "3.2" and ALIMENTADO_POR', () => {
      const results = orchestrator.detectAll('Drop desde caja 3.2');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.sourceCode === '3.2' && r.relationType === 'ALIMENTADO_POR')).toBe(true);
    });

    it('detects "Drop desde caja 3.2 alimenta caja B.5.1" with sourceCode "3.2"', () => {
      const results = orchestrator.detectAll('Drop desde caja 3.2 alimenta caja B.5.1');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.sourceCode === '3.2')).toBe(true);
    });

    it('detects "Mufla Norte alimenta caja 8.2" as ALIMENTA_A', () => {
      const results = orchestrator.detectAll('Mufla Norte alimenta caja 8.2');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.relationType === 'ALIMENTA_A')).toBe(true);
    });

    it('detects "Mufla Central conectada a caja B.0.4" as CONECTADO_A', () => {
      const results = orchestrator.detectAll('Mufla Central conectada a caja B.0.4');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.relationType === 'CONECTADO_A')).toBe(true);
    });

    it('detects at least one relationship from "Fibra desde caja B.0.4 a caja 3.2"', () => {
      const results = orchestrator.detectAll('Fibra desde caja B.0.4 a caja 3.2');
      expect(results.length).toBeGreaterThan(0);
    });

    it('detects "caja 5.1 alimenta caja 8.2" as ALIMENTA_A with sourceCode "5.1" from PRD', () => {
      const results = orchestrator.detectAll('caja 5.1 alimenta caja 8.2');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.relationType === 'ALIMENTA_A')).toBe(true);
      expect(results.some(r => r.sourceCode === '5.1')).toBe(true);
    });

    it('detects at least one relationship from "mufla este alimenta caja B.0.4 y caja 3.2"', () => {
      const results = orchestrator.detectAll('mufla este alimenta caja B.0.4 y caja 3.2');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.relationType === 'ALIMENTA_A')).toBe(true);
    });
  });

  describe('noise rejection', () => {
    it('returns no relationships for "Caja revisada"', () => {
      expect(orchestrator.detectAll('Caja revisada')).toHaveLength(0);
    });

    it('returns no relationships for "Ok, entendido"', () => {
      expect(orchestrator.detectAll('Ok, entendido')).toHaveLength(0);
    });

    it('returns no relationships for "Coordenadas: 5.158860, -75.034560"', () => {
      expect(orchestrator.detectAll('Coordenadas: 5.158860, -75.034560')).toHaveLength(0);
    });
  });

  describe('confidence filtering', () => {
    it('only returns results with confidence > 0.4', () => {
      const results = orchestrator.detectAll('Mufla Norte alimenta caja 8.2');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.confidence).toBeGreaterThan(0.4);
      });
    });

    it('filters out results with confidence <= 0.4', () => {
      const lowConfidence: RelationshipDetectorStrategy = {
        name: 'low-confidence',
        detect() {
          return {
            sourceCode: 'TEST',
            relationType: 'ALIMENTA_A',
            rawText: 'test',
            confidence: 0.3,
          };
        },
      };
      const custom = new RelationshipDetectorOrchestrator([lowConfidence]);
      expect(custom.detectAll('anything')).toHaveLength(0);
    });
  });

  describe('deduplication', () => {
    it('deduplicates identical relationships from different strategies', () => {
      const duplicate: RelationshipDetectorStrategy = {
        name: 'duplicate',
        detect() {
          return {
            sourceCode: 'NORTE',
            targetCode: '8.2',
            relationType: 'ALIMENTA_A',
            rawText: 'mufla norte alimenta caja 8.2',
            confidence: 0.9,
          };
        },
      };
      const custom = new RelationshipDetectorOrchestrator([duplicate, duplicate]);
      const results = custom.detectAll('mufla norte alimenta caja 8.2');
      expect(results).toHaveLength(1);
    });

    it('keeps distinct relationships when source/target/type differ', () => {
      const results = orchestrator.detectAll('Mufla Norte alimenta caja 8.2');
      const keys = results.map(r => `${r.sourceCode || ''}-${r.targetCode || ''}-${r.relationType}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });

  describe('custom strategy registration', () => {
    it('registers and uses a custom strategy', () => {
      const custom: RelationshipDetectorStrategy = {
        name: 'custom-test',
        detect(text: string) {
          if (text.includes('CUSTOM_REL')) {
            return {
              sourceCode: 'CUSTOM_SRC',
              targetCode: 'CUSTOM_TGT',
              relationType: 'ENLACE_FIBRA',
              rawText: 'custom relationship',
              confidence: 0.95,
            };
          }
          return null;
        },
      };

      orchestrator.registerStrategy(custom);
      const results = orchestrator.detectAll('CUSTOM_REL detected');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.sourceCode === 'CUSTOM_SRC' && r.targetCode === 'CUSTOM_TGT' && r.relationType === 'ENLACE_FIBRA')).toBe(true);
    });

    it('does not affect results when custom strategy returns null', () => {
      const baseline = orchestrator.detectAll('Mufla Norte alimenta caja 8.2');
      const custom: RelationshipDetectorStrategy = {
        name: 'noop',
        detect() {
          return null;
        },
      };
      orchestrator.registerStrategy(custom);
      const withCustom = orchestrator.detectAll('Mufla Norte alimenta caja 8.2');
      expect(withCustom).toEqual(baseline);
    });

    it('skips strategies that throw', () => {
      const throwing: RelationshipDetectorStrategy = {
        name: 'thrower',
        detect() {
          throw new Error('strategy failure');
        },
      };
      orchestrator.registerStrategy(throwing);
      expect(() => orchestrator.detectAll('some text')).not.toThrow();
      const results = orchestrator.detectAll('Mufla Norte alimenta caja 8.2');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('merges results from all registered strategies', () => {
      const results = orchestrator.detectAll('Drop desde caja 3.2');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('each result has required fields populated', () => {
      const results = orchestrator.detectAll('Fibra desde caja B.0.4 a caja 3.2');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.relationType).toBeTruthy();
        expect(r.rawText).toBeTruthy();
        expect(typeof r.confidence).toBe('number');
        expect(r.confidence).toBeGreaterThan(0);
      });
    });

    it('handles empty string gracefully', () => {
      expect(orchestrator.detectAll('')).toHaveLength(0);
    });

    it('handles whitespace-only string gracefully', () => {
      expect(orchestrator.detectAll('   ')).toHaveLength(0);
    });
  });
});
