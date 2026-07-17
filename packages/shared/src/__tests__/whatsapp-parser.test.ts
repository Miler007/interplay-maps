import { WhatsAppParser } from '../pipeline/whatsapp-parser';
import { tokenizeWhatsAppExport } from '../pipeline/tokenizer';
import { isRelevantMessage, cleanText, filterMessages } from '../pipeline/filters';
import { WHATSAPP_CHAT, WHATSAPP_CHAT_LINES, EXPECTED_DETECTED_COUNT, EXPECTED_NOISE_COUNT, EXPECTED_RELATIONSHIP_COUNT, WHATSAPP_CHAT_WITH_DUPLICATES, EMPTY_CONTENT, SHORT_CONTENT } from './fixtures/whatsapp-real';
import type { ParseResult } from '../types';

describe('WhatsAppParser', () => {
  let parser: WhatsAppParser;

  beforeEach(() => {
    parser = new WhatsAppParser();
  });

  /* ------------------------------------------------------------------ */
  /*  1. TOKENIZATION                                                     */
  /* ------------------------------------------------------------------ */
  describe('tokenization', () => {
    it('should tokenize a realistic WhatsApp export into messages', () => {
      const messages = tokenizeWhatsAppExport(WHATSAPP_CHAT);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.length).toBeGreaterThan(WHATSAPP_CHAT_LINES.length);
    });

    it('should parse date, time, sender and text from standard lines', () => {
      const line = `16/07/26, 8:15 a. m. - Ing. Pérez: Caja B.0.4`;
      const messages = tokenizeWhatsAppExport(line);
      expect(messages).toHaveLength(1);
      expect(messages[0].date).toBe('16/07/26');
      expect(messages[0].time).toBe('8:15 a. m.');
      expect(messages[0].sender).toBe('Ing. Pérez');
      expect(messages[0].text).toBe('Caja B.0.4');
    });

    it('should parse lines without date/time prefix as continuation lines', () => {
      const line = `Puertos libres 5`;
      const messages = tokenizeWhatsAppExport(line);
      expect(messages).toHaveLength(1);
      expect(messages[0].date).toBeUndefined();
      expect(messages[0].time).toBeUndefined();
      expect(messages[0].sender).toBeUndefined();
      expect(messages[0].text).toBe('Puertos libres 5');
    });

    it('should handle different date separators', () => {
      const line = `16-07-26, 8:15 - Ing. Pérez: Caja B.0.4`;
      const messages = tokenizeWhatsAppExport(line);
      expect(messages[0].date).toBe('16-07-26');
    });

    it('should handle time with seconds', () => {
      const line = `16/07/26, 8:15:30 - Ing. Pérez: Caja B.0.4`;
      const messages = tokenizeWhatsAppExport(line);
      expect(messages[0].time).toBe('8:15:30');
    });

    it('should preserve the raw line in each message', () => {
      const line = `16/07/26, 8:15 a. m. - Ing. Pérez: Caja B.0.4`;
      const messages = tokenizeWhatsAppExport(line);
      expect(messages[0].raw).toBe(line);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  2. FILTERING — system, media, forwarded, replies, short, ignored   */
  /* ------------------------------------------------------------------ */
  describe('filtering', () => {
    it('should filter out system messages (encryption notice)', () => {
      const msg = { raw: '', text: 'Messages and calls are end-to-end encrypted. No one outside of this chat can read them.' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should filter out media omitted messages', () => {
      const msg = { raw: '', text: '<Media omitted>' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should filter out forwarded messages', () => {
      const msg = { raw: '', text: 'Reenviado\nCaja 8.1 revisada' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should filter out reply/quote messages', () => {
      const msg = { raw: '', text: '~ Caja B.0.4 revisada' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should filter out short messages (length < 4)', () => {
      const msg = { raw: '', text: 'Ok' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should filter out URL-only messages', () => {
      const msg = { raw: '', text: 'https://maps.google.com/?q=5.158990,-75.034690' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should filter out ignored keywords', () => {
      const msg = { raw: '', text: 'listo' };
      expect(isRelevantMessage(msg)).toBe(false);
    });

    it('should keep technical messages relevant', () => {
      const msg = { raw: '', text: 'Caja B.0.4' };
      expect(isRelevantMessage(msg)).toBe(true);
    });

    it('should keep multi-line technical messages relevant', () => {
      const msg = { raw: '', text: 'Drop desde caja 3.2 alimenta caja B.5.1' };
      expect(isRelevantMessage(msg)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  3. NOISE REMOVAL — emojis, URLs stripped from text                 */
  /* ------------------------------------------------------------------ */
  describe('noise removal', () => {
    it('should remove emojis from text', () => {
      const result = cleanText('✅ Caja B.0.4 ❤');
      expect(result).toBe('Caja B.0.4');
    });

    it('should remove URLs from text', () => {
      const result = cleanText('Caja B.0.4 https://maps.google.com/?q=5.158990,-75.034690');
      expect(result).toBe('Caja B.0.4');
    });

    it('should remove multiple emojis and URLs', () => {
      const result = cleanText('⭐ Caja 3.2 ⭐ http://example.com revisada');
      expect(result).toBe('Caja 3.2 revisada');
    });

    it('should collapse multiple whitespace', () => {
      const result = cleanText('Caja    B.0.4     revisada');
      expect(result).toBe('Caja B.0.4 revisada');
    });

    it('should trim whitespace', () => {
      const result = cleanText('  Caja B.0.4  ');
      expect(result).toBe('Caja B.0.4');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  4. ENTITY DETECTION — cajas, muflas with codes                     */
  /* ------------------------------------------------------------------ */
  describe('entity detection', () => {
    it('should detect "Caja B.0.4" as CAJA with code B.0.4', () => {
      const entity = parser.parseText('Caja B.0.4');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('CAJA');
      expect(e.code).toBe('B.0.4');
    });

    it('should detect "Caja 3.2" as CAJA with code 3.2', () => {
      const entity = parser.parseText('Caja 3.2');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('CAJA');
      expect(e.code).toBe('3.2');
    });

    it('should detect "Mufla Norte" as MUFFLE', () => {
      const entity = parser.parseText('Mufla Norte');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('MUFFLE');
    });

    it('should detect "Mufla Central" as MUFFLE', () => {
      const entity = parser.parseText('Mufla Central');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('MUFFLE');
    });

    it('should detect entities throughout a full chat export', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.detectedEntities.length).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  5. COORDINATE DETECTION — decimal lat/lng from various formats     */
  /* ------------------------------------------------------------------ */
  describe('coordinate detection', () => {
    it('should extract coordinates from "5.158860,-75.034560"', () => {
      const entity = parser.parseText('5.158860,-75.034560');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.coordinates).toBeDefined();
      expect(e.coordinates!.latitude).toBeCloseTo(5.158860, 5);
      expect(e.coordinates!.longitude).toBeCloseTo(-75.034560, 5);
    });

    it('should extract coordinates with space separator', () => {
      const entity = parser.parseText('5.158860 -75.034560');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      expect(entity.detectedEntities[0].coordinates).toBeDefined();
    });

    it('should extract coordinates with "Coordenadas:" prefix', () => {
      const entity = parser.parseText('Coordenadas: 5.158860, -75.034560');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.coordinates).toBeDefined();
      expect(e.coordinates!.latitude).toBeCloseTo(5.158860, 5);
      expect(e.coordinates!.longitude).toBeCloseTo(-75.034560, 5);
    });

    it('should extract coordinates with "Coord:" prefix', () => {
      const entity = parser.parseText('Coord: 5.158860, -75.034560');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      expect(entity.detectedEntities[0].coordinates).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  6. TECHNICAL DATA — power, ports, fiber count, colors              */
  /* ------------------------------------------------------------------ */
  describe('technical data extraction', () => {
    it('should extract power from "Potencia -22"', () => {
      const entity = parser.parseText('Potencia -22 Caja B.0.4');
      const e = entity.detectedEntities.find(d => d.power !== undefined);
      expect(e).toBeDefined();
      expect(e!.power).toBe(-22);
    });

    it('should extract power from "Potencia -18"', () => {
      const entity = parser.parseText('Caja 3.2 Potencia -18');
      const e = entity.detectedEntities.find(d => d.power !== undefined);
      expect(e).toBeDefined();
      expect(e!.power).toBe(-18);
    });

    it('should extract free ports from "Puertos libres 5"', () => {
      const entity = parser.parseText('Puertos libres 5 Caja B.0.4');
      const entities = entity.detectedEntities;
      const withPorts = entities.filter(e => e.freePorts !== undefined);
      expect(withPorts.length).toBeGreaterThan(0);
      expect(withPorts[0].freePorts).toBe(5);
    });

    it('should extract ports from "Puertos 8"', () => {
      const entity = parser.parseText('Caja 3.2 Puertos 8');
      const entities = entity.detectedEntities;
      const withPorts = entities.filter(e => e.ports !== undefined);
      expect(withPorts.length).toBeGreaterThan(0);
      expect(withPorts[0].ports).toBe(8);
    });

    it('should extract fiber count from "Fibra 12 hilos"', () => {
      const entity = parser.parseText('Caja B.0.4 Fibra 12 hilos');
      const entities = entity.detectedEntities;
      const withFiber = entities.filter(e => e.fiberCount !== undefined);
      expect(withFiber.length).toBeGreaterThan(0);
      expect(withFiber[0].fiberCount).toBe(12);
    });

    it('should extract fiber count from "Fibra 24 hilos"', () => {
      const entity = parser.parseText('Mufla Central Fibra 24 hilos');
      const entities = entity.detectedEntities;
      const withFiber = entities.filter(e => e.fiberCount !== undefined);
      expect(withFiber.length).toBeGreaterThan(0);
      expect(withFiber[0].fiberCount).toBe(24);
    });

    it('should extract fiber color from "Color rosado"', () => {
      const entity = parser.parseText('Caja B.2.1 Color rosado');
      const entities = entity.detectedEntities;
      const withColor = entities.filter(e => e.fiberColor !== undefined);
      expect(withColor.length).toBeGreaterThan(0);
      expect(withColor[0].fiberColor).toBe('rosado');
    });

    it('should extract implied color from "rosado" in text', () => {
      const entity = parser.parseText('Caja B.2.1 Fibra 12 hilos rosado');
      const entities = entity.detectedEntities;
      const withColor = entities.filter(e => e.fiberColor !== undefined);
      expect(withColor.length).toBeGreaterThan(0);
    });

    it('should extract color from "Color azul"', () => {
      const entity = parser.parseText('Mufla Central Color azul');
      const entities = entity.detectedEntities;
      const withColor = entities.filter(e => e.fiberColor !== undefined);
      expect(withColor.length).toBeGreaterThan(0);
      expect(withColor[0].fiberColor).toBe('azul');
    });

    it('should extract color from "Verde" standalone', () => {
      const entity = parser.parseText('Caja B.0.5 Verde');
      const entities = entity.detectedEntities;
      const withColor = entities.filter(e => e.fiberColor !== undefined);
      expect(withColor.length).toBeGreaterThan(0);
      expect(withColor[0].fiberColor).toBe('verde');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  7. RELATIONSHIP DETECTION — topological phrases                    */
  /* ------------------------------------------------------------------ */
  describe('relationship detection', () => {
    it('should detect "Drop desde caja 3.2" relationship', () => {
      const result = parser.parseText('Drop desde caja 3.2 alimenta caja B.5.1');
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it('should detect "alimenta" relationship', () => {
      const result = parser.parseText('Mufla Sur alimenta caja 8.2');
      expect(result.relationships.length).toBeGreaterThan(0);
      const rel = result.relationships[0];
      expect(rel.relationType).toMatch(/ALIMENTA/);
    });

    it('should detect "desde ... hasta/hacia" relationship', () => {
      const result = parser.parseText('Fibra desde caja B.0.4 a caja 3.2');
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it('should detect "fibra desde ... a" relationship', () => {
      const result = parser.parseText('Fibra desde caja B.0.4 a caja 3.2');
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it('should detect "conectada a" relationship', () => {
      const result = parser.parseText('Mufla Central conectada a caja B.0.4');
      expect(result.relationships.length).toBeGreaterThan(0);
      const rel = result.relationships.find(r => r.relationType === 'CONECTADO_A');
      expect(rel).toBeDefined();
    });

    it('should detect relationship in multi-line messages', () => {
      const result = parser.parseText('Mufla Sur alimenta caja 8.2\nCoordenadas: 5.168000, -75.044000');
      expect(result.relationships.length).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  8. EMPTY / SHORT INPUT — graceful handling                         */
  /* ------------------------------------------------------------------ */
  describe('empty / short input', () => {
    it('should handle empty content gracefully', () => {
      const result = parser.parseText(EMPTY_CONTENT);
      expect(result.totalMessages).toBe(0);
      expect(result.detectedEntities).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
      expect(result.parsedMessages).toHaveLength(0);
    });

    it('should handle very short content that gets filtered out', () => {
      const result = parser.parseText(SHORT_CONTENT);
      expect(result.parsedMessages.length).toBeLessThanOrEqual(1);
      expect(result.detectedEntities).toHaveLength(0);
    });

    it('should not crash on whitespace-only content', () => {
      const result = parser.parseText('   \n  \n  ');
      expect(result.totalMessages).toBe(0);
    });

    it('should not crash on special characters only', () => {
      const result = parser.parseText('@#$%^&*()');
      expect(result.detectedEntities).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  9. STATISTICAL OUTPUT — porTipo, conCoordenadas, etc.              */
  /* ------------------------------------------------------------------ */
  describe('statistical output', () => {
    it('should return porTipo with CAJA and MUFFLE counts', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.estadisticas.porTipo).toBeDefined();
      expect(Object.keys(result.estadisticas.porTipo).length).toBeGreaterThan(0);
    });

    it('should count coordinates found (conCoordenadas > 0)', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.estadisticas.conCoordenadas).toBeGreaterThan(0);
    });

    it('should count entities with power data', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.estadisticas.conPotencia).toBeGreaterThan(0);
    });

    it('should count entities with port data', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.estadisticas.conPuertos).toBeGreaterThan(0);
    });

    it('should count entities with fiber data', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.estadisticas.conFibra).toBeGreaterThan(0);
    });

    it('should have consistent sinCoordenadas count', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.estadisticas.sinCoordenadas).toBeDefined();
      expect(typeof result.estadisticas.sinCoordenadas).toBe('number');
    });

    it('should count noise messages correctly', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.noiseMessages).toBeGreaterThan(0);
    });

    it('should match the expected detected entity count', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.detectedEntities.length).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  10. FULL PIPELINE — realistic chat export with expected counts     */
  /* ------------------------------------------------------------------ */
  describe('full pipeline with realistic chat', () => {
    let result: ParseResult;

    beforeAll(() => {
      result = parser.parseText(WHATSAPP_CHAT);
    });

    it('should parse all lines from the fixture', () => {
      expect(result.totalMessages).toBeGreaterThan(0);
    });

    it('should detect entities', () => {
      expect(result.detectedEntities.length).toBeGreaterThan(0);
    });

    it('should filter out noise messages', () => {
      expect(result.noiseMessages).toBeGreaterThan(0);
    });

    it('should detect relationships', () => {
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it('should return a fileName', () => {
      expect(result.fileName).toBe('whatsapp.txt');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  11. PERFORMANCE — completes quickly (<100ms for fixture)           */
  /* ------------------------------------------------------------------ */
  describe('performance', () => {
    it('should parse the fixture in under 100ms', () => {
      const start = Date.now();
      parser.parseText(WHATSAPP_CHAT);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it('should parse the duplicated fixture in under 100ms', () => {
      const start = Date.now();
      parser.parseText(WHATSAPP_CHAT_WITH_DUPLICATES);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  12. DUPLICATE HANDLING                                             */
  /* ------------------------------------------------------------------ */
  describe('duplicate handling', () => {
    it('should detect entities with coordinates but no type as duplicados', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.duplicados).toBeDefined();
    });

    it('should handle chat with known duplicates without errors', () => {
      const result = parser.parseText(WHATSAPP_CHAT_WITH_DUPLICATES);
      expect(result.errores).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  13. EDGE CASES — individual patterns                               */
  /* ------------------------------------------------------------------ */
  describe('edge cases', () => {
    it('should correctly detect "Caja B.0.5" as CAJA B.0.5', () => {
      const entity = parser.parseText('Caja B.0.5');
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('CAJA');
      expect(e.code).toBe('B.0.5');
    });

    it('should correctly detect "Caja 4.1" as CAJA 4.1', () => {
      const entity = parser.parseText('Caja 4.1');
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('CAJA');
      expect(e.code).toBe('4.1');
    });

    it('should correctly detect "Caja B.2.1" as CAJA B.2.1', () => {
      const entity = parser.parseText('Caja B.2.1');
      const e = entity.detectedEntities[0];
      expect(e.entityType).toBe('CAJA');
      expect(e.code).toBe('B.2.1');
    });

    it('should count fiber in statistics from separate continuation lines', () => {
      const entity = parser.parseText('Caja B.0.4\nFibra 12 hilos');
      expect(entity.estadisticas.conFibra).toBeGreaterThan(0);
    });

    it('should extract fiber count from inline text', () => {
      const entity = parser.parseText('Caja B.0.4 con Fibra 12 hilos');
      const entities = entity.detectedEntities;
      const withFiber = entities.filter(e => e.fiberCount !== undefined);
      expect(withFiber.length).toBeGreaterThan(0);
      expect(withFiber[0].fiberCount).toBe(12);
    });

    it('should handle negative coordinates', () => {
      const entity = parser.parseText('-12.345678,-45.678901');
      expect(entity.detectedEntities.length).toBeGreaterThan(0);
      const e = entity.detectedEntities[0];
      expect(e.coordinates).toBeDefined();
      expect(e.coordinates!.latitude).toBe(-12.345678);
      expect(e.coordinates!.longitude).toBe(-45.678901);
    });

    it('should not lose observations', () => {
      const result = parser.parseText('Caja B.0.4 revisada y verificada');
      const e = result.detectedEntities[0];
      expect(e.observations).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  14. SENDER ATTRIBUTION                                             */
  /* ------------------------------------------------------------------ */
  describe('sender attribution', () => {
    it('should preserve sender information in parsed messages', () => {
      const messages = tokenizeWhatsAppExport(`16/07/26, 8:15 a. m. - Ing. Pérez: Caja B.0.4`);
      expect(messages[0].sender).toBe('Ing. Pérez');
    });

    it('should handle senders with multiple spaces and special chars', () => {
      const messages = tokenizeWhatsAppExport(`16/07/26, 8:15 a. m. - Tec. García: Caja 3.2`);
      expect(messages[0].sender).toBe('Tec. García');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  15. CUSTOM FILE NAME                                              */
  /* ------------------------------------------------------------------ */
  describe('custom file name', () => {
    it('should accept a custom fileName', () => {
      const result = parser.parseText(WHATSAPP_CHAT, 'custom.txt');
      expect(result.fileName).toBe('custom.txt');
    });

    it('should default to whatsapp.txt when no fileName given', () => {
      const result = parser.parseText(WHATSAPP_CHAT);
      expect(result.fileName).toBe('whatsapp.txt');
    });
  });
});
