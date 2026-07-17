import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getPendingChanges(since: Date, municipalityId?: string) {
    const where: any = { updatedAt: { gte: since } };
    if (municipalityId) where.municipalityId = municipalityId;
    return this.prisma.asset.findMany({ where, orderBy: { updatedAt: 'asc' } });
  }

  async pushChanges(changes: Array<{ id: string; data: any; action: 'create' | 'update' | 'delete' }>) {
    const results: Array<{ id: string; status: string; error?: string }> = [];
    for (const change of changes) {
      try {
        switch (change.action) {
          case 'create':
            await this.prisma.asset.create({ data: { id: change.id, ...change.data } });
            break;
          case 'update':
            await this.prisma.asset.upsert({
              where: { id: change.id },
              create: { id: change.id, ...change.data },
              update: change.data,
            });
            break;
          case 'delete':
            await this.prisma.asset.update({ where: { id: change.id }, data: { status: 'RETIRADO' } });
            break;
        }
        results.push({ id: change.id, status: 'ok' });
      } catch (error: any) {
        results.push({ id: change.id, status: 'error', error: error.message });
      }
    }
    return results;
  }

  async getSyncStatus(municipalityId?: string) {
    const where: any = {};
    if (municipalityId) where.municipalityId = municipalityId;
    const [total, pendingValidation, lastUpdate] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.count({ where: { ...where, status: 'PENDIENTE_INSTALACION' } }),
      this.prisma.asset.findFirst({ where, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ]);
    return { total, pendingValidation, lastSync: lastUpdate?.updatedAt || null };
  }
}
