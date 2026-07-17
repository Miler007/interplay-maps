import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async findAll(params?: { type?: string; municipalityId?: string; departmentId?: string; status?: string; search?: string }) {
    const where: any = {};
    if (params?.type) where.assetType = { code: params.type };
    if (params?.municipalityId) where.municipalityId = params.municipalityId;
    if (params?.departmentId) where.departmentId = params.departmentId;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.asset.findMany({
      where,
      include: { assetType: true, municipality: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { assetType: true, municipality: true, department: true, geometry: true, attributes: true },
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    return asset;
  }

  async create(data: any) {
    const asset = await this.prisma.asset.create({ data });
    this.events.emit(EVENT_NAMES.ASSET.CREATED, { assetId: asset.id, code: asset.code });
    return asset;
  }

  async update(id: string, data: any) {
    await this.findById(id);
    const asset = await this.prisma.asset.update({ where: { id }, data });
    this.events.emit(EVENT_NAMES.ASSET.UPDATED, { assetId: id });
    return asset;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.asset.delete({ where: { id } });
    this.events.emit(EVENT_NAMES.ASSET.DELETED, { assetId: id });
  }

  async softDelete(id: string) {
    await this.findById(id);
    const asset = await this.prisma.asset.update({ where: { id }, data: { status: 'RETIRADO' } });
    this.events.emit(EVENT_NAMES.ASSET.DELETED, { assetId: id });
    return asset;
  }

  async restore(id: string) {
    await this.findById(id);
    const asset = await this.prisma.asset.update({ where: { id }, data: { status: 'ACTIVO' } });
    this.events.emit(EVENT_NAMES.ASSET.RESTORED, { assetId: id });
    return asset;
  }
}
