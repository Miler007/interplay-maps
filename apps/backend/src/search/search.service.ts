import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  type: string;
  id: string;
  code: string;
  name: string;
  subtitle: string;
  relevance: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    if (!query || query.trim().length === 0) {
      return { query, results: [] };
    }

    const q = query.trim();
    const results: SearchResult[] = [];

    const [assets, segments, municipalities, coverageAreas] = await Promise.all([
      this.searchAssets(q),
      this.searchSegments(q),
      this.searchMunicipalities(q),
      this.searchCoverageAreas(q),
    ]);

    results.push(...assets, ...segments, ...municipalities, ...coverageAreas);

    results.sort((a, b) => b.relevance - a.relevance);

    this.logSearchQuery(q, results.length);

    return { query: q, results };
  }

  async suggestions(query: string) {
    if (!query || query.trim().length === 0) {
      return { query: '', suggestions: [] };
    }

    const q = query.trim();
    const results = await this.search(q);

    const top5 = results.results.slice(0, 5).map((r) => ({
      type: r.type,
      id: r.id,
      code: r.code,
      name: r.name,
      subtitle: r.subtitle,
    }));

    return { query: q, suggestions: top5 };
  }

  private async searchAssets(q: string): Promise<SearchResult[]> {
    const assets = await this.prisma.asset.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { observations: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { assetType: true, municipality: true },
      take: 20,
    });

    return assets.map((a) => ({
      type: 'asset',
      id: a.id,
      code: a.code,
      name: a.name,
      subtitle: `${a.assetType.name} — ${a.municipality?.name || ''}`,
      relevance: this.calcRelevance(q, a.code, a.name, a.observations),
    }));
  }

  private async searchSegments(q: string): Promise<SearchResult[]> {
    const segments = await this.prisma.networkSegment.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    return segments.map((s) => ({
      type: 'segment',
      id: s.id,
      code: s.code,
      name: s.name,
      subtitle: `Segmento — ${s.segmentType}`,
      relevance: this.calcRelevance(q, s.code, s.name, null),
    }));
  }

  private async searchMunicipalities(q: string): Promise<SearchResult[]> {
    const municipalities = await this.prisma.municipality.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { department: true },
      take: 10,
    });

    return municipalities.map((m) => ({
      type: 'municipality',
      id: m.id,
      code: '',
      name: m.name,
      subtitle: m.department?.name || '',
      relevance: m.name.toLowerCase() === q.toLowerCase() ? 90 : m.name.toLowerCase().startsWith(q.toLowerCase()) ? 70 : 50,
    }));
  }

  private async searchCoverageAreas(q: string): Promise<SearchResult[]> {
    const areas = await this.prisma.coverageArea.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { municipality: true },
      take: 10,
    });

    return areas.map((ca) => ({
      type: 'coverage_area',
      id: ca.id,
      code: '',
      name: ca.name,
      subtitle: ca.municipality?.name || '',
      relevance: ca.name.toLowerCase() === q.toLowerCase() ? 90 : ca.name.toLowerCase().startsWith(q.toLowerCase()) ? 70 : 50,
    }));
  }

  private calcRelevance(query: string, code: string, name: string, observations: string | null): number {
    const q = query.toLowerCase();
    const c = code.toLowerCase();
    const n = name.toLowerCase();

    if (c === q) return 100;
    if (c.startsWith(q)) return 80;
    if (c.includes(q)) return 60;
    if (n.includes(q)) return 40;
    if (observations?.toLowerCase().includes(q)) return 20;
    return 10;
  }

  private async logSearchQuery(query: string, resultCount: number) {
    try {
      await this.prisma.searchQuery.create({
        data: {
          query,
          resultType: null,
          resultCount,
        },
      });
    } catch (err) {
      this.logger.warn('No se pudo registrar la búsqueda', (err as Error).message);
    }
  }
}
