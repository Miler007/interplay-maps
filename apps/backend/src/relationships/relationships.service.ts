import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(private prisma: PrismaService) {}

  async getRelationships(assetId: string) {
    return this.prisma.assetRelationship.findMany({
      where: { OR: [{ sourceAssetId: assetId }, { targetAssetId: assetId }] },
      include: {
        sourceAsset: { select: { id: true, code: true, name: true } },
        targetAsset: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createRelationship(data: { sourceAssetId: string; targetAssetId: string; relationType: string; description?: string; metadata?: any }) {
    return this.prisma.assetRelationship.create({ data });
  }

  async deleteRelationship(id: string) {
    return this.prisma.assetRelationship.delete({ where: { id } });
  }

  async getRelationshipTypes() {
    const types = await this.prisma.assetRelationship.findMany({
      distinct: ['relationType'],
      select: { relationType: true },
    });
    return types.map((t) => ({ name: t.relationType }));
  }

  async analyzeGraph() {
    const relationships = await this.prisma.assetRelationship.findMany({
      select: { sourceAssetId: true, targetAssetId: true, relationType: true },
    });
    const nodeSet = new Set<string>();
    relationships.forEach((r) => { nodeSet.add(r.sourceAssetId); nodeSet.add(r.targetAssetId); });
    return {
      nodeCount: nodeSet.size,
      edgeCount: relationships.length,
      density: nodeSet.size > 1 ? (2 * relationships.length) / (nodeSet.size * (nodeSet.size - 1)) : 0,
    };
  }
}
