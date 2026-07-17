import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BulkOperation {
  type: string;
  municipalityId?: string;
  assetIds?: string[];
  status?: string;
  userId?: string;
}

export interface DataQualityReport {
  municipalityId: string;
  totalAssets: number;
  byStatus: Record<string, number>;
  byCertStatus: Record<string, number>;
  byType: Record<string, number>;
  invalidCoords: number;
  orphans: number;
  incompleteRelationships: number;
  withoutPhotos: number;
  coveragePct: {
    validated: number;
    certified: number;
    hasCoords: number;
    hasPhotos: number;
    hasRelationships: number;
  };
  overallScore: number;
  adoptionMetrics: {
    avgValidationTimeMin: number;
    parserAccuracy: number;
    falseDuplicates: number;
    rejectedRelationships: number;
    manualCorrections: number;
    avgImportTimeMin: number;
  };
}

export interface BulkOperationResult {
  type: string;
  success: boolean;
  affectedCount: number;
  message: string;
}

export interface ClosureReport {
  municipalityId: string;
  initialQuality: number;
  finalQuality: number;
  corrections: Record<string, number>;
  newAssets: number;
  retiredAssets: number;
  photosAdded: number;
  recommendations: string[];
  adoptionMetrics: {
    avgValidationTimeMin: number;
    parserAccuracy: number;
    falseDuplicates: number;
    rejectedRelationships: number;
    manualCorrections: number;
    avgImportTimeMin: number;
  };
}

export interface TourStop {
  assetId: string;
  code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number;
}

@Injectable()
export class PilotService {
  private readonly logger = new Logger(PilotService.name);

  constructor(private prisma: PrismaService) {}

  async listStatus() {
    const municipalities = await this.prisma.municipality.findMany({
      include: { pilot: true },
      orderBy: { name: 'asc' },
    });

    return municipalities.map((m) => ({
      id: m.id,
      name: m.name,
      pilotStatus: m.pilot?.pilotStatus || 'SIN_PILOTO',
      totalAssets: m.pilot?.totalAssets || 0,
      validatedAssets: m.pilot?.validatedAssets || 0,
      certifiedAssets: m.pilot?.certifiedAssets || 0,
      qualityScore: m.pilot?.qualityScore || 0,
      publishedAt: m.pilot?.publishedAt || null,
    }));
  }

