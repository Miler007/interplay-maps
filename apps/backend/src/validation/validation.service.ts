import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';

@Injectable()
export class ValidationService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getQueue(status?: string, municipalityId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (municipalityId) where.municipalityId = municipalityId;
    return this.prisma.validationQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQueueStats() {
    const [pendiente, aprobado, corregido, fusionado, rechazado] = await Promise.all([
      this.prisma.validationQueue.count({ where: { status: 'PENDIENTE' } }),
      this.prisma.validationQueue.count({ where: { status: 'APROBADO' } }),
      this.prisma.validationQueue.count({ where: { status: 'CORREGIDO' } }),
      this.prisma.validationQueue.count({ where: { status: 'FUSIONADO' } }),
      this.prisma.validationQueue.count({ where: { status: 'RECHAZADO' } }),
    ]);
    return { pendiente, aprobado, corregido, fusionado, rechazado, total: pendiente + aprobado + corregido + fusionado + rechazado };
  }

  async getPendingValidations(municipalityId?: string) {
    const where: any = { status: 'PENDIENTE_INSTALACION' };
    if (municipalityId) where.municipalityId = municipalityId;
    return this.prisma.asset.findMany({
      where,
      include: { assetType: true, municipality: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async approveQueueItem(id: string, reviewerId: string) {
    const item = await this.prisma.validationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');

    const updated = await this.prisma.validationQueue.update({
      where: { id },
      data: { status: 'APROBADO', reviewedById: reviewerId, reviewedAt: new Date() },
    });

    this.events.emit(EVENT_NAMES.VALIDATION.APPROVED, { queueId: id, reviewerId });
    return updated;
  }

  async editQueueItem(id: string, data: { name?: string; latitude?: number; longitude?: number; notes?: string }, reviewerId: string) {
    const item = await this.prisma.validationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');

    const updated = await this.prisma.validationQueue.update({
      where: { id },
      data: {
        suggestedName: data.name ?? item.suggestedName,
        suggestedLatitude: data.latitude ?? item.suggestedLatitude,
        suggestedLongitude: data.longitude ?? item.suggestedLongitude,
        notes: data.notes ?? item.notes,
        status: 'CORREGIDO',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    this.events.emit(EVENT_NAMES.VALIDATION.CORRECTED, { queueId: id, reviewerId });
    return updated;
  }

  async mergeQueueItem(id: string, targetAssetId: string, reviewerId: string) {
    const item = await this.prisma.validationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item en cola no encontrado');
    const target = await this.prisma.asset.findUnique({ where: { id: targetAssetId } });
    if (!target) throw new NotFoundException('Activo destino no encontrado');

    await this.prisma.validationQueue.update({
      where: { id },
      data: { status: 'FUSIONADO', reviewedById: reviewerId, reviewedAt: new Date(), notes: `Fusionado con ${target.code}` },
    });

    this.events.emit(EVENT_NAMES.VALIDATION.MERGED, { queueId: id, targetAssetId, reviewerId });
    return { message: 'Fusionado exitosamente', targetId: targetAssetId };
  }

  async discardQueueItem(id: string, reviewerId: string, reason?: string) {
    const item = await this.prisma.validationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');

    await this.prisma.validationQueue.update({
      where: { id },
      data: { status: 'RECHAZADO', reviewedById: reviewerId, reviewedAt: new Date(), notes: reason },
    });
    await this.prisma.importLog.create({
      data: {
        importId: 'manual',
        stage: 'validation',
        level: 'WARN',
        message: `Item ${id} descartado: ${reason || 'Sin razón'}`,
      },
    }).catch(() => {});

    this.events.emit(EVENT_NAMES.VALIDATION.REJECTED, { queueId: id, reviewerId, reason });
    return { message: 'Item descartado' };
  }

  async promoteToAsset(id: string, reviewerId: string) {
    const item = await this.prisma.validationQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');

    const rawData = item.rawData as any;
    const typeCode = rawData?.entityType === 'MUFFLE' ? 'MUFLAS' : 'CAJAS';
    let assetType = await this.prisma.assetType.findUnique({ where: { code: typeCode } });
    if (!assetType) {
      assetType = await this.prisma.assetType.create({
        data: { code: typeCode, name: typeCode, prefix: typeCode.substring(0, 3) },
      });
    }

    const asset = await this.prisma.asset.create({
      data: {
        code: item.suggestedName || `VAL-${Date.now()}`,
        name: item.suggestedName || `Validado ${id.slice(0, 8)}`,
        assetTypeId: assetType.id,
        departmentId: '00000000-0000-0000-0000-000000000000',
        municipalityId: '00000000-0000-0000-0000-000000000000',
        latitude: item.suggestedLatitude || null,
        longitude: item.suggestedLongitude || null,
        status: 'ACTIVO',
        createdById: reviewerId,
      },
    });

    if (item.suggestedLatitude && item.suggestedLongitude) {
      await this.prisma.geometry.create({
        data: {
          assetId: asset.id,
          geojson: { type: 'Point', coordinates: [item.suggestedLongitude, item.suggestedLatitude] },
          srid: 4326,
        },
      }).catch(() => {});
    }

    await this.prisma.validationQueue.update({
      where: { id },
      data: { status: 'APROBADO', reviewedById: reviewerId, reviewedAt: new Date() },
    });

    this.events.emit(EVENT_NAMES.VALIDATION.APPROVED, { queueId: id, assetId: asset.id, reviewerId });

    const dept = await this.prisma.department.findFirst({ orderBy: { name: 'asc' }, select: { id: true } });
    const mun = await this.prisma.municipality.findFirst({ orderBy: { name: 'asc' }, select: { id: true } });
    if (dept && mun) {
      await this.prisma.asset.update({
        where: { id: asset.id },
        data: { departmentId: dept.id, municipalityId: mun.id },
      });
    }

    return asset;
  }

  async approve(id: string, reviewerId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: 'ACTIVO' },
    });
    this.events.emit(EVENT_NAMES.VALIDATION.APPROVED, { assetId: id, reviewerId });
    return updated;
  }

  async reject(id: string, reviewerId: string, reason: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: 'RETIRADO' },
    });
    this.events.emit(EVENT_NAMES.VALIDATION.REJECTED, { assetId: id, reviewerId, reason });
    return updated;
  }

  async requestCorrection(id: string, reviewerId: string, notes: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: 'PENDIENTE_INSTALACION' },
    });
    this.events.emit(EVENT_NAMES.VALIDATION.CORRECTED, { assetId: id, notes });
    return updated;
  }

  async merge(id: string, targetId: string, reviewerId: string) {
    const source = await this.prisma.asset.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Activo origen no encontrado');
    const target = await this.prisma.asset.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Activo destino no encontrado');
    await this.prisma.asset.update({ where: { id }, data: { status: 'RETIRADO' } });
    this.events.emit(EVENT_NAMES.VALIDATION.MERGED, { sourceId: id, targetId, reviewerId });
    return { message: 'Activos fusionados exitosamente', targetId };
  }
}
