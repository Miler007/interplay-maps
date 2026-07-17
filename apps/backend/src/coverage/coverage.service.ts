import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoverageService {
  private readonly logger = new Logger(CoverageService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coverageArea.findMany({
      include: { municipality: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const area = await this.prisma.coverageArea.findUnique({
      where: { id },
      include: { municipality: true },
    });
    if (!area) throw new NotFoundException('Área de cobertura no encontrada');
    return area;
  }

  async calculate(municipalityId: string) {
    const municipality = await this.prisma.municipality.findUnique({
      where: { id: municipalityId },
    });
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const assets = await this.prisma.asset.findMany({
      where: { municipalityId },
      include: { assetType: true, geometry: true },
    });

    const buffers: number[][][] = [];
    for (const asset of assets) {
      let radius = 200;
      if (asset.assetType.code === 'MUFLA' || asset.assetType.code === 'OLT') {
        radius = 500;
      } else if (asset.assetType.code === 'NODO' || asset.assetType.code === 'POSTE') {
        radius = 300;
      }

      const lat = asset.latitude;
      const lng = asset.longitude;
      if (lat == null || lng == null) continue;

      const ring = this.createCirclePolygon(lat, lng, radius, 16);
      if (ring.length > 0) {
        buffers.push(ring);
      }
    }

    const merged = this.mergeRings(buffers);

    const totalArea = merged.reduce((sum, ring) => sum + this.polygonArea(ring), 0);
    const totalHomes = Math.round(totalArea * 50);
    const coveredHomes = Math.round(totalHomes * 0.85);
    const coveragePct = totalHomes > 0 ? Math.round((coveredHomes / totalHomes) * 10000) / 100 : 0;

    const geojson = {
      type: 'MultiPolygon',
      coordinates: [merged] as number[][][][],
    };

    const name = `Cobertura ${municipality.name}`;

    const existing = await this.prisma.coverageArea.findFirst({
      where: { municipalityId, isAutoCalculated: true },
    });

    if (existing) {
      return this.prisma.coverageArea.update({
        where: { id: existing.id },
        data: {
          name,
          geojson,
          totalHomes,
          coveredHomes,
          coveragePct,
          isAutoCalculated: true,
          calculatedAt: new Date(),
        },
        include: { municipality: true },
      });
    }

    return this.prisma.coverageArea.create({
      data: {
        municipalityId,
        name,
        geojson,
        totalHomes,
        coveredHomes,
        coveragePct,
        isAutoCalculated: true,
      },
      include: { municipality: true },
    });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return this.prisma.coverageArea.update({
      where: { id },
      data,
      include: { municipality: true },
    });
  }

  private createCirclePolygon(lat: number, lng: number, radiusMeters: number, numPoints: number): number[][] {
    const coords: number[][] = [];
    const kmPerDegree = 111320;
    const latRad = (lat * Math.PI) / 180;
    const dLat = radiusMeters / kmPerDegree;
    const dLng = radiusMeters / (kmPerDegree * Math.cos(latRad));

    for (let i = 0; i <= numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;
      coords.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
    }

    return coords;
  }

  private mergeRings(rings: number[][][]): number[][][] {
    if (rings.length === 0) return [];

    const merged: number[][][] = [];

    for (const ring of rings) {
      let mergedWithExisting = false;
      for (let i = 0; i < merged.length; i++) {
        if (this.ringsOverlap(merged[i], ring)) {
          merged[i] = this.convexHull([...merged[i], ...ring]);
          mergedWithExisting = true;
          break;
        }
      }
      if (!mergedWithExisting) {
        merged.push(ring);
      }
    }

    return merged;
  }

  private ringsOverlap(a: number[][], b: number[][]): boolean {
    const aMinX = Math.min(...a.map((p) => p[0]));
    const aMaxX = Math.max(...a.map((p) => p[0]));
    const aMinY = Math.min(...a.map((p) => p[1]));
    const aMaxY = Math.max(...a.map((p) => p[1]));
    const bMinX = Math.min(...b.map((p) => p[0]));
    const bMaxX = Math.max(...b.map((p) => p[0]));
    const bMinY = Math.min(...b.map((p) => p[1]));
    const bMaxY = Math.max(...b.map((p) => p[1]));

    return !(aMaxX < bMinX || aMinX > bMaxX || aMaxY < bMinY || aMinY > bMaxY);
  }

  private convexHull(points: number[][]): number[][] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length <= 1) return sorted;

    const cross = (o: number[], a: number[], b: number[]) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

    const lower: number[][] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
        lower.pop();
      lower.push(p);
    }

    const upper: number[][] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
        upper.pop();
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  }

  private polygonArea(ring: number[][]): number {
    const R2 = 6371000 * 6371000;
    let area = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = (ring[i][0] * Math.PI) / 180;
      const yi = (ring[i][1] * Math.PI) / 180;
      const xj = (ring[j][0] * Math.PI) / 180;
      const yj = (ring[j][1] * Math.PI) / 180;
      area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
    }
    return Math.abs((area * R2) / 2);
  }
}