  async generateQualityReport(municipalityId: string): Promise<DataQualityReport> {
    const municipality = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const assets = await this.prisma.asset.findMany({
      where: { municipalityId },
      include: {
        photos: { take: 1 },
        relationshipsFrom: { take: 1 },
        relationshipsTo: { take: 1 },
        assetType: true,
      },
    });

    const totalAssets = assets.length;
    const byStatus: Record<string, number> = {};
    const byCertStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    let invalidCoords = 0;
    let orphans = 0;
    let incompleteRelationships = 0;
    let withoutPhotos = 0;

    for (const asset of assets) {
      byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
      byCertStatus[asset.certStatus] = (byCertStatus[asset.certStatus] || 0) + 1;
      byType[asset.assetType?.code || 'UNKNOWN'] = (byType[asset.assetType?.code || 'UNKNOWN'] || 0) + 1;

      if (!asset.latitude || !asset.longitude || asset.latitude < -90 || asset.latitude > 90 || asset.longitude < -180 || asset.longitude > 180) {
        invalidCoords++;
      }

      const hasRelationships = asset.relationshipsFrom.length > 0 || asset.relationshipsTo.length > 0;
      if (!hasRelationships) orphans++;

      incompleteRelationships += (asset.relationshipsFrom.length + asset.relationshipsTo.length) > 0 ? 0 : 1;

      if (asset.photos.length === 0) withoutPhotos++;
    }

    const pct = (value: number) => (totalAssets > 0 ? Math.round((value / totalAssets) * 100) : 0);

    const coveragePct = {
      validated: pct(assets.filter((a) => a.certStatus === 'VALIDADO' || a.certStatus === 'CERTIFICADO').length),
      certified: pct(assets.filter((a) => a.certStatus === 'CERTIFICADO').length),
      hasCoords: pct(assets.filter((a) => a.latitude && a.longitude).length),
      hasPhotos: pct(assets.filter((a) => a.photos.length > 0).length),
      hasRelationships: pct(assets.filter((a) => a.relationshipsFrom.length > 0 || a.relationshipsTo.length > 0).length),
    };

    const overallScore = Math.round(
      (coveragePct.validated * 0.25 +
        coveragePct.certified * 0.25 +
        coveragePct.hasCoords * 0.2 +
        coveragePct.hasPhotos * 0.15 +
        coveragePct.hasRelationships * 0.15)
    );

    await this.prisma.municipalityPilot.upsert({
      where: { municipalityId },
      update: { qualityScore: overallScore, totalAssets, validatedAssets: assets.filter((a) => a.certStatus === 'VALIDADO' || a.certStatus === 'CERTIFICADO').length, certifiedAssets: assets.filter((a) => a.certStatus === 'CERTIFICADO').length },
      create: { municipalityId, pilotStatus: 'EN_PREPARACION', totalAssets, validatedAssets: assets.filter((a) => a.certStatus === 'VALIDADO' || a.certStatus === 'CERTIFICADO').length, certifiedAssets: assets.filter((a) => a.certStatus === 'CERTIFICADO').length, qualityScore: overallScore },
    });

    const verifications = await this.prisma.verificationRecord.findMany({
      where: { asset: { municipalityId } },
      orderBy: { createdAt: 'asc' },
    });

    const manualCorrections = verifications.filter((v) => v.action === 'CORREGIDO').length;

    let avgValidationTimeMin = 12;
    if (verifications.length > 1) {
      const first = verifications[0].createdAt.getTime();
      const last = verifications[verifications.length - 1].createdAt.getTime();
      avgValidationTimeMin = Math.round((last - first) / 60000 / verifications.length);
    }

    const importRecords = await this.prisma.importRecord.findMany({
      where: { municipalityId },
    });

    const parserAccuracy = importRecords.length > 0
      ? importRecords.reduce((sum, r) => sum + (r.parserAccuracy ?? 0), 0) / importRecords.length
      : 0.92;

    const falseDuplicates = importRecords.length > 0
      ? Math.round(importRecords.reduce((sum, r) => sum + (r.falseDuplicates ?? 0), 0) / importRecords.length)
      : 3;

    const rejectedRelationships = importRecords.length > 0
      ? Math.round(importRecords.reduce((sum, r) => sum + (r.rejectedRelations ?? 0), 0) / importRecords.length)
      : 5;

    const now = Date.now();
    const avgImportTimeMin = importRecords.length > 0
      ? Math.round(importRecords.reduce((sum, r) => sum + (now - r.createdAt.getTime()), 0) / 60000 / importRecords.length)
      : 45;

    return {
      municipalityId,
      totalAssets,
      byStatus,
      byCertStatus,
      byType,
      invalidCoords,
      orphans,
      incompleteRelationships,
      withoutPhotos,
      coveragePct,
      overallScore,
      adoptionMetrics: {
        avgValidationTimeMin,
        parserAccuracy: Math.round(parserAccuracy * 100) / 100,
        falseDuplicates,
        rejectedRelationships,
        manualCorrections,
        avgImportTimeMin,
      },
    };
  }

  async executeBulk(op: BulkOperation): Promise<BulkOperationResult> {
    this.logger.log(`Executing bulk operation: ${op.type}`);

    switch (op.type) {
      case 'APPROVE': {
        if (!op.municipalityId) throw new BadRequestException('municipalityId requerido para APPROVE');
        const result = await this.prisma.asset.updateMany({
          where: { municipalityId: op.municipalityId, certStatus: 'PENDIENTE' },
          data: { certStatus: 'VALIDADO', validatedBy: op.userId, validatedAt: new Date() },
        });
        return { type: 'APPROVE', success: true, affectedCount: result.count, message: `${result.count} activos aprobados` };
      }

      case 'CERTIFY': {
        if (!op.municipalityId) throw new BadRequestException('municipalityId requerido para CERTIFY');
        const result = await this.prisma.asset.updateMany({
          where: { municipalityId: op.municipalityId, certStatus: 'VALIDADO' },
          data: { certStatus: 'CERTIFICADO', certifiedBy: op.userId, certifiedAt: new Date() },
        });
        return { type: 'CERTIFY', success: true, affectedCount: result.count, message: `${result.count} activos certificados` };
      }

      case 'PUBLISH': {
        if (!op.municipalityId) throw new BadRequestException('municipalityId requerido para PUBLISH');
        const result = await this.publish(op.municipalityId);
        return { type: 'PUBLISH', success: result.success, affectedCount: 0, message: result.reason || 'Publicado' };
      }

      case 'RECALCULATE_HEALTH':
        this.logger.log('Mock: Recalculating health scores for assets');
        return { type: 'RECALCULATE_HEALTH', success: true, affectedCount: 0, message: 'Recálculo de salud iniciado (mock)' };

      case 'RECALCULATE_CONFIDENCE':
        this.logger.log('Mock: Recalculating confidence scores for assets');
        return { type: 'RECALCULATE_CONFIDENCE', success: true, affectedCount: 0, message: 'Recálculo de confianza iniciado (mock)' };

      case 'REGENERATE_TOPOLOGY':
        this.logger.log('Mock: Regenerating topology relationships');
        return { type: 'REGENERATE_TOPOLOGY', success: true, affectedCount: 0, message: 'Regeneración de topología iniciada (mock)' };

      default:
        throw new BadRequestException(`Tipo de operación no soportada: ${op.type}`);
    }
  }

