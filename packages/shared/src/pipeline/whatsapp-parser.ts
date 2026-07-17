import type { ParsedMessage, ExtractedData, ExtractedRelationship, ParseResult } from '../types';
import { tokenizeWhatsAppExport, extractTextOnly } from './tokenizer';
import { filterMessages, cleanText } from './filters';
import { EntityExtractorOrchestrator } from './entity-extractor';
import { RelationshipDetectorOrchestrator } from './relationship-detector';

export class WhatsAppParser {
  private entityExtractor: EntityExtractorOrchestrator;
  private relationshipDetector: RelationshipDetectorOrchestrator;

  constructor(
    entityExtractor?: EntityExtractorOrchestrator,
    relationshipDetector?: RelationshipDetectorOrchestrator,
  ) {
    this.entityExtractor = entityExtractor || new EntityExtractorOrchestrator();
    this.relationshipDetector = relationshipDetector || new RelationshipDetectorOrchestrator();
  }

  parseFile(content: string, fileName = 'whatsapp.txt'): ParseResult {
    const startTime = Date.now();

    const allMessages = tokenizeWhatsAppExport(content);
    const totalMessages = allMessages.length;
    const relevantMessages = filterMessages(allMessages);
    const noiseMessages = totalMessages - relevantMessages.length;

    const texts = relevantMessages.map((m) => cleanText(m.text)).filter((t) => t.length >= 4);
    const errores: string[] = [];
    const detectedEntities: ExtractedData[] = [];
    const allRelationships: ExtractedRelationship[] = [];
    const duplicados: ExtractedData[] = [];
    const porTipo: Record<string, number> = {};
    let conCoordenadas = 0;
    let sinCoordenadas = 0;
    let conPotencia = 0;
    let conPuertos = 0;
    let conFibra = 0;

    for (const text of texts) {
      try {
        const entity = this.entityExtractor.extractText(text);

        if (entity.entityType) {
          porTipo[entity.entityType] = (porTipo[entity.entityType] || 0) + 1;
        }
        if (entity.coordinates) {
          conCoordenadas++;
        } else {
          sinCoordenadas++;
        }
        if (entity.power !== undefined) conPotencia++;
        if (entity.ports !== undefined || entity.freePorts !== undefined) conPuertos++;
        if (entity.fiberCount !== undefined) conFibra++;

        if (entity.entityType || entity.coordinates) {
          entity.observations = entity.observations || undefined;
          detectedEntities.push(entity);
        }

        const relationships = this.relationshipDetector.detectAll(text);
        allRelationships.push(...relationships);

        if (entity.coordinates && !entity.entityType) {
          duplicados.push(entity);
        }
      } catch (err: any) {
        errores.push(`Error procesando texto: ${err.message}`);
      }
    }

    const tiempoMs = Date.now() - startTime;

    return {
      fileName,
      totalMessages,
      parsedMessages: relevantMessages,
      detectedEntities,
      relationships: allRelationships,
      noiseMessages,
      duplicados,
      estadisticas: {
        porTipo,
        conCoordenadas,
        sinCoordenadas,
        conPotencia,
        conPuertos,
        conFibra,
      },
      errores,
      tiempoMs,
    };
  }

  parseText(text: string, fileName?: string): ParseResult {
    return this.parseFile(text, fileName);
  }
}
