import { generateAssetCode, normalizeName, isValidCoordinate, isWithinBounds, haversineDistance, isDuplicate, parseWhatsapCoordinate, extractAssetName, parseWhatsAppExport, calculateConfidenceScore } from '../utils';

describe('generateAssetCode', () => {
  it('generates MUFLAS code with prefix MUF', () => {
    expect(generateAssetCode('MUFLAS', 1)).toBe('MUF-000001');
  });
  it('generates CAJAS code with prefix CAJ', () => {
    expect(generateAssetCode('CAJAS', 42)).toBe('CAJ-000042');
  });
  it('pads sequence to 6 digits', () => {
    expect(generateAssetCode('CAJAS', 999999)).toBe('CAJ-999999');
  });
});

describe('normalizeName', () => {
  it('trims whitespace', () => {
    expect(normalizeName('  caja 1  ')).toBe('Caja 1');
  });
  it('removes special characters', () => {
    expect(normalizeName('caja@#1')).toBe('Caja1');
  });
  it('capitalizes first letter of each word', () => {
    expect(normalizeName('caja central norte')).toBe('Caja Central Norte');
  });
  it('handles spanish accents', () => {
    expect(normalizeName('mufla pública')).toBe('Mufla Pública');
  });
});

describe('isValidCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(isValidCoordinate(5.158860, -75.034560)).toBe(true);
  });
  it('rejects lat > 90', () => {
    expect(isValidCoordinate(100, -75)).toBe(false);
  });
  it('rejects lng > 180', () => {
    expect(isValidCoordinate(5, 200)).toBe(false);
  });
  it('rejects lat < -90', () => {
    expect(isValidCoordinate(-100, -75)).toBe(false);
  });
  it('rejects lng < -180', () => {
    expect(isValidCoordinate(5, -200)).toBe(false);
  });
  it('accepts boundary values', () => {
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
  });
});

describe('isWithinBounds', () => {
  const bounds = { north: 6, south: 4, east: -74, west: -76 };
  it('returns true for coords within bounds', () => {
    expect(isWithinBounds({ latitude: 5, longitude: -75 }, bounds)).toBe(true);
  });
  it('returns false for coords outside bounds', () => {
    expect(isWithinBounds({ latitude: 10, longitude: -75 }, bounds)).toBe(false);
  });
});

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance({ latitude: 5.158860, longitude: -75.034560 }, { latitude: 5.158860, longitude: -75.034560 })).toBe(0);
  });
  it('calculates ~10m distance correctly', () => {
    const d = haversineDistance({ latitude: 5.158860, longitude: -75.034560 }, { latitude: 5.158950, longitude: -75.034560 });
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(11);
  });
  it('calculates ~1km distance', () => {
    const d = haversineDistance({ latitude: 5.15, longitude: -75.03 }, { latitude: 5.16, longitude: -75.03 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1200);
  });
});

describe('isDuplicate', () => {
  it('returns true when points are within threshold', () => {
    expect(isDuplicate({ latitude: 5.158860, longitude: -75.034560 }, { latitude: 5.158861, longitude: -75.034561 }, 5)).toBe(true);
  });
  it('returns false when points are far apart', () => {
    expect(isDuplicate({ latitude: 5.158860, longitude: -75.034560 }, { latitude: 6.2, longitude: -76.5 }, 5)).toBe(false);
  });
});

describe('parseWhatsapCoordinate', () => {
  it('extracts from "5.158860,-75.034560"', () => {
    expect(parseWhatsapCoordinate('5.158860,-75.034560')).toEqual({ latitude: 5.158860, longitude: -75.034560 });
  });
  it('extracts with space separator', () => {
    expect(parseWhatsapCoordinate('5.158860 -75.034560')).toEqual({ latitude: 5.158860, longitude: -75.034560 });
  });
  it('extracts with "coord:" prefix', () => {
    expect(parseWhatsapCoordinate('coordenadas: 5.158860, -75.034560')).toEqual({ latitude: 5.158860, longitude: -75.034560 });
  });
  it('returns null for invalid coords', () => {
    expect(parseWhatsapCoordinate('texto sin coordenadas')).toBeNull();
  });
});

describe('extractAssetName', () => {
  it('extracts caja name', () => {
    const name = extractAssetName('Caja B.0.4 en la esquina', 'CAJA');
    expect(name).not.toBeNull();
    expect(name!.toLowerCase()).toContain('caja');
  });
  it('extracts mufla name', () => {
    const name = extractAssetName('Mufla Norte revisada', 'MUFFLE');
    expect(name).not.toBeNull();
    expect(name!.toLowerCase()).toContain('muffle');
  });
  it('returns null when no match', () => {
    expect(extractAssetName('Revisando instalación', 'CAJA')).toBeNull();
  });
});

describe('calculateConfidenceScore', () => {
  it('returns 0 for no factors', () => {
    expect(calculateConfidenceScore({ validCoordinates: false, nameIdentified: false, noDuplicates: false, hasPhoto: false, reviewedByAdmin: false })).toBe(0);
  });
  it('returns 30 for valid coords only', () => {
    expect(calculateConfidenceScore({ validCoordinates: true, nameIdentified: false, noDuplicates: false, hasPhoto: false, reviewedByAdmin: false })).toBe(30);
  });
  it('returns 100 when all factors are true', () => {
    expect(calculateConfidenceScore({ validCoordinates: true, nameIdentified: true, noDuplicates: true, hasPhoto: true, reviewedByAdmin: true })).toBe(100);
  });
  it('caps at 100', () => {
    // Sum of all weights is 100, so this should never exceed 100
    const score = calculateConfidenceScore({ validCoordinates: true, nameIdentified: true, noDuplicates: true, hasPhoto: true, reviewedByAdmin: true });
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('parseWhatsAppExport', () => {
  it('parses chat lines with data', () => {
    const lines = ['Caja B.0.4 5.158860,-75.034560', 'Mufla Norte 5.168000,-75.044000'];
    const result = parseWhatsAppExport(lines.join('\n'));
    expect(result.length).toBeGreaterThan(0);
  });
  it('returns empty for empty input', () => {
    expect(parseWhatsAppExport('')).toEqual([]);
  });
  it('handles short lines', () => {
    expect(parseWhatsAppExport('ok')).toEqual([]);
  });
});
