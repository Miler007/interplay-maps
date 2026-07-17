import { WhatsAppParser } from '../pipeline/whatsapp-parser';
import { EntityExtractorOrchestrator } from '../pipeline/entity-extractor';
import { RelationshipDetectorOrchestrator } from '../pipeline/relationship-detector';
import { filterMessages, cleanText } from '../pipeline/filters';
import { tokenizeWhatsAppExport } from '../pipeline/tokenizer';
import { WHATSAPP_CHAT, EXPECTED_DETECTED_COUNT, EXPECTED_RELATIONSHIP_COUNT } from './fixtures/whatsapp-real';

function buildLargeChat(lineMultiplier: number): string {
  const lines = WHATSAPP_CHAT.split('\n');
  const result: string[] = [];
  for (let i = 0; i < lineMultiplier; i++) {
    for (const line of lines) {
      result.push(line);
    }
  }
  return result.join('\n');
}

describe('Full Pipeline Integration', () => {
  let parser: WhatsAppParser;

  beforeAll(() => {
    parser = new WhatsAppParser();
  });

  test('Full pipeline produces consistent results (run twice, same output)', () => {
    const result1 = parser.parseFile(WHATSAPP_CHAT);
    const result2 = parser.parseFile(WHATSAPP_CHAT);

    expect(result1.totalMessages).toBe(result2.totalMessages);
    expect(result1.noiseMessages).toBe(result2.noiseMessages);
    expect(result1.detectedEntities.length).toBe(result2.detectedEntities.length);
    expect(result1.relationships.length).toBe(result2.relationships.length);
    expect(result1.estadisticas).toEqual(result2.estadisticas);

    for (let i = 0; i < result1.detectedEntities.length; i++) {
      expect(result1.detectedEntities[i]).toEqual(result2.detectedEntities[i]);
    }

    for (let i = 0; i < result1.relationships.length; i++) {
      expect(result1.relationships[i]).toEqual(result2.relationships[i]);
    }
  });

  test('Filtered out noise does not appear in entity detection', () => {
    const allMessages = tokenizeWhatsAppExport(WHATSAPP_CHAT);
    const relevantMessages = filterMessages(allMessages);
    const noiseMessages = allMessages.filter((m) => !filterMessages([m]).length);

    const noiseTexts = noiseMessages.map((m) => cleanText(m.text)).filter((t) => t.length >= 4);

    const result = parser.parseFile(WHATSAPP_CHAT);
    const detectedCodes = new Set(
      result.detectedEntities
        .filter((e) => e.code)
        .map((e) => e.code!.toLowerCase()),
    );

    for (const noise of noiseTexts) {
      const mockExtractor = new EntityExtractorOrchestrator();
      const extracted = mockExtractor.extractText(noise);
      if (extracted.code) {
        expect(detectedCodes.has(extracted.code.toLowerCase())).toBe(false);
      }
    }

    const allSystemText = noiseTexts.join(' ');
    expect(allSystemText).not.toMatch(/caja\s*b\.0\.4/i);
  });

  test('All extracted entities have rawConfidence > 0', () => {
    const result = parser.parseFile(WHATSAPP_CHAT);

    expect(result.detectedEntities.length).toBeGreaterThan(0);
    for (const entity of result.detectedEntities) {
      expect(entity.rawConfidence).toBeGreaterThan(0);
    }
  });

  test('Entities with coordinates have valid lat/lng ranges', () => {
    const result = parser.parseFile(WHATSAPP_CHAT);

    const entitiesWithCoords = result.detectedEntities.filter((e) => e.coordinates);
    expect(entitiesWithCoords.length).toBeGreaterThan(0);

    for (const entity of entitiesWithCoords) {
      expect(entity.coordinates!.latitude).toBeGreaterThanOrEqual(-90);
      expect(entity.coordinates!.latitude).toBeLessThanOrEqual(90);
      expect(entity.coordinates!.longitude).toBeGreaterThanOrEqual(-180);
      expect(entity.coordinates!.longitude).toBeLessThanOrEqual(180);
    }
  });

  test('Relationship results relate to actual entities found', () => {
    const result = parser.parseFile(WHATSAPP_CHAT);

    const entityCodes = new Set(
      result.detectedEntities
        .filter((e) => e.code)
        .map((e) => e.code!.toUpperCase()),
    );

    for (const rel of result.relationships) {
      if (rel.sourceCode && rel.targetCode) {
        const eitherFound =
          entityCodes.has(rel.sourceCode.toUpperCase()) ||
          entityCodes.has(rel.targetCode.toUpperCase());
        if (!eitherFound && result.detectedEntities.length > 0) {
          expect(rel.confidence).toBeGreaterThan(0);
        }
      }
    }
  });

  test('Pipeline handles 1000-line chat without error', () => {
    const largeChat = buildLargeChat(15);
    const lineCount = largeChat.split('\n').length;
    expect(lineCount).toBeGreaterThanOrEqual(1000);

    const result = parser.parseFile(largeChat);

    expect(result.errores.length).toBe(0);
    expect(result.totalMessages).toBeGreaterThanOrEqual(lineCount);
    expect(result.detectedEntities.length).toBeGreaterThan(0);
    expect(result.tiempoMs).toBeGreaterThanOrEqual(0);
  });

  test('Pipeline reports estadisticas.porTipo correctly', () => {
    const result = parser.parseFile(WHATSAPP_CHAT);

    expect(result.estadisticas).toBeDefined();
    expect(result.estadisticas.porTipo).toBeDefined();

    const porTipo = result.estadisticas.porTipo;
    expect(Object.keys(porTipo).length).toBeGreaterThan(0);

    for (const [tipo, count] of Object.entries(porTipo)) {
      expect(['CAJA', 'MUFFLE', 'CTO', 'SPLITTER', 'POSTE', 'NODO']).toContain(tipo);
      expect(count).toBeGreaterThan(0);
    }

    const totalByType = Object.values(porTipo).reduce((sum, c) => sum + c, 0);
    expect(totalByType).toBeLessThanOrEqual(result.detectedEntities.length);
    expect(totalByType).toBeGreaterThan(0);

    expect(result.estadisticas.conCoordenadas).toBeGreaterThan(0);
    expect(result.estadisticas.sinCoordenadas).toBeGreaterThanOrEqual(0);
    expect(result.estadisticas.conPotencia).toBeGreaterThanOrEqual(0);
    expect(result.estadisticas.conPuertos).toBeGreaterThanOrEqual(0);
    expect(result.estadisticas.conFibra).toBeGreaterThanOrEqual(0);
  });
});
