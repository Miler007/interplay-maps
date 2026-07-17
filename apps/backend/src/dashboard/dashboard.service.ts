import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [
      totalAssets,
      activeAssets,
      pendingValidation,
      totalProjects,
      totalMunicipalities,
      recentImports,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'ACTIVO' } }),
      this.prisma.asset.count({ where: { status: 'PENDIENTE_INSTALACION' } }),
      this.prisma.project.count(),
      this.prisma.municipality.count(),
      this.prisma.importLog.count({ take: 10 }),
    ]);
    return {
      totalAssets,
      activeAssets,
      pendingValidation,
      totalProjects,
      totalMunicipalities,
      recentImports,
    };
  }

  async getAssetsByType() {
    const types = await this.prisma.assetType.findMany({
      include: { _count: { select: { assets: true } } },
    });
    return types.map((t) => ({ code: t.code, name: t.name, count: t._count.assets }));
  }

  async getAssetsByStatus() {
    const result = await this.prisma.asset.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return result.map((r) => ({ status: r.status, count: r._count.id }));
  }

  async getRecentActivity(limit = 20) {
    const [recentAssets, recentImports] = await Promise.all([
      this.prisma.asset.findMany({ orderBy: { updatedAt: 'desc' }, take: limit, select: { id: true, code: true, name: true, status: true, updatedAt: true } }),
      this.prisma.importLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    ]);
    return { recentAssets, recentImports };
  }
}
