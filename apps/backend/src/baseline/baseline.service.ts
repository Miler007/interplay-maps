import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BaselineDiffResult {
  fromVersion: string;
  toVersion: string;
  assetsAdded: number;
  assetsRemoved: number;
  assetsChanged: number;
  segmentsAdded: number;
  segmentsRemoved: number;
  relationsAdded: number;
  relationsRemoved: number;
  qualityChange: number;
  details: {
    added: any[];
    removed: any[];
    changed: any[];
  };
}

@Injectable()
export class BaselineService {
  private readonly logger = new Logger(BaselineService.name);

  constructor(private prisma: PrismaService) {}

  async create(municipalityId: string, version: string, label?: string, userId?: string) {
    const municipality = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const existing = await this.prisma.municipalityBaseline.findUnique({
      where: { municipalityId_version: { municipalityId, version } },
    });
    if (existing) throw new BadRequestException(`Ya existe una línea base con versión ${version}`);

    const assets = await this.prisma.asset.findMany({
      where: { municipalityId },
      select: { id: true, code: true, name: true, status: true, certStatus: true, latitude: true, longitude: true, assetTypeId: true },
    });

    const segments = await this.prisma.networkSegment.findMany({
      where: { municipalityId },
    });

    const relationships = await this.prisma.assetRelationship.findMany({
      where: {
        OR: [
          { sourceAsset: { municipalityId } },
          { targetAsset: { municipalityId } },
        ],
      },
    });

    const totalAssets = assets.length;
    const totalSegments = segments.length;
    const totalRelations = relationships.length;

    const validatedOrCertified = assets.filter(a => a.certStatus === 'CERTIFICADO' || a.certStatus === 'VALIDADO').length;
    const qualityScore = totalAssets > 0 ? Math.round((validatedOrCertified / totalAssets) * 100) : 0;

    const snapshot = { assets, segments, relationships };

    const baseline = await this.prisma.municipalityBaseline.create({
      data: {
        municipalityId,
        version,
        label,
        snapshot,
        totalAssets,
        totalSegments,
        totalRelations,
        qualityScore,
        createdById: userId,
      },
    });

    const activeExists = await this.prisma.municipalityBaseline.findFirst({
      where: { municipalityId, isActive: true },
    });

    if (!activeExists) {
      return this.prisma.municipalityBaseline.update({
        where: { id: baseline.id },
        data: { isActive: true },
      });
    }

    return baseline;
  }

  async list(municipalityId: string) {
    const municipality = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    return this.prisma.municipalityBaseline.findMany({
      where: { municipalityId },
      orderBy: { version: 'desc' },
    });
  }

  async get(municipalityId: string, version: string) {
    const baseline = await this.prisma.municipalityBaseline.findUnique({
      where: { municipalityId_version: { municipalityId, version } },
    });
    if (!baseline) throw new NotFoundException('Línea base no encontrada');
    return baseline;
  }

  async activate(municipalityId: string, version: string) {
    const baseline = await this.prisma.municipalityBaseline.findUnique({
      where: { municipalityId_version: { municipalityId, version } },
    });
    if (!baseline) throw new NotFoundException('Línea base no encontrada');

    await this.prisma.municipalityBaseline.updateMany({
      where: { municipalityId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.municipalityBaseline.update({
      where: { id: baseline.id },
      data: { isActive: true },
    });
  }

  async diff(municipalityId: string, fromVersion: string, toVersion: string): Promise<BaselineDiffResult> {
    const from = await this.prisma.municipalityBaseline.findUnique({
      where: { municipalityId_version: { municipalityId, version: fromVersion } },
    });
    if (!from) throw new NotFoundException(`Línea base ${fromVersion} no encontrada`);

    const to = await this.prisma.municipalityBaseline.findUnique({
      where: { municipalityId_version: { municipalityId, version: toVersion } },
    });
    if (!to) throw new NotFoundException(`Línea base ${toVersion} no encontrada`);

    const snapshotFrom = from.snapshot as { assets: any[]; segments: any[]; relationships: any[] };
    const snapshotTo = to.snapshot as { assets: any[]; segments: any[]; relationships: any[] };
    const fromAssets = snapshotFrom.assets || [];
    const toAssets = snapshotTo.assets || [];
    const fromSegments = snapshotFrom.segments || [];
    const toSegments = snapshotTo.segments || [];
    const fromRelations = snapshotFrom.relationships || [];
    const toRelations = snapshotTo.relationships || [];

    const fromAssetMap = new Map<string, any>(fromAssets.map(a => [a.code, a]));
    const toAssetMap = new Map<string, any>(toAssets.map(a => [a.code, a]));

    const addedAssets = toAssets.filter(a => !fromAssetMap.has(a.code));
    const removedAssets = fromAssets.filter(a => !toAssetMap.has(a.code));
    const changedAssets = toAssets.filter(a => {
      const fa = fromAssetMap.get(a.code);
      if (!fa) return false;
      return fa.status !== a.status || fa.certStatus !== a.certStatus || fa.latitude !== a.latitude || fa.longitude !== a.longitude;
    });

    const fromSegmentMap = new Map<string, any>(fromSegments.map(s => [s.code, s]));
    const toSegmentMap = new Map<string, any>(toSegments.map(s => [s.code, s]));

    const addedSegments = toSegments.filter(s => !fromSegmentMap.has(s.code));
    const removedSegments = fromSegments.filter(s => !toSegmentMap.has(s.code));

    const relKey = (r: any) => `${r.sourceAssetId}:${r.targetAssetId}:${r.relationType}`;
    const fromRelSet = new Set(fromRelations.map(relKey));
    const toRelSet = new Set(toRelations.map(relKey));

    const addedRelations = toRelations.filter(r => !fromRelSet.has(relKey(r)));
    const removedRelations = fromRelations.filter(r => !toRelSet.has(relKey(r)));

    return {
      fromVersion,
      toVersion,
      assetsAdded: addedAssets.length,
      assetsRemoved: removedAssets.length,
      assetsChanged: changedAssets.length,
      segmentsAdded: addedSegments.length,
      segmentsRemoved: removedSegments.length,
      relationsAdded: addedRelations.length,
      relationsRemoved: removedRelations.length,
      qualityChange: to.qualityScore - from.qualityScore,
      details: {
        added: addedAssets,
        removed: removedAssets,
        changed: changedAssets,
      },
    };
  }

  async delete(municipalityId: string, version: string) {
    const baseline = await this.prisma.municipalityBaseline.findUnique({
      where: { municipalityId_version: { municipalityId, version } },
    });
    if (!baseline) throw new NotFoundException('Línea base no encontrada');

    await this.prisma.municipalityBaseline.delete({ where: { id: baseline.id } });
    return { success: true, message: `Línea base ${version} eliminada` };
  }
}
