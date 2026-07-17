import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  constructor(private prisma: PrismaService) {}

  async getMapData(params: {
    north?: number; south?: number; east?: number; west?: number;
    layerIds?: string[]; type?: string; zoom?: number;
  }) {
    const where: any = { status: { not: 'RETIRADO' } };
    if (params.north && params.south && params.east && params.west) {
      where.latitude = { gte: params.south, lte: params.north };
      where.longitude = { gte: params.west, lte: params.east };
    }
    if (params.type) where.assetType = { code: params.type };
    if (params.layerIds?.length) {
      where.layerAssets = { some: { layerId: { in: params.layerIds } } };
    }
    return this.prisma.asset.findMany({
      where,
      include: {
        assetType: true,
        geometry: true,
        healthScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        confidenceScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });
  }

  async getMapLayers() {
    return this.prisma.layer.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAssetByCode(code: string) {
    return this.prisma.asset.findUnique({
      where: { code },
      include: {
        assetType: true, municipality: true, department: true,
        geometry: true, attributes: true,
        healthScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        confidenceScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });
  }
}
