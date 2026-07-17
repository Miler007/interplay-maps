import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';
import {
  WhatsAppParser,
  EntityExtractorOrchestrator,
  RelationshipDetectorOrchestrator,
} from '@interplay/shared';
import type {
  ParsedMessage, ExtractedData, ExtractedRelationship,
  ParseResult, SimulationResult,
} from '@interplay/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface ImportOptions {
  municipalityId?: string;
  projectId?: string;
  userId?: string;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  readonly MAX_FILE_SIZE = 50 * 1024 * 1024;
  readonly ALLOWED_EXTENSIONS = ['.txt', '.csv', '.xlsx', '.xls', '.kml', '.kmz', '.gpx', '.json'];

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  /** VALIDATE FILE SECURITY */
  async validateFile(file: Express.Multer.File): Promise<void> {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Extensión no permitida: ${ext}. Extensiones válidas: ${this.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`Archivo demasiado grande. Máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    const content = file.buffer.toString('utf-8');
    if (this.detectMaliciousContent(content)) {
      throw new BadRequestException('Archivo rechazado por contenido sospechoso');
    }
  }

  private detectMaliciousContent(content: string): boolean {
    const patterns = [/<script/i, /javascript:/i, /onload=/i, /onerror=/i, /eval\(/i, /exec\(/i, /powershell/i];
    return patterns.some((p) => p.test(content));
  }

  /** SIMULATION — runs full pipeline but writes nothing */
  async simulateImport(file: Express.Multer.File, options: ImportOptions): Promise<SimulationResult> {
    await this.validateFile(file);
    const content = file.buffer.toString('utf-8');
    const startTime = Date.now();

    this.events.emit(EVENT_NAMES.IMPORT.PIPELINE_STAGE, { stage: 'parsing', file: file.originalname });

    const parser = new WhatsAppParser();
    const parseResult = parser.parseFile(content, file.originalname);

    this.events.emit(EVENT_NAMES.IMPORT.PIPELINE_STAGE, {
      stage: 'validation',
      detected: parseResult.detectedEntities.length,
    });

    const recordsToCreate: ExtractedData[] = [];
    const recordsToUpdate: { existing: any; nuevo: ExtractedData }[] = [];
    const duplicados: { original: any; candidate: ExtractedData; distancia: number }[] = [];
    const errores: { entity: ExtractedData; reason: string }[] = [];
    const pendientes: ExtractedData[] = [];
    const porTipo: Record<string, number> = {};

    if (options.municipalityId) {
      const existingAssets = await this.prisma.asset.findMany({
        where: { municipalityId: options.municipalityId },
        select: { id: true, code: true, name: true, latitude: true, longitude: true, assetType: { select: { code: true } } },
      });

      for (const entity of parseResult.detectedEntities) {
        const entityType = entity.entityType || 'CAJA';
        porTipo[entityType] = (porTipo[entityType] || 0) + 1;

        if (!entity.coordinates) {
          pendientes.push(entity);
          continue;
        }

        const duplicate = this.findDuplicate(entity, existingAssets);
        if (duplicate) {
          duplicados.push({ original: duplicate, candidate: entity, distancia: duplicate._distance || 0 });
          continue;
        }

        const matchByCode = entity.code
          ? existingAssets.find((a) => a.code === entity.code)
          : null;

        if (matchByCode) {
          recordsToUpdate.push({ existing: matchByCode, nuevo: entity });
        } else {
          recordsToCreate.push(entity);
        }
      }
    } else {
      for (const entity of parseResult.detectedEntities) {
        const entityType = entity.entityType || 'CAJA';
        porTipo[entityType] = (porTipo[entityType] || 0) + 1;
        if (entity.coordinates) {
          recordsToCreate.push(entity);
        } else {
          pendientes.push(entity);
        }
      }
    }

    return {
      totalMessages: parseResult.totalMessages,
      registrosDetectados: parseResult.detectedEntities.length,
      recordsToCreate,
      recordsToUpdate,
      duplicados,
      errores,
      pendientes,
      relacionesDetectadas: parseResult.relationships,
      estadisticas: {
        total: parseResult.detectedEntities.length,
        aCrear: recordsToCreate.length,
        aActualizar: recordsToUpdate.length,
        duplicados: duplicados.length,
        errores: errores.length,
        pendientes: pendientes.length,
        relaciones: parseResult.relationships.length,
        porTipo,
        tiempoMs: Date.now() - startTime,
      },
    };
  }

  /** ACTUAL IMPORT — executes after simulation confirmation */
  async executeImport(
    file: Express.Multer.File,
    options: ImportOptions,
    simulation: SimulationResult,
  ): Promise<any> {
    const startTime = Date.now();
    const importId = crypto.randomUUID();
    const municipalityId = options.municipalityId;

    if (!municipalityId) {
      throw new BadRequestException('municipalityId es requerido');
    }

    const municipality = await this.prisma.municipality.findUnique({
      where: { id: municipalityId },
      select: { id: true, departmentId: true, name: true },
    });
    if (!municipality) throw new BadRequestException('Municipio no encontrado');

    this.events.emit(EVENT_NAMES.IMPORT.STARTED, {
      importId,
      source: 'WHATSAPP',
      file: file.originalname,
      municipality: municipality.name,
    });

    const importRecord = await this.prisma.importRecord.create({
      data: {
        id: importId,
        source: 'WHATSAPP',
        filename: file.originalname,
        departmentId: municipality.departmentId,
        municipalityId,
        projectId: options.projectId || undefined,
        totalRecords: simulation.registrosDetectados,
        validRecords: simulation.recordsToCreate.length + simulation.recordsToUpdate.length,
        duplicateRecords: simulation.duplicados.length,
        pendingReview: simulation.pendientes.length,
        importedById: options.userId,
        rawPreview: file.buffer.toString('utf-8').slice(0, 500),
      },
    });

    await this.logImport(importId, 'execution', 'INFO', 'Iniciando importación', {
      toCreate: simulation.recordsToCreate.length,
      toUpdate: simulation.recordsToUpdate.length,
    });

    const detalles: any[] = [];

    for (const entity of simulation.recordsToCreate) {
      try {
        const typeCode = entity.entityType === 'MUFFLE' ? 'MUFLAS' : 'CAJAS';
        let assetType = await this.prisma.assetType.findUnique({ where: { code: typeCode } });
        if (!assetType) {
          assetType = await this.prisma.assetType.create({
            data: { code: typeCode, name: typeCode, prefix: typeCode.substring(0, 3) },
          });
        }

        const existingCode = entity.code
          ? await this.prisma.asset.findUnique({ where: { code: entity.code } })
          : null;
        const finalCode = existingCode
          ? `${entity.code}-${Date.now()}`
          : entity.code || `IMP-${importId.slice(0, 8)}-${detalles.length + 1}`;

        const asset = await this.prisma.asset.create({
          data: {
            code: finalCode,
            name: entity.name || `${typeCode} ${entity.code || detalles.length + 1}`,
            assetTypeId: assetType.id,
            departmentId: municipality.departmentId,
            municipalityId,
            projectId: options.projectId || undefined,
            latitude: entity.coordinates?.latitude || null,
            longitude: entity.coordinates?.longitude || null,
            status: 'ACTIVO',
            observations: entity.observations || null,
            createdById: options.userId,
          },
        });

        if (entity.coordinates) {
          await this.prisma.geometry.create({
            data: {
              assetId: asset.id,
              geojson: {
                type: 'Point',
                coordinates: [entity.coordinates.longitude, entity.coordinates.latitude],
              },
              srid: 4326,
            },
          });
        }

        await this.createAttributes(asset.id, entity);
        await this.createRelationships(asset.id, entity, simulation.relacionesDetectadas);

        detalles.push({ tipo: typeCode, codigo: finalCode, estado: 'creado' });
      } catch (err: any) {
        detalles.push({ tipo: entity.entityType || '?', codigo: entity.code, estado: 'error', mensaje: err.message });
      }
    }

    for (const item of simulation.recordsToUpdate) {
      try {
        await this.prisma.asset.update({
          where: { id: item.existing.id },
          data: {
            latitude: item.nuevo.coordinates?.latitude ?? item.existing.latitude,
            longitude: item.nuevo.coordinates?.longitude ?? item.existing.longitude,
            observations: item.nuevo.observations || item.existing.observations,
            status: 'ACTIVO',
          },
        });

        if (item.nuevo.coordinates) {
          await this.prisma.geometry.upsert({
            where: { assetId: item.existing.id },
            create: {
              assetId: item.existing.id,
              geojson: { type: 'Point', coordinates: [item.nuevo.coordinates.longitude, item.nuevo.coordinates.latitude] },
              srid: 4326,
            },
            update: {
              geojson: { type: 'Point', coordinates: [item.nuevo.coordinates.longitude, item.nuevo.coordinates.latitude] },
            },
          });
        }

        await this.createRelationships(item.existing.id, item.nuevo, simulation.relacionesDetectadas, false);
        detalles.push({ tipo: item.nuevo.entityType || '?', codigo: item.nuevo.code, estado: 'actualizado' });
      } catch (err: any) {
        detalles.push({ tipo: item.nuevo.entityType || '?', codigo: item.nuevo.code, estado: 'error', mensaje: err.message });
      }
    }

    for (const entity of simulation.pendientes) {
      try {
        await this.prisma.validationQueue.create({
          data: {
            rawData: entity as any,
            suggestedName: entity.name,
            suggestedLatitude: entity.coordinates?.latitude || null,
            suggestedLongitude: entity.coordinates?.longitude || null,
            reason: 'Coordenadas faltantes',
            status: 'PENDIENTE',
          },
        });
        detalles.push({ tipo: entity.entityType || '?', codigo: entity.code, estado: 'pendiente' });
      } catch (err: any) {
        detalles.push({ tipo: entity.entityType || '?', codigo: entity.code, estado: 'error', mensaje: err.message });
      }
    }

    for (const dup of simulation.duplicados) {
      try {
        await this.prisma.validationQueue.create({
          data: {
            rawData: dup.candidate as any,
            suggestedName: dup.candidate.name,
            suggestedLatitude: dup.candidate.coordinates?.latitude || null,
            suggestedLongitude: dup.candidate.coordinates?.longitude || null,
            reason: `Posible duplicado de ${dup.original.code} (${dup.distancia.toFixed(1)}m)`,
            status: 'PENDIENTE',
          },
        });
        detalles.push({ tipo: dup.candidate.entityType || '?', codigo: dup.candidate.code, estado: 'duplicado' });
      } catch (err: any) {
        detalles.push({ tipo: dup.candidate.entityType || '?', codigo: dup.candidate.code, estado: 'error', mensaje: err.message });
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const stats = this.calculateStats(detalles);

    await this.prisma.importRecord.update({
      where: { id: importId },
      data: {
        validRecords: stats.creados + stats.actualizados,
        duplicateRecords: stats.duplicados,
        pendingReview: stats.pendientes,
      },
    });

    await this.logImport(importId, 'completion', 'INFO', 'Importación completada', {
      elapsed: `${elapsed.toFixed(1)}s`,
      stats,
    });

    this.events.emit(EVENT_NAMES.IMPORT.COMPLETED, {
      importId,
      file: file.originalname,
      stats,
      elapsed,
    });

    return {
      importId,
      fileName: file.originalname,
      totalMessages: simulation.totalMessages,
      registrosDetectados: simulation.registrosDetectados,
      ...stats,
      tiempoSegundos: parseFloat(elapsed.toFixed(1)),
      detalles,
    };
  }

  /** FULL PIPELINE: validate → simulate → ask user → execute */
  async runFullPipeline(
    file: Express.Multer.File,
    options: ImportOptions & { confirmed?: boolean; simulation?: SimulationResult },
  ): Promise<any> {
    if (options.confirmed && options.simulation) {
      return this.executeImport(file, options, options.simulation);
    }
    return this.simulateImport(file, options);
  }

  /** FIND DUPLICATE CANDIDATES */
  private findDuplicate(entity: ExtractedData, existingAssets: any[]): any | null {
    if (!entity.coordinates) return null;
    const threshold = 5;

    for (const asset of existingAssets) {
      if (!asset.latitude || !asset.longitude) continue;
      const dist = this.haversine(
        entity.coordinates.latitude,
        entity.coordinates.longitude,
        asset.latitude,
        asset.longitude,
      );
      if (dist <= threshold) {
        const nameSimilar = entity.code && asset.code
          ? this.nameSimilarity(entity.code, asset.code) > 0.6
          : false;
        if (nameSimilar || dist <= 2) {
          return { ...asset, _distance: dist };
        }
      }
    }
    return null;
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private nameSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const maxDist = Math.ceil(longer.length / 2);
    if (Math.abs(longer.length - shorter.length) > maxDist) return 0;
    const levDistance = this.levenshteinDistance(longer, shorter);
    return 1 - levDistance / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private async createAttributes(assetId: string, entity: ExtractedData): Promise<void> {
    if (entity.power !== undefined) {
      const def = await this.prisma.attributeDefinition.findFirst({
        where: { code: 'potencia' },
      });
      if (def) {
        await this.prisma.assetAttribute.create({
          data: { assetId, definitionId: def.id, value: String(entity.power) },
        }).catch(() => {});
      }
    }
    if (entity.ports !== undefined) {
      const def = await this.prisma.attributeDefinition.findFirst({
        where: { code: 'puertos' },
      });
      if (def) {
        await this.prisma.assetAttribute.create({
          data: { assetId, definitionId: def.id, value: String(entity.ports) },
        }).catch(() => {});
      }
    }
    if (entity.fiberColor) {
      const def = await this.prisma.attributeDefinition.findFirst({
        where: { code: 'color' },
      });
      if (def) {
        await this.prisma.assetAttribute.create({
          data: { assetId, definitionId: def.id, value: entity.fiberColor },
        }).catch(() => {});
      }
    }
  }

  private async createRelationships(
    assetId: string,
    entity: ExtractedData,
    allRelationships: ExtractedRelationship[],
    createInverse = true,
  ): Promise<void> {
    const relevantRelationships = allRelationships.filter((r) => {
      if (!entity.code) return false;
      return r.sourceCode === entity.code || r.targetCode === entity.code;
    });

    for (const rel of relevantRelationships) {
      const targetIsOther = rel.targetCode && rel.targetCode !== entity.code;
      const otherCode = targetIsOther ? rel.targetCode : rel.sourceCode;

      if (!otherCode) continue;
      const otherAsset = await this.prisma.asset.findUnique({ where: { code: otherCode } });
      if (!otherAsset) continue;

      await this.prisma.assetRelationship.create({
        data: {
          sourceAssetId: targetIsOther ? assetId : otherAsset.id,
          targetAssetId: targetIsOther ? otherAsset.id : assetId,
          relationType: rel.relationType,
          description: rel.description || rel.rawText,
          metadata: { detectedFrom: 'whatsapp-import', confidence: rel.confidence },
        },
      }).catch(() => {});
    }
  }

  private async logImport(importId: string, stage: string, level: string, message: string, details?: any) {
    await this.prisma.importLog.create({
      data: {
        importId,
        stage,
        level: level as any,
        message,
        details: details || undefined,
      },
    }).catch(() => {});
  }

  private calculateStats(detalles: any[]) {
    return {
      creados: detalles.filter((d) => d.estado === 'creado').length,
      actualizados: detalles.filter((d) => d.estado === 'actualizado').length,
      duplicados: detalles.filter((d) => d.estado === 'duplicado').length,
      errores: detalles.filter((d) => d.estado === 'error').length,
      pendientes: detalles.filter((d) => d.estado === 'pendiente').length,
    };
  }

  async getImportHistory() {
    return this.prisma.importRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { logs: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
  }

  async getImportById(id: string) {
    return this.prisma.importRecord.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
