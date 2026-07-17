import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';

interface ConfidenceFactors {
  validCoords: boolean;
  nameIdentified: boolean;
  noDuplicates: boolean;
  hasPhoto: boolean;
  reviewedByAdmin: boolean;
  consistency: boolean;
  hasRelationships: boolean;
}

@Injectable()
export class ConfidenceService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getConfidenceScores(params?: { municipalityId?: string; minScore?: number }) {
    const where: any = {};
    if (params?.municipalityId) where.municipalityId = params.municipalityId;
    const assets = await this.prisma.asset.findMany({
      where,
      include: { confidenceScores: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
    });
    let results = assets.map((a) => ({
      assetId: a.id, code: a.code, name: a.name,
      score: a.confidenceScores[0]?.score || 0,
      factors: a.confidenceScores[0]
        ? {
            validCoords: a.confidenceScores[0].validCoords,
            nameIdentified: a.confidenceScores[0].nameIdentified,
            noDuplicates: a.confidenceScores[0].noDuplicates,
            hasPhoto: a.confidenceScores[0].hasPhoto,
            reviewedByAdmin: a.confidenceScores[0].reviewedByAdmin,
          }
        : null,
      lastCalculated: a.confidenceScores[0]?.calculatedAt || null,
    }));
    if (params?.minScore) results = results.filter((r) => r.score >= params.minScore!);
    return results;
  }

  async calculateAssetConfidence(assetId: string): Promise<number> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        geometry: true,
        photos: { take: 1 },
        relationshipsFrom: { take: 1 },
        relationshipsTo: { take: 1 },
        confidenceScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });
    if (!asset) return 0;

    const config = await this.prisma.confidenceScoreConfig.findMany({ where: { isActive: true } });
    const weights: Record<string, number> = {};
    for (const c of config) weights[c.factorCode] = c.weight;

    const factors: ConfidenceFactors = {
      validCoords: !!(asset.latitude && asset.longitude),
      nameIdentified: !!asset.name,
      noDuplicates: !(asset.status === 'PENDIENTE_INSTALACION' && asset.observations?.includes('duplicado')),
      hasPhoto: asset.photos.length > 0,
      reviewedByAdmin: asset.confidenceScores[0]?.reviewedByAdmin || false,
      consistency: !!(asset.latitude && asset.longitude && asset.name && asset.municipalityId),
      hasRelationships: asset.relationshipsFrom.length > 0 || asset.relationshipsTo.length > 0,
    };

    const score = this.computeWithWeights(factors, weights);

    await this.prisma.assetConfidence.create({
      data: {
        assetId,
        score,
        validCoords: factors.validCoords,
        nameIdentified: factors.nameIdentified,
        noDuplicates: factors.noDuplicates,
        hasPhoto: factors.hasPhoto,
        reviewedByAdmin: factors.reviewedByAdmin,
      },
    });

    return score;
  }

  async recalculateAll() {
    const assets = await this.prisma.asset.findMany({ where: { status: 'ACTIVO' }, select: { id: true } });
    for (const asset of assets) {
      await this.calculateAssetConfidence(asset.id);
    }
    this.events.emit(EVENT_NAMES.CONFIDENCE.RECALCULATED, { total: assets.length });
    return { recalculated: assets.length };
  }

  async getConfig() {
    return this.prisma.confidenceScoreConfig.findMany({ orderBy: { factorCode: 'asc' } });
  }

  async updateConfig(id: string, data: { weight?: number; isActive?: boolean }) {
    return this.prisma.confidenceScoreConfig.update({ where: { id }, data });
  }

  async getAssetConfidenceHistory(assetId: string) {
    return this.prisma.assetConfidence.findMany({
      where: { assetId },
      orderBy: { calculatedAt: 'desc' },
      take: 20,
    });
  }

  private computeWithWeights(factors: ConfidenceFactors, weights: Record<string, number>): number {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
    const w = {
      validCoords: weights['VALID_COORDS'] || 25,
      nameIdentified: weights['NAME_IDENTIFIED'] || 20,
      noDuplicates: weights['NO_DUPLICATES'] || 20,
      hasPhoto: weights['HAS_PHOTO'] || 10,
      reviewedByAdmin: weights['REVIEWED_BY_ADMIN'] || 15,
      consistency: weights['CONSISTENCY'] || 5,
      hasRelationships: weights['HAS_RELATIONSHIPS'] || 5,
    };

    let score = 0;
    if (factors.validCoords) score += w.validCoords;
    if (factors.nameIdentified) score += w.nameIdentified;
    if (factors.noDuplicates) score += w.noDuplicates;
    if (factors.hasPhoto) score += w.hasPhoto;
    if (factors.reviewedByAdmin) score += w.reviewedByAdmin;
    if (factors.consistency) score += w.consistency;
    if (factors.hasRelationships) score += w.hasRelationships;

    return Math.round(Math.min(100, score));
  }
}
