import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

interface CachedSnapshot {
  timestamp: string;
  data: any;
  cachedAt: number;
}

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private cache: Map<string, CachedSnapshot> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_CACHE = 20;

  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
  ) {}

  async getStateAt(timestamp: Date) {
    const key = timestamp.toISOString();
    this.logger.log(`Getting network state at ${key}`);

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      this.logger.log(`Returning cached snapshot for ${key}`);
      return cached.data;
    }

    const [assets, segments, relationships] = await Promise.all([
      this.getAssetsAtTimestamp(timestamp),
      this.getSegmentsAtTimestamp(timestamp),
      this.prisma.assetRelationship.findMany({
        include: { sourceAsset: true, targetAsset: true },
      }),
    ]);

    const data = { timestamp: key, assets, segments, relationships };
    this.setCache(key, data);
    return data;
  }

  async diff(from: Date, to: Date) {
    this.logger.log(`Computing diff from ${from.toISOString()} to ${to.toISOString()}`);

    const [stateFrom, stateTo] = await Promise.all([
      this.getStateAt(from),
      this.getStateAt(to),
    ]);

    const assetsFrom = new Map<string, any>(stateFrom.assets.map((a: any) => [a.id, a]));
    const assetsTo = new Map<string, any>(stateTo.assets.map((a: any) => [a.id, a]));

    const addedAssets = stateTo.assets.filter((a: any) => !assetsFrom.has(a.id));
    const removedAssets = stateFrom.assets.filter((a: any) => !assetsTo.has(a.id));
    const changedAssets: any[] = [];

    for (const [id, assetTo] of assetsTo) {
      const assetFrom = assetsFrom.get(id);
      if (assetFrom) {
        const changes = this.computeObjectDiff(assetFrom, assetTo);
        if (Object.keys(changes).length > 0) {
          changedAssets.push({ id, code: assetTo.code, name: assetTo.name, changes });
        }
      }
    }

    const relsFrom = new Set(stateFrom.relationships.map((r: any) => `${r.sourceAssetId}-${r.targetAssetId}-${r.relationType}`));
    const relsTo = new Set(stateTo.relationships.map((r: any) => `${r.sourceAssetId}-${r.targetAssetId}-${r.relationType}`));

    const addedRelationships = stateTo.relationships.filter((r: any) => !relsFrom.has(`${r.sourceAssetId}-${r.targetAssetId}-${r.relationType}`));
    const removedRelationships = stateFrom.relationships.filter((r: any) => !relsTo.has(`${r.sourceAssetId}-${r.targetAssetId}-${r.relationType}`));

    const segmentsFrom = new Map<string, any>(stateFrom.segments.map((s: any) => [s.id, s]));
    const segmentsTo = new Map<string, any>(stateTo.segments.map((s: any) => [s.id, s]));

    const addedSegments = stateTo.segments.filter((s: any) => !segmentsFrom.has(s.id));
    const removedSegments = stateFrom.segments.filter((s: any) => !segmentsTo.has(s.id));
    const changedSegments: any[] = [];

    for (const [id, segTo] of segmentsTo) {
      const segFrom = segmentsFrom.get(id);
      if (segFrom) {
        const changes = this.computeObjectDiff(segFrom, segTo);
        if (Object.keys(changes).length > 0) {
          changedSegments.push({ id, code: segTo.code, name: segTo.name, changes });
        }
      }
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      assets: { added: addedAssets, removed: removedAssets, changed: changedAssets },
      relationships: { added: addedRelationships, removed: removedRelationships },
      segments: { added: addedSegments, removed: removedSegments, changed: changedSegments },
    };
  }

  async getAssetTimeline(assetId: string) {
    this.logger.log(`Getting playback timeline for asset ${assetId}`);
    return this.timeline.getTimeline(assetId);
  }

  async getSnapshots(page = 1, limit = 10) {
    this.logger.log(`Listing snapshot dates (page=${page}, limit=${limit})`);

    const dates = await this.prisma.assetVersion.findMany({
      select: { createdAt: true },
      distinct: ['createdAt'],
      orderBy: { createdAt: 'desc' },
    });

    const uniqueDates = [...new Set(dates.map((d) => d.createdAt.toISOString().split('T')[0]))].sort().reverse();
    const total = uniqueDates.length;
    const offset = (page - 1) * limit;
    const items = uniqueDates.slice(offset, offset + limit);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: items.map((d) => ({ date: d, label: d })),
    };
  }

  private async getAssetsAtTimestamp(timestamp: Date): Promise<any[]> {
    const assets = await this.prisma.asset.findMany({
      include: { assetType: true, municipality: true, department: true },
    });

    const result: any[] = [];
    for (const asset of assets) {
      const version = await this.prisma.assetVersion.findFirst({
        where: { assetId: asset.id, createdAt: { lte: timestamp } },
        orderBy: { createdAt: 'desc' },
      });

      if (version) {
        result.push({ ...asset, ...(version.snapshot as any), reconstructedFrom: version.id, reconstructedAt: version.createdAt });
      } else {
        result.push(asset);
      }
    }
    return result;
  }

  private async getSegmentsAtTimestamp(timestamp: Date): Promise<any[]> {
    const allSegments = await this.prisma.networkSegment.findMany({
      include: { sourceAsset: true, targetAsset: true },
    });

    const result: any[] = [];
    for (const seg of allSegments) {
      const version = await this.prisma.assetVersion.findFirst({
        where: {
          assetId: seg.id,
          createdAt: { lte: timestamp },
          snapshot: { path: ['segmentType'], not: undefined },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (version) {
        result.push({ ...seg, ...(version.snapshot as any), reconstructedFrom: version.id, reconstructedAt: version.createdAt });
      } else {
        result.push(seg);
      }
    }
    return result;
  }

  private computeObjectDiff(before: any, after: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const key of keys) {
      if (key === 'reconstructedFrom' || key === 'reconstructedAt') continue;
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        changes[key] = { from: before?.[key], to: after?.[key] };
      }
    }
    return changes;
  }

  private setCache(key: string, data: any) {
    if (this.cache.size >= this.MAX_CACHE) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(key, { timestamp: key, data, cachedAt: Date.now() });
  }
}
