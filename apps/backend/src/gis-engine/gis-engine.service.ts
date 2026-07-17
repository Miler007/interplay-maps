import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: { type: string; coordinates: number[] | number[][] | number[][][] };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

@Injectable()
export class GISEngineService {
  private readonly logger = new Logger(GISEngineService.name);

  constructor(private prisma: PrismaService) {}

  private R = 6371000;

  /** Convert assets to GeoJSON FeatureCollection */
  async assetsToGeoJSON(params: {
    municipalityId?: string;
    departmentId?: string;
    type?: string;
    layerId?: string;
    status?: string;
  }): Promise<GeoJSONFeatureCollection> {
    const where: any = {};
    if (params.municipalityId) where.municipalityId = params.municipalityId;
    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.type) where.assetType = { code: params.type };
    if (params.status) where.status = params.status;
    if (params.layerId) {
      where.layerAssets = { some: { layerId: params.layerId } };
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        assetType: true,
        department: { select: { name: true } },
        municipality: { select: { name: true } },
        geometry: true,
        layerAssets: { include: { layer: true } },
        healthScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
        confidenceScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });

    const features: GeoJSONFeature[] = assets.map((asset) => {
      const geometry = asset.geometry?.geojson as any || {
        type: 'Point',
        coordinates: [asset.longitude || 0, asset.latitude || 0],
      };
      return {
        type: 'Feature',
        id: asset.code,
        geometry: {
          type: geometry.type || 'Point',
          coordinates: geometry.coordinates || [asset.longitude || 0, asset.latitude || 0],
        },
        properties: {
          id: asset.id,
          code: asset.code,
          name: asset.name,
          type: asset.assetType.code,
          typeName: asset.assetType.name,
          status: asset.status,
          department: asset.department?.name || '',
          municipality: asset.municipality?.name || '',
          confidenceScore: asset.confidenceScores[0]?.score || 0,
          healthScore: asset.healthScores[0]?.overallScore || 0,
          layers: asset.layerAssets.map((la) => ({ id: la.layer.id, code: la.layer.code, name: la.layer.name })),
          createdAt: asset.createdAt,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }

  /** NEAREST NEIGHBOR — find closest assets to a point */
  async nearestNeighbor(params: {
    latitude: number; longitude: number; type?: string; limit?: number; maxDistance?: number;
  }): Promise<GeoJSONFeatureCollection> {
    const limit = params.limit || 10;
    const maxDistance = params.maxDistance || 5000;
    let assets = await this.prisma.asset.findMany({
      where: {
        latitude: { not: null }, longitude: { not: null },
        ...(params.type ? { assetType: { code: params.type } } : {}),
      },
      include: { assetType: true, department: { select: { name: true } }, municipality: { select: { name: true } } },
    });

    const withDistance = assets.map((asset) => ({ asset, distance: this.haversine(params.latitude, params.longitude, asset.latitude!, asset.longitude!) }))
      .filter((item) => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    const features: GeoJSONFeature[] = withDistance.map(({ asset, distance }) => ({
      type: 'Feature',
      id: asset.code,
      geometry: { type: 'Point', coordinates: [asset.longitude!, asset.latitude!] },
      properties: { id: asset.id, code: asset.code, name: asset.name, type: asset.assetType.code, status: asset.status, department: asset.department.name, municipality: asset.municipality.name, distance: Math.round(distance) },
    }));
    return { type: 'FeatureCollection', features };
  }

  /** BOUNDING BOX — find all assets within a geographic bounding box */
  async boundingBox(params: { north: number; south: number; east: number; west: number; type?: string }): Promise<GeoJSONFeatureCollection> {
    const where: any = {
      latitude: { gte: params.south, lte: params.north },
      longitude: { gte: params.west, lte: params.east },
    };
    if (params.type) where.assetType = { code: params.type };
    const assets = await this.prisma.asset.findMany({
      where,
      include: { assetType: true, department: { select: { name: true } }, municipality: { select: { name: true } } },
    });
    const features: GeoJSONFeature[] = assets.map((asset) => ({
      type: 'Feature',
      id: asset.code,
      geometry: { type: 'Point', coordinates: [asset.longitude!, asset.latitude!] },
      properties: { id: asset.id, code: asset.code, name: asset.name, type: asset.assetType.code, status: asset.status, department: asset.department?.name || '', municipality: asset.municipality?.name || '' },
    }));
    return { type: 'FeatureCollection', features };
  }

  /** DISTANCE MATRIX — calculate distances between multiple pairs */
  async distanceMatrix(params: { points: Array<{ lat: number; lng: number }> }): Promise<{ matrix: number[][] }> {
    const n = params.points.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this.haversine(params.points[i].lat, params.points[i].lng, params.points[j].lat, params.points[j].lng);
        matrix[i][j] = Math.round(d);
        matrix[j][i] = Math.round(d);
      }
    }
    return { matrix };
  }

  /** SPATIAL INDEX VALIDATION — check data quality */
  async spatialIndexValidation(params: { municipalityId?: string }): Promise<{
    total: number; withGeometry: number; withoutGeometry: number; outsideBounds: number; nullCoords: number; issues: string[];
  }> {
    const where: any = {};
    if (params.municipalityId) where.municipalityId = params.municipalityId;
    const assets = await this.prisma.asset.findMany({ where, select: { id: true, code: true, latitude: true, longitude: true } });
    const issues: string[] = [];
    let withGeometry = 0, withoutGeometry = 0, outsideBounds = 0, nullCoords = 0;

    for (const asset of assets) {
      if (!asset.latitude || !asset.longitude) {
        nullCoords++;
        issues.push(`${asset.code}: coordenadas nulas`);
        continue;
      }
      if (asset.latitude < -90 || asset.latitude > 90 || asset.longitude < -180 || asset.longitude > 180) {
        outsideBounds++;
        issues.push(`${asset.code}: coordenadas fuera de rango (${asset.latitude}, ${asset.longitude})`);
      }
      withGeometry++;
    }
    withoutGeometry = assets.length - withGeometry;
    return { total: assets.length, withGeometry, withoutGeometry, outsideBounds, nullCoords, issues };
  }

  /** GEOJSON OPTIMIZER — reduce GeoJSON size */
  optimizeGeoJSON(collection: GeoJSONFeatureCollection, precision = 6): GeoJSONFeatureCollection {
    const factor = Math.pow(10, precision);
    const truncate = (v: number) => Math.round(v * factor) / factor;

    return {
      type: 'FeatureCollection',
      features: collection.features.map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: this.truncateCoords(f.geometry.coordinates, truncate),
        },
        properties: Object.fromEntries(
          Object.entries(f.properties).filter(([_, v]) => v !== null && v !== undefined),
        ),
      })),
    };
  }

  private truncateCoords(coords: any, truncate: (v: number) => number): any {
    if (typeof coords[0] === 'number') return coords.map(truncate);
    return coords.map((c: any) => this.truncateCoords(c, truncate));
  }

  /** Calculate distance between two points */
  async calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<{ meters: number; kilometers: number }> {
    const meters = this.haversine(fromLat, fromLng, toLat, toLng);
    return { meters: Math.round(meters), kilometers: Math.round(meters / 10) / 100 };
  }

  /** Get cluster data for map */
  async getClusterData(zoom: number, bounds?: { north: number; south: number; east: number; west: number }): Promise<{ clusters: Array<{ lat: number; lng: number; count: number }> }> {
    const where: any = {};
    if (bounds) {
      where.latitude = { gte: bounds.south, lte: bounds.north };
      where.longitude = { gte: bounds.west, lte: bounds.east };
    }
    const assets = await this.prisma.asset.findMany({ where, select: { latitude: true, longitude: true, id: true } });
    const gridSize = Math.max(1, Math.floor(10 / (zoom + 1)));
    const clusters = new Map<string, { lat: number; lng: number; count: number }>();
    for (const asset of assets) {
      if (!asset.latitude || !asset.longitude) continue;
      const key = `${Math.round(asset.latitude * gridSize)}_${Math.round(asset.longitude * gridSize)}`;
      const existing = clusters.get(key);
      if (existing) {
        existing.count++;
      } else {
        clusters.set(key, { lat: asset.latitude, lng: asset.longitude, count: 1 });
      }
    }
    return { clusters: Array.from(clusters.values()) };
  }

  /** Validate coordinate quality */
  async validateCoordinate(latitude: number, longitude: number, municipalityId?: string): Promise<{ valid: boolean; message: string }> {
    if (latitude < -90 || latitude > 90) return { valid: false, message: 'Latitud fuera de rango (-90 a 90)' };
    if (longitude < -180 || longitude > 180) return { valid: false, message: 'Longitud fuera de rango (-180 a 180)' };
    if (municipalityId) {
      const mun = await this.prisma.municipality.findUnique({ where: { id: municipalityId } });
      if (mun && mun.northBound) {
        if (latitude > mun.northBound || latitude < (mun.southBound || -90) || longitude > (mun.eastBound || 180) || longitude < (mun.westBound || -180)) {
          return { valid: false, message: `Coordenadas fuera de límites del municipio` };
        }
      }
    }
    return { valid: true, message: 'Coordenadas válidas' };
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return this.R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
