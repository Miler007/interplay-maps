import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { EVENT_NAMES } from '../../events/events.module';

@Injectable()
export class EditorService {
  private readonly logger = new Logger(EditorService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async createFeature(data: {
    assetId: string;
    geometry: any;
    properties?: Record<string, any>;
  }) {
    const asset = await this.prisma.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    const geom = await this.prisma.geometry.upsert({
      where: { assetId: data.assetId },
      create: { assetId: data.assetId, geojson: data.geometry, srid: 4326 },
      update: { geojson: data.geometry },
    });
    this.events.emit(EVENT_NAMES.ASSET.UPDATED, { assetId: data.assetId });
    return geom;
  }

  async updateFeature(assetId: string, geometry: any) {
    const geom = await this.prisma.geometry.findUnique({ where: { assetId } });
    if (!geom) throw new NotFoundException('Geometría no encontrada');
    const updated = await this.prisma.geometry.update({
      where: { assetId },
      data: { geojson: geometry },
    });
    this.events.emit(EVENT_NAMES.ASSET.UPDATED, { assetId });
    return updated;
  }

  async deleteFeature(assetId: string) {
    const geom = await this.prisma.geometry.findUnique({ where: { assetId } });
    if (!geom) throw new NotFoundException('Geometría no encontrada');
    await this.prisma.geometry.delete({ where: { assetId } });
    this.events.emit(EVENT_NAMES.ASSET.UPDATED, { assetId });
  }

  async moveAsset(assetId: string, latitude: number, longitude: number) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: { latitude, longitude },
    });
    this.events.emit(EVENT_NAMES.ASSET.MOVED, { assetId, latitude, longitude });
    return updated;
  }
}
