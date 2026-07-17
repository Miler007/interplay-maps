import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { EVENT_NAMES } from '../../events/events.module';

@Injectable()
export class LayersService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async findAll() {
    return this.prisma.layer.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const layer = await this.prisma.layer.findUnique({ where: { id } });
    if (!layer) throw new NotFoundException('Capa no encontrada');
    return layer;
  }

  async create(data: { code: string; name: string; description?: string; icon?: string }) {
    const layer = await this.prisma.layer.create({ data });
    this.events.emit(EVENT_NAMES.LAYER.CREATED, { layerId: layer.id, code: layer.code });
    return layer;
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean; sortOrder?: number }) {
    await this.findById(id);
    const layer = await this.prisma.layer.update({ where: { id }, data });
    this.events.emit(EVENT_NAMES.LAYER.UPDATED, { layerId: id });
    return layer;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.layer.delete({ where: { id } });
    this.events.emit(EVENT_NAMES.LAYER.DELETED, { layerId: id });
  }

  async getAssetsByLayer(layerId: string) {
    const layer = await this.prisma.layer.findUnique({
      where: { id: layerId },
      include: {
        assets: {
          include: {
            asset: {
              include: {
                assetType: true,
                department: { select: { name: true } },
                municipality: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!layer) throw new NotFoundException('Capa no encontrada');
    return layer.assets.map((la) => la.asset);
  }
}
