import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private prisma: PrismaService) {}

  async getTimeline(assetId: string) {
    this.logger.log(`Fetching timeline for asset ${assetId}`);

    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const [versions, photos, auditLogs, healthScores, confidenceScores] = await Promise.all([
      this.prisma.assetVersion.findMany({
        where: { assetId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assetPhoto.findMany({
        where: { assetId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'asset', entityId: assetId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assetHealth.findMany({
        where: { assetId },
        orderBy: { calculatedAt: 'desc' },
      }),
      this.prisma.assetConfidence.findMany({
        where: { assetId },
        orderBy: { calculatedAt: 'desc' },
      }),
    ]);

    const entries: any[] = [];

    for (const v of versions) {
      entries.push({
        id: v.id,
        type: 'version',
        date: v.createdAt,
        version: v.version,
        changeType: v.changeType || 'update',
        description: this.describeVersionChange(v),
        snapshot: v.snapshot,
        changes: v.changes,
      });
    }

    for (const p of photos) {
      entries.push({
        id: p.id,
        type: 'photo',
        date: p.createdAt,
        description: `Foto: ${p.filename}`,
        url: p.originalUrl,
        thumbnailUrl: p.thumbnailUrl,
        gps: p.gpsLatitude ? { lat: p.gpsLatitude, lng: p.gpsLongitude } : null,
      });
    }

    for (const a of auditLogs) {
      entries.push({
        id: a.id,
        type: 'audit',
        date: a.createdAt,
        action: a.action,
        description: a.details ? JSON.stringify(a.details) : a.action,
      });
    }

    for (const h of healthScores) {
      entries.push({
        id: h.id,
        type: 'health',
        date: h.calculatedAt,
        description: `Health score: ${h.overallScore}`,
        score: h.overallScore,
        details: { connectivity: h.connectivity, photos: h.photos, dataQuality: h.dataQuality, location: h.location, relationships: h.relationships },
      });
    }

    for (const c of confidenceScores) {
      entries.push({
        id: c.id,
        type: 'confidence',
        date: c.calculatedAt,
        description: `Confidence score: ${c.score}`,
        score: c.score,
      });
    }

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { assetId, assetCode: asset.code, assetName: asset.name, entries };
  }

  async getStateAtDate(assetId: string, date: Date) {
    this.logger.log(`Getting state for asset ${assetId} at ${date.toISOString()}`);

    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const version = await this.prisma.assetVersion.findFirst({
      where: { assetId, createdAt: { lte: date } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      assetId,
      date: date.toISOString(),
      snapshot: version ? version.snapshot : null,
      version: version ? version.version : 0,
      reconstructedAt: version?.createdAt || null,
      current: !version || version.createdAt.getTime() === asset.updatedAt.getTime(),
    };
  }

  async getChanges(from: Date, to: Date) {
    this.logger.log(`Getting changes from ${from.toISOString()} to ${to.toISOString()}`);

    const [versions, auditLogs] = await Promise.all([
      this.prisma.assetVersion.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'desc' },
        include: { asset: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const changes: any[] = [];

    for (const v of versions) {
      changes.push({
        id: v.id,
        type: 'version',
        date: v.createdAt,
        assetId: v.assetId,
        assetCode: v.asset?.code || null,
        assetName: v.asset?.name || null,
        changeType: v.changeType || 'update',
        version: v.version,
        description: this.describeVersionChange(v),
      });
    }

    for (const a of auditLogs) {
      changes.push({
        id: a.id,
        type: 'audit',
        date: a.createdAt,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        description: a.details ? JSON.stringify(a.details) : a.action,
      });
    }

    changes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { from: from.toISOString(), to: to.toISOString(), total: changes.length, changes };
  }

  private describeVersionChange(version: any): string {
    if (version.changeType === 'create') return `Versión ${version.version}: Activo creado`;
    if (version.changes) {
      const keys = Object.keys(version.changes as object);
      return `Versión ${version.version}: Cambios en ${keys.join(', ')}`;
    }
    return `Versión ${version.version}: Actualización`;
  }
}