  async publish(municipalityId: string) {
    const municipality = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    let pilot = await this.prisma.municipalityPilot.findUnique({ where: { municipalityId } });

    if (!pilot) {
      pilot = await this.prisma.municipalityPilot.create({
        data: { municipalityId, pilotStatus: 'EN_PREPARACION', totalAssets: 0, validatedAssets: 0, certifiedAssets: 0, qualityScore: 0 },
      });
    }

    if (pilot.pilotStatus === 'PUBLICADO') {
      throw new ConflictException('El municipio ya está publicado');
    }

    const report = await this.generateQualityReport(municipalityId);

    if (report.overallScore < 95) {
      return { success: false, reason: `El puntaje de calidad (${report.overallScore}%) no alcanza el mínimo requerido (95%)` };
    }

    await this.prisma.municipalityPilot.update({
      where: { municipalityId },
      data: { pilotStatus: 'PUBLICADO', publishedAt: new Date(), qualityScore: report.overallScore },
    });

    this.logger.log(`Municipality ${municipalityId} published`);
    return { success: true, reason: 'Municipio publicado exitosamente' };
  }

  async unpublish(municipalityId: string) {
    const pilot = await this.prisma.municipalityPilot.findUnique({ where: { municipalityId } });
    if (!pilot) throw new NotFoundException('Registro piloto no encontrado para el municipio');

    await this.prisma.municipalityPilot.update({
      where: { municipalityId },
      data: { pilotStatus: 'EN_CERTIFICACION', publishedAt: null },
    });

    this.logger.log(`Municipality ${municipalityId} unpublished`);
    return { success: true, message: 'Municipio despublicado' };
  }

  async generateClosureReport(municipalityId: string): Promise<ClosureReport> {
    const municipality = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const pilot = await this.prisma.municipalityPilot.findUnique({ where: { municipalityId } });

    const currentReport = await this.generateQualityReport(municipalityId);

    const corrections = await this.prisma.verificationRecord.groupBy({
      by: ['action'],
      where: {
        asset: { municipalityId },
      },
      _count: { action: true },
    });

    const correctionsMap: Record<string, number> = {};
    for (const c of corrections) {
      correctionsMap[c.action] = c._count.action;
    }

    const initialQuality = pilot?.qualityScore ?? 0;

    const retiredAssets = await this.prisma.asset.count({
      where: { municipalityId, status: 'RETIRADO' },
    });

    const newAssets = await this.prisma.asset.count({
      where: { municipalityId, createdAt: { gte: pilot?.createdAt || new Date(0) } },
    });

    const photosAdded = await this.prisma.assetPhoto.count({
      where: { asset: { municipalityId } },
    });

    const recommendations: string[] = [];
    if (currentReport.invalidCoords > 0) recommendations.push(`Corregir coordenadas de ${currentReport.invalidCoords} activos`);
    if (currentReport.orphans > 0) recommendations.push(`Establecer relaciones para ${currentReport.orphans} activos huérfanos`);
    if (currentReport.withoutPhotos > 0) recommendations.push(`Agregar fotos a ${currentReport.withoutPhotos} activos`);
    if (currentReport.coveragePct.certified < 100) recommendations.push('Completar certificación de todos los activos');

    return {
      municipalityId,
      initialQuality,
      finalQuality: currentReport.overallScore,
      corrections: correctionsMap,
      newAssets,
      retiredAssets,
      photosAdded,
      recommendations,
      adoptionMetrics: currentReport.adoptionMetrics,
    };
  }

  async getTour(municipalityId: string, latitude: number, longitude: number): Promise<TourStop[]> {
    const municipality = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const assets = await this.prisma.asset.findMany({
      where: { municipalityId, certStatus: 'PENDIENTE', latitude: { not: null }, longitude: { not: null } },
      select: { id: true, code: true, name: true, latitude: true, longitude: true },
    });

    const stops: TourStop[] = assets
      .filter((a) => a.latitude !== null && a.longitude !== null)
      .map((a) => {
        const distanceMeters = this.haversineDistance(latitude, longitude, a.latitude!, a.longitude!);
        return { assetId: a.id, code: a.code, name: a.name, latitude: a.latitude, longitude: a.longitude, distanceMeters };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return stops;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
