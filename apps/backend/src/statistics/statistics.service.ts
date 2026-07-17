import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private prisma: PrismaService) {}

  async getGeneralStats() {
    const [assets, municipalities, departments, types, projectCount] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.municipality.count(),
      this.prisma.department.count(),
      this.prisma.assetType.count(),
      this.prisma.project.count(),
    ]);
    return { assets, municipalities, departments, assetTypes: types, projects: projectCount };
  }

  async getAssetsPerMunicipality() {
    return this.prisma.asset.groupBy({
      by: ['municipalityId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  async getAssetsPerType() {
    return this.prisma.asset.groupBy({
      by: ['assetTypeId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  async getTimeline(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const assets = await this.prisma.asset.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const timeline: Record<string, number> = {};
    assets.forEach((a) => {
      const key = a.createdAt.toISOString().split('T')[0];
      timeline[key] = (timeline[key] || 0) + 1;
    });
    return Object.entries(timeline).map(([date, count]) => ({ date, count }));
  }

  async getImportStats() {
    return this.prisma.importLog.groupBy({
      by: ['stage'],
      _count: { id: true },
    });
  }
}
