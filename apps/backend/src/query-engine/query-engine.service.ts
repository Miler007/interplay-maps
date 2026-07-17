import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueryEngineService {
  private readonly logger = new Logger(QueryEngineService.name);

  constructor(private prisma: PrismaService) {}

  async findNearestAvailable(lat: number, lng: number, type?: string, minFreePorts = 1) {
    const assetTypeFilter = type
      ? `AND a."asset_type_id" = (SELECT id FROM asset_types WHERE code = '${type}')`
      : '';

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT
          a.id, a.code, a.name, a.latitude, a.longitude,
          ci.free_ports, ci.total_ports, ci.occupancy_pct,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) AS distance_meters
        FROM assets a
        LEFT JOIN capacity_info ci ON ci.asset_id = a.id
        WHERE a.latitude IS NOT NULL
          AND a.longitude IS NOT NULL
          AND (ci.free_ports IS NULL OR ci.free_ports >= ${minFreePorts})
          ${assetTypeFilter}
        ORDER BY distance_meters ASC
        LIMIT 10
      `);

      if (rows.length === 0) {
        return this.fallbackNearestAvailable(lat, lng, type, minFreePorts);
      }

      return rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        freePorts: r.free_ports ?? 0,
        totalPorts: r.total_ports ?? 0,
        occupancyPct: r.occupancy_pct ?? 0,
        distanceMeters: Math.round(Number(r.distance_meters) * 100) / 100,
      }));
    } catch (err) {
      this.logger.warn('PostGIS query failed, using fallback', (err as Error).message);
      return this.fallbackNearestAvailable(lat, lng, type, minFreePorts);
    }
  }

  private async fallbackNearestAvailable(lat: number, lng: number, type?: string, minFreePorts = 1) {
    const where: any = {
      latitude: { not: null },
      longitude: { not: null },
      OR: [
        { capacity: { freePorts: { gte: minFreePorts } } },
        { capacity: null },
      ],
    };
    if (type) where.assetType = { code: type };

    const assets = await this.prisma.asset.findMany({
      where,
      include: { capacity: true, assetType: true },
    });

    const haversineDistance = (a: { latitude: number; longitude: number }, b: { lat: number; lng: number }) => {
      const R = 6371000;
      const dLat = ((a.latitude - b.lat) * Math.PI) / 180;
      const dLng = ((a.longitude - b.lng) * Math.PI) / 180;
      const sinDLat = Math.sin(dLat / 2);
      const sinDLng = Math.sin(dLng / 2);
      const aVal =
        sinDLat * sinDLat +
        Math.cos((b.lat * Math.PI) / 180) *
          Math.cos((a.latitude * Math.PI) / 180) *
          sinDLng * sinDLng;
      return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    };

    const scored = assets
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        latitude: a.latitude!,
        longitude: a.longitude!,
        freePorts: a.capacity?.freePorts ?? 0,
        totalPorts: a.capacity?.totalPorts ?? 0,
        occupancyPct: a.capacity?.occupancyPct ?? 0,
        distanceMeters: Math.round(haversineDistance({ latitude: a.latitude!, longitude: a.longitude! }, { lat, lng }) * 100) / 100,
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 10);

    return scored;
  }

  async findOrphans() {
    const assetsWithRelations = await this.prisma.asset.findMany({
      where: {
        OR: [
          { relationshipsFrom: { some: {} } },
          { relationshipsTo: { some: {} } },
          { segmentsFrom: { some: {} } },
          { segmentsTo: { some: {} } },
        ],
      },
      select: { id: true },
    });

    const connectedIds = new Set(assetsWithRelations.map((a) => a.id));

    const allAssets = await this.prisma.asset.findMany({
      where: { id: { notIn: [...connectedIds] } },
      include: { assetType: true, municipality: true },
      orderBy: { createdAt: 'desc' },
    });

    if (allAssets.length === 0) {
      return { message: 'No se encontraron activos huérfanos', data: [] };
    }

    return { data: allAssets };
  }

  async detectCycles() {
    const relationships = await this.prisma.assetRelationship.findMany({
      select: { sourceAssetId: true, targetAssetId: true },
    });

    const adj = new Map<string, string[]>();
    for (const rel of relationships) {
      if (!adj.has(rel.sourceAssetId)) adj.set(rel.sourceAssetId, []);
      adj.get(rel.sourceAssetId)!.push(rel.targetAssetId);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: Array<{ cycle: string[]; startNode: string }> = [];
    const nodeSet = new Set<string>();

    for (const rel of relationships) {
      nodeSet.add(rel.sourceAssetId);
      nodeSet.add(rel.targetAssetId);
    }

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, path)) return true;
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push({
              cycle: [...path.slice(cycleStart), neighbor],
              startNode: neighbor,
            });
          }
          return true;
        }
      }

      path.pop();
      recStack.delete(node);
      return false;
    };

    for (const node of nodeSet) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    const uniqueCycles = cycles.filter(
      (c, i, self) => i === self.findIndex((cc) => cc.startNode === c.startNode),
    );

    if (uniqueCycles.length > 0) {
      const assetIds = [...new Set(uniqueCycles.flatMap((c) => c.cycle))];
      const assets = await this.prisma.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, code: true, name: true },
      });
      const assetMap = new Map(assets.map((a) => [a.id, a]));

      return {
        hasCycles: true,
        cycles: uniqueCycles.map((c) => ({
          nodes: c.cycle.map((id) => assetMap.get(id) || { id, code: id, name: 'Desconocido' }),
        })),
      };
    }

    return { hasCycles: false, cycles: [] };
  }

  async calculateRoutes(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: { assetType: true },
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const allSegments = await this.prisma.networkSegment.findMany({
      include: {
        sourceAsset: { include: { assetType: true, municipality: true } },
        targetAsset: { include: { assetType: true, municipality: true } },
      },
    });

    const parentMap = new Map<string, typeof allSegments>();
    for (const seg of allSegments) {
      if (!parentMap.has(seg.targetAssetId)) parentMap.set(seg.targetAssetId, []);
      parentMap.get(seg.targetAssetId)!.push(seg);
    }

    const routes: Array<Array<{ asset: any; segment: any }>> = [];
    const currentPath: Array<{ asset: any; segment: any }> = [];

    const walk = (nodeId: string, depth: number) => {
      if (depth > 50) return;
      const upstream = parentMap.get(nodeId) || [];
      if (upstream.length === 0) {
        routes.push([...currentPath]);
        return;
      }
      for (const seg of upstream) {
        currentPath.push({
          asset: seg.sourceAsset,
          segment: {
            id: seg.id,
            code: seg.code,
            name: seg.name,
            segmentType: seg.segmentType,
            lengthMeters: seg.lengthMeters,
          },
        });
        walk(seg.sourceAssetId, depth + 1);
        currentPath.pop();
      }
    };

    currentPath.push({
      asset,
      segment: null,
    });

    walk(assetId, 0);

    const sorted = routes.sort((a, b) => {
      const aLen = a.reduce((sum, s) => sum + (s.segment?.lengthMeters || 0), 0);
      const bLen = b.reduce((sum, s) => sum + (s.segment?.lengthMeters || 0), 0);
      return aLen - bLen;
    });

    return sorted;
  }

  async suggestExpansion(assetId: string, radius = 500) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, latitude: true, longitude: true },
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const candidates = await this.prisma.asset.findMany({
      where: {
        id: { not: assetId },
        latitude: { not: null },
        longitude: { not: null },
        capacity: {
          freePorts: { gte: 1 },
          occupancyPct: { lt: 50 },
        },
      },
      include: { capacity: true, assetType: true, municipality: true },
    });

    const haversineDistance = (
      a: { latitude: number; longitude: number },
      b: { latitude: number; longitude: number },
    ) => {
      const R = 6371000;
      const dLat = ((a.latitude - b.latitude) * Math.PI) / 180;
      const dLng = ((a.longitude - b.longitude) * Math.PI) / 180;
      const sinDLat = Math.sin(dLat / 2);
      const sinDLng = Math.sin(dLng / 2);
      const aVal =
        sinDLat * sinDLat +
        Math.cos((b.latitude * Math.PI) / 180) *
          Math.cos((a.latitude * Math.PI) / 180) *
          sinDLng * sinDLng;
      return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    };

    const withinRadius = candidates
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        assetType: c.assetType,
        municipality: c.municipality,
        latitude: c.latitude!,
        longitude: c.longitude!,
        freePorts: c.capacity?.freePorts ?? 0,
        totalPorts: c.capacity?.totalPorts ?? 0,
        occupancyPct: c.capacity?.occupancyPct ?? 0,
        distanceMeters: Math.round(
          haversineDistance(
            { latitude: c.latitude!, longitude: c.longitude! },
            { latitude: asset.latitude!, longitude: asset.longitude! },
          ) * 100,
        ) / 100,
      }))
      .filter((c) => c.distanceMeters <= radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      originAssetId: assetId,
      radius,
      suggestions: withinRadius,
    };
  }
}
