import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpatialService {
  private readonly logger = new Logger(SpatialService.name);

  constructor(private prisma: PrismaService) {}

  async spatialQuery(wkt: string, buffer?: number) {
    return this.prisma.asset.findMany({
      where: {
        geometry: { isNot: null },
      },
      include: { assetType: true, geometry: true },
    });
  }

  async getAssetDensity(municipalityId?: string) {
    const where: any = {};
    if (municipalityId) where.municipalityId = municipalityId;
    return this.prisma.asset.groupBy({
      by: ['municipalityId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }
}
