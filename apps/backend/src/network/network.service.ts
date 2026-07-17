import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EVENT_NAMES } from '../events/events.module';
import { SegmentType, SegmentStatus } from '@prisma/client';

const segmentIncludes = {
  sourceAsset: { include: { assetType: true, municipality: true } },
  targetAsset: { include: { assetType: true, municipality: true } },
};

const assetIncludes = {
  assetType: true,
  municipality: true,
  department: true,
  geometry: true,
};

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async getTree(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: assetIncludes,
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const buildTree = async (parentId: string): Promise<any> => {
      const segments = await this.prisma.networkSegment.findMany({
        where: { sourceAssetId: parentId },
        include: {
          ...segmentIncludes,
          targetAsset: { include: assetIncludes },
        },
      });

      const children = [];
      for (const seg of segments) {
        const subtree = await buildTree(seg.targetAssetId);
        children.push({
          asset: seg.targetAsset,
          segment: {
            id: seg.id,
            code: seg.code,
            name: seg.name,
            segmentType: seg.segmentType,
            lengthMeters: seg.lengthMeters,
            fiberCount: seg.fiberCount,
            status: seg.status,
          },
          children: subtree,
        });
      }
      return children;
    };

    const children = await buildTree(assetId);
    return { asset, children };
  }

  async getChildren(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const segments = await this.prisma.networkSegment.findMany({
      where: { sourceAssetId: assetId },
      include: {
        targetAsset: { include: assetIncludes },
      },
    });

    return segments.map((seg) => ({
      asset: seg.targetAsset,
      segment: {
        id: seg.id,
        code: seg.code,
        name: seg.name,
        segmentType: seg.segmentType,
        lengthMeters: seg.lengthMeters,
        fiberCount: seg.fiberCount,
        status: seg.status,
      },
    }));
  }

  async getPath(fromId: string, toId: string) {
    const [fromAsset, toAsset] = await Promise.all([
      this.prisma.asset.findUnique({ where: { id: fromId } }),
      this.prisma.asset.findUnique({ where: { id: toId } }),
    ]);
    if (!fromAsset) throw new NotFoundException('Activo origen no encontrado');
    if (!toAsset) throw new NotFoundException('Activo destino no encontrado');

    const allSegments = await this.prisma.networkSegment.findMany({
      include: segmentIncludes,
    });

    const adj = new Map<string, Array<{ nodeId: string; segment: any }>>();
    for (const seg of allSegments) {
      if (!adj.has(seg.sourceAssetId)) adj.set(seg.sourceAssetId, []);
      if (!adj.has(seg.targetAssetId)) adj.set(seg.targetAssetId, []);
      adj.get(seg.sourceAssetId)!.push({ nodeId: seg.targetAssetId, segment: seg });
      adj.get(seg.targetAssetId)!.push({ nodeId: seg.sourceAssetId, segment: seg });
    }

    const visited = new Set<string>();
    const parent = new Map<string, { nodeId: string; segment: any } | null>();
    const queue: string[] = [fromId];
    visited.add(fromId);
    parent.set(fromId, null);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toId) break;
      const neighbors = adj.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.nodeId)) {
          visited.add(neighbor.nodeId);
          parent.set(neighbor.nodeId, { nodeId: current, segment: neighbor.segment });
          queue.push(neighbor.nodeId);
        }
      }
    }

    if (!visited.has(toId)) {
      throw new NotFoundException('No se encontró una ruta entre los activos');
    }

    const path: Array<{ assetId: string; segment: any }> = [];
    let current: string | null = toId;
    while (current && parent.get(current)) {
      const edge: { nodeId: string; segment: any } = parent.get(current)!;
      path.unshift({ assetId: current, segment: edge.segment });
      current = edge.nodeId;
    }
    path.unshift({ assetId: fromId, segment: null });

    const assetIds = [...new Set(path.map((p) => p.assetId))];
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds } },
      include: assetIncludes,
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    return path.map((p) => ({
      asset: assetMap.get(p.assetId) || null,
      segment: p.segment,
    }));
  }

  async getRoute(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: assetIncludes,
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const route: Array<{ asset: any; segment: any }> = [{ asset, segment: null }];
    let currentId = assetId;

    for (let i = 0; i < 50; i++) {
      const segment = await this.prisma.networkSegment.findFirst({
        where: { targetAssetId: currentId },
        include: {
          sourceAsset: { include: assetIncludes },
        },
      });
      if (!segment) break;
      route.push({ asset: segment.sourceAsset, segment });
      currentId = segment.sourceAssetId;
    }

    return route;
  }

  async listSegments(filters: { type?: SegmentType; status?: SegmentStatus; municipality?: string }) {
    const where: any = {};
    if (filters.type) where.segmentType = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.municipality) where.municipalityId = filters.municipality;

    return this.prisma.networkSegment.findMany({
      where,
      include: segmentIncludes,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSegment(id: string) {
    const segment = await this.prisma.networkSegment.findUnique({
      where: { id },
      include: segmentIncludes,
    });
    if (!segment) throw new NotFoundException('Segmento no encontrado');
    return segment;
  }

  async createSegment(data: {
    code: string;
    name: string;
    segmentType: SegmentType;
    sourceAssetId: string;
    targetAssetId: string;
    lengthMeters?: number;
    fiberCount?: number;
    fiberColor?: string;
    capacityTotal?: number;
    capacityUsed?: number;
    status?: SegmentStatus;
    geojson?: any;
    departmentId: string;
    municipalityId: string;
    projectId?: string;
    observations?: string;
  }) {
    const [source, target] = await Promise.all([
      this.prisma.asset.findUnique({ where: { id: data.sourceAssetId } }),
      this.prisma.asset.findUnique({ where: { id: data.targetAssetId } }),
    ]);
    if (!source) throw new BadRequestException('Activo origen no encontrado');
    if (!target) throw new BadRequestException('Activo destino no encontrado');

    const segment = await this.prisma.networkSegment.create({
      data,
      include: segmentIncludes,
    });
    this.events.emit(EVENT_NAMES.ASSET.CREATED, { segmentId: segment.id, code: segment.code });
    return segment;
  }

  async updateSegment(id: string, data: any) {
    await this.getSegment(id);
    const segment = await this.prisma.networkSegment.update({
      where: { id },
      data,
      include: segmentIncludes,
    });
    this.events.emit(EVENT_NAMES.ASSET.UPDATED, { segmentId: id });
    return segment;
  }

  async deleteSegment(id: string) {
    await this.getSegment(id);
    await this.prisma.networkSegment.delete({ where: { id } });
    this.events.emit(EVENT_NAMES.ASSET.DELETED, { segmentId: id });
  }
}
