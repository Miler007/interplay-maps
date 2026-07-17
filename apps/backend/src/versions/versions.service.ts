import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VersionsService {
  private readonly logger = new Logger(VersionsService.name);

  constructor(private prisma: PrismaService) {}

  async getAssetVersions(assetId: string) {
    return this.prisma.assetVersion.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createVersion(data: { assetId: string; snapshot: any; userId?: string; changeType?: string }) {
    const latest = await this.prisma.assetVersion.findFirst({
      where: { assetId: data.assetId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;
    return this.prisma.assetVersion.create({
      data: {
        assetId: data.assetId,
        version,
        snapshot: data.snapshot,
        changedById: data.userId,
        changeType: data.changeType || 'update',
      },
    });
  }

  async restoreVersion(versionId: string) {
    const version = await this.prisma.assetVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Error('Versión no encontrada');
    await this.prisma.asset.update({
      where: { id: version.assetId },
      data: version.snapshot as any,
    });
    return { restored: true, assetId: version.assetId, versionId };
  }

  async getVersionDiff(versionId1: string, versionId2: string) {
    const [v1, v2] = await Promise.all([
      this.prisma.assetVersion.findUnique({ where: { id: versionId1 } }),
      this.prisma.assetVersion.findUnique({ where: { id: versionId2 } }),
    ]);
    if (!v1 || !v2) throw new Error('Una o ambas versiones no encontradas');
    return {
      before: v1.snapshot,
      after: v2.snapshot,
      changes: this.computeDiff(v1.snapshot, v2.snapshot),
    };
  }

  private computeDiff(before: any, after: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const key of allKeys) {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        changes[key] = { from: before?.[key], to: after?.[key] };
      }
    }
    return changes;
  }
}
