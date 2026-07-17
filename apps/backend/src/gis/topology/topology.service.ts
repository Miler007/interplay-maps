import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TopologyService {
  private readonly logger = new Logger(TopologyService.name);

  constructor(private prisma: PrismaService) {}

  async findConnectedAssets(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { latitude: true, longitude: true },
    });
    if (!asset?.latitude || !asset?.longitude) return [];
    const buffer = 0.01;
    return this.prisma.asset.findMany({
      where: {
        id: { not: assetId },
        latitude: { gte: asset.latitude - buffer, lte: asset.latitude + buffer },
        longitude: { gte: asset.longitude - buffer, lte: asset.longitude + buffer },
      },
      take: 50,
    });
  }

  async findWithinRadius(lat: number, lng: number, radiusKm: number) {
    const deg = radiusKm / 111;
    return this.prisma.asset.findMany({
      where: {
        latitude: { gte: lat - deg, lte: lat + deg },
        longitude: { gte: lng - deg, lte: lng + deg },
      },
      include: { assetType: true },
    });
  }
}
