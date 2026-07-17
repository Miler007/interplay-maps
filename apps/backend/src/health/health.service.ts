import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';

interface HealthFactors {
  connectivity: number;
  photos: number;
  dataQuality: number;
  location: number;
  relationships: number;
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getHealthScores(params?: { municipalityId?: string; assetTypeId?: string }) {
    const where: any = {};
    if (params?.municipalityId) where.municipalityId = params.municipalityId;
    if (params?.assetTypeId) where.assetTypeId = params.assetTypeId;
    const assets = await this.prisma.asset.findMany({
      where,
      include: { healthScores: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
    });
    return assets.map((a) => ({
      assetId: a.id, code: a.code, name: a.name, status: a.status,
      score: a.healthScores[0]?.overallScore || 0,
      factors: a.healthScores[0]
        ? {
            connectivity: a.healthScores[0].connectivity,
            photos: a.healthScores[0].photos,
            dataQuality: a.healthScores[0].dataQuality,
            location: a.healthScores[0].location,
            relationships: a.healthScores[0].relationships,
          }
        : null,
      lastCalculated: a.healthScores[0]?.calculatedAt || null,
    }));
  }

  /** Calculate health for a single asset using DB weights */
  async calculateAssetHealth(assetId: string): Promise<number> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        geometry: true,
        healthScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        relationshipsFrom: { take: 1 },
        relationshipsTo: { take: 1 },
        photos: { take: 1 },
      },
    });
    if (!asset) return 0;

    const config = await this.prisma.healthScoreConfig.findMany({ where: { isActive: true } });
    const weights = this.getDefaultWeights();
    for (const c of config) {
      weights[c.indicatorCode as keyof HealthFactors] = c.weight;
    }
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return 0;

    const factors: HealthFactors = {
      connectivity: asset.status === 'ACTIVO' ? 100 : asset.status === 'RETIRADO' ? 0 : 50,
      photos: asset.photos.length > 0 ? 100 : 0,
      dataQuality: this.calcDataQuality(asset),
      location: asset.latitude && asset.longitude ? 100 : asset.geometry ? 80 : 0,
      relationships: asset.relationshipsFrom.length > 0 || asset.relationshipsTo.length > 0 ? 100 : 0,
    };

    const score = Math.round(
      ((factors.connectivity * weights.connectivity) +
        (factors.photos * weights.photos) +
        (factors.dataQuality * weights.dataQuality) +
        (factors.location * weights.location) +
        (factors.relationships * weights.relationships)) / totalWeight,
    );

    await this.prisma.assetHealth.create({
      data: {
        assetId,
        connectivity: factors.connectivity,
        photos: factors.photos,
        dataQuality: factors.dataQuality,
        location: factors.location,
        relationships: factors.relationships,
        overallScore: score,
      },
    });

    return score;
  }

  async recalculateAll() {
    const assets = await this.prisma.asset.findMany({ where: { status: 'ACTIVO' }, select: { id: true } });
    for (const asset of assets) {
      await this.calculateAssetHealth(asset.id);
    }
    this.events.emit(EVENT_NAMES.HEALTH.RECALCULATED, { total: assets.length });
    return { recalculated: assets.length };
  }

  async getConfig() {
    return this.prisma.healthScoreConfig.findMany({ orderBy: { indicatorCode: 'asc' } });
  }

  async updateConfig(id: string, data: { weight?: number; isActive?: boolean }) {
    return this.prisma.healthScoreConfig.update({ where: { id }, data });
  }

  async getAssetHealthHistory(assetId: string) {
    return this.prisma.assetHealth.findMany({
      where: { assetId },
      orderBy: { calculatedAt: 'desc' },
      take: 20,
    });
  }

  private calcDataQuality(asset: any): number {
    let score = 0;
    if (asset.name) score += 20;
    if (asset.code) score += 20;
    if (asset.observations) score += 15;
    if (asset.municipalityId) score += 15;
    if (asset.projectId) score += 15;
    if (asset.createdById) score += 15;
    return score;
  }

  private getDefaultWeights(): HealthFactors {
    return { connectivity: 25, photos: 20, dataQuality: 20, location: 20, relationships: 15 };
  }
}
