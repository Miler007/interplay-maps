import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GeometryService {
  private readonly logger = new Logger(GeometryService.name);

  constructor(private prisma: PrismaService) {}

  async findByAssetId(assetId: string) {
    return this.prisma.geometry.findUnique({ where: { assetId } });
  }

  async upsert(assetId: string, data: { geojson: any; srid?: number }) {
    return this.prisma.geometry.upsert({
      where: { assetId },
      create: { assetId, geojson: data.geojson, srid: data.srid ?? 4326 },
      update: { geojson: data.geojson, srid: data.srid ?? 4326 },
    });
  }

  async delete(assetId: string) {
    const geom = await this.findByAssetId(assetId);
    if (!geom) throw new NotFoundException('Geometría no encontrada');
    return this.prisma.geometry.delete({ where: { assetId } });
  }

  async findWithinBounds(north: number, south: number, east: number, west: number) {
    return this.prisma.geometry.findMany({
      where: {
        asset: {
          latitude: { gte: south, lte: north },
          longitude: { gte: west, lte: east },
        },
      },
      include: { asset: { include: { assetType: true } } },
    });
  }
}
