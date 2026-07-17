import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);

  constructor(private prisma: PrismaService) {}

  async calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const R = 6371000;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLon = ((toLng - fromLng) * Math.PI) / 180;
    const lat1 = (fromLat * Math.PI) / 180;
    const lat2 = (toLat * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { meters: Math.round(meters), kilometers: Math.round(meters / 10) / 100 };
  }

  async calculateArea(coordinates: [number, number][]) {
    if (coordinates.length < 3) return { squareMeters: 0, hectares: 0 };
    let area = 0;
    const n = coordinates.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = coordinates[i][0] * 111320;
      const y1 = coordinates[i][1] * 111320 * Math.cos((coordinates[i][1] * Math.PI) / 180);
      const x2 = coordinates[j][0] * 111320;
      const y2 = coordinates[j][1] * 111320 * Math.cos((coordinates[j][1] * Math.PI) / 180);
      area += x1 * y2 - x2 * y1;
    }
    area = Math.abs(area) / 2;
    return { squareMeters: Math.round(area), hectares: Math.round(area / 100) / 100 };
  }

  async getAssetMeasurements(assetId: string) {
    const geom = await this.prisma.geometry.findUnique({ where: { assetId } });
    if (!geom) return null;
    const geo = geom.geojson as any;
    if (geo.type === 'Point') {
      return { type: 'Point', coordinates: geo.coordinates };
    }
    if (geo.type === 'LineString' || geo.type === 'MultiLineString') {
      const coords = geo.type === 'LineString' ? [geo.coordinates] : geo.coordinates;
      let totalMeters = 0;
      for (const line of coords) {
        for (let i = 1; i < line.length; i++) {
          const d = await this.calculateDistance(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
          totalMeters += d.meters;
        }
      }
      return { type: geo.type, lengthMeters: Math.round(totalMeters), lengthKm: Math.round(totalMeters / 10) / 100 };
    }
    if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') {
      const coords = geo.type === 'Polygon' ? geo.coordinates[0] : geo.coordinates[0][0];
      const area = await this.calculateArea(coords);
      return { type: geo.type, ...area };
    }
    return { type: geo.type };
  }
}
