import { Test, TestingModule } from '@nestjs/testing';
import { GISEngineService } from '../gis-engine.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GISEngineService', () => {
  let service: GISEngineService;

  const mockAsset = {
    id: 'asset-1',
    code: 'A-001',
    name: 'Test Asset',
    status: 'ACTIVO',
    latitude: 19.4326,
    longitude: -99.1332,
    createdAt: new Date(),
    assetType: { code: 'CAJAS', name: 'Cajas' },
    department: { name: 'CDMX' },
    municipality: { name: 'Cuauhtémoc' },
    geometry: { geojson: { type: 'Point', coordinates: [-99.1332, 19.4326] } },
    layerAssets: [{ layer: { id: 'layer-1', code: 'L1', name: 'Layer 1' } }],
    healthScores: [{ overallScore: 85, calculatedAt: new Date() }],
    confidenceScores: [{ score: 90, calculatedAt: new Date() }],
  };

  const mockAssets = [mockAsset, { ...mockAsset, id: 'asset-2', code: 'A-002', latitude: 19.5, longitude: -99.2 }];

  const mockPrisma = {
    asset: {
      findMany: jest.fn().mockResolvedValue(mockAssets),
    },
    municipality: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GISEngineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GISEngineService>(GISEngineService);
  });

  describe('assetsToGeoJSON', () => {
    it('should return a FeatureCollection with correct structure', async () => {
      const result = await service.assetsToGeoJSON({});
      expect(result).toHaveProperty('type', 'FeatureCollection');
      expect(result).toHaveProperty('features');
      expect(result.features).toHaveLength(2);
    });

    it('each feature should have type Feature, geometry, and properties', async () => {
      const result = await service.assetsToGeoJSON({ type: 'CAJAS' });
      const feature = result.features[0];
      expect(feature).toHaveProperty('type', 'Feature');
      expect(feature).toHaveProperty('geometry');
      expect(feature.geometry).toHaveProperty('type', 'Point');
      expect(feature.geometry).toHaveProperty('coordinates');
      expect(feature).toHaveProperty('properties');
      expect(feature.properties).toHaveProperty('id', 'asset-1');
      expect(feature.properties).toHaveProperty('code', 'A-001');
      expect(feature.properties).toHaveProperty('type', 'CAJAS');
    });

    it('should filter by municipalityId when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);
      await service.assetsToGeoJSON({ municipalityId: 'mun-1' });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ municipalityId: 'mun-1' }),
        }),
      );
    });

    it('should handle assets without geometry by falling back to lat/lng', async () => {
      const assetNoGeo = { ...mockAsset, geometry: null };
      mockPrisma.asset.findMany.mockResolvedValue([assetNoGeo]);
      const result = await service.assetsToGeoJSON({});
      expect(result.features[0].geometry.coordinates).toEqual([-99.1332, 19.4326]);
    });
  });

  describe('haversine distance', () => {
    it('should return 0 for same point', () => {
      const dist = (service as any).haversine(19.4326, -99.1332, 19.4326, -99.1332);
      expect(dist).toBe(0);
    });

    it('should calculate correct distance between two known points', () => {
      const dist = (service as any).haversine(19.4326, -99.1332, 19.5, -99.2);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(20000);
    });
  });

  describe('nearestNeighbor', () => {
    it('should return sorted results within maxDistance', async () => {
      const result = await service.nearestNeighbor({ latitude: 19.43, longitude: -99.13, maxDistance: 50000, limit: 5 });
      expect(result.type).toBe('FeatureCollection');
      expect(result.features.length).toBeGreaterThan(0);
      for (let i = 1; i < result.features.length; i++) {
        const prev = result.features[i - 1].properties.distance;
        const curr = result.features[i].properties.distance;
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it('should filter out assets beyond maxDistance', async () => {
      const farAsset = { ...mockAsset, id: 'asset-far', code: 'A-FAR', latitude: 90, longitude: 0 };
      mockPrisma.asset.findMany.mockResolvedValue([...mockAssets, farAsset]);
      const result = await service.nearestNeighbor({ latitude: 19.43, longitude: -99.13, maxDistance: 1000, limit: 10 });
      for (const feature of result.features) {
        expect(feature.properties.distance).toBeLessThanOrEqual(1000);
      }
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);
      const result = await service.nearestNeighbor({ latitude: 19.43, longitude: -99.13, limit: 1, maxDistance: 50000 });
      expect(result.features.length).toBeLessThanOrEqual(1);
    });
  });

  describe('boundingBox', () => {
    it('should filter assets within bounding box', async () => {
      const result = await service.boundingBox({ north: 20, south: 19, east: -99, west: -100 });
      expect(result.type).toBe('FeatureCollection');
      expect(result.features.length).toBe(2);
    });

    it('should pass correct where clause to prisma', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);
      await service.boundingBox({ north: 20, south: 19, east: -99, west: -100, type: 'CAJAS' });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            latitude: { gte: 19, lte: 20 },
            longitude: { gte: -100, lte: -99 },
            assetType: { code: 'CAJAS' },
          }),
        }),
      );
    });

    it('should return empty features when no assets match', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      const result = await service.boundingBox({ north: 10, south: 9, east: -80, west: -81 });
      expect(result.features).toHaveLength(0);
    });
  });

  describe('spatialIndexValidation', () => {
    it('should detect null coordinates', async () => {
      const nullCoordAsset = { id: 'asset-3', code: 'A-003', latitude: null, longitude: null };
      mockPrisma.asset.findMany.mockResolvedValue([nullCoordAsset]);
      const result = await service.spatialIndexValidation({});
      expect(result.nullCoords).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('coordenadas nulas');
    });

    it('should detect out-of-range coordinates', async () => {
      const outOfRangeAsset = { id: 'asset-4', code: 'A-004', latitude: 100, longitude: 200 };
      mockPrisma.asset.findMany.mockResolvedValue([outOfRangeAsset]);
      const result = await service.spatialIndexValidation({});
      expect(result.outsideBounds).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('fuera de rango');
    });

    it('should return correct totals', async () => {
      const assets = [
        { id: '1', code: 'A-1', latitude: 19.4, longitude: -99.1 },
        { id: '2', code: 'A-2', latitude: null, longitude: null },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(assets);
      const result = await service.spatialIndexValidation({});
      expect(result.total).toBe(2);
      expect(result.withGeometry).toBe(1);
      expect(result.nullCoords).toBe(1);
    });
  });

  describe('optimizeGeoJSON', () => {
    it('should truncate coordinate precision', () => {
      const collection = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          id: '1',
          geometry: { type: 'Point', coordinates: [-99.133256, 19.432678] },
          properties: { name: 'Test', extra: null, ignored: undefined },
        }],
      };
      const result = service.optimizeGeoJSON(collection, 4);
      const coords = result.features[0].geometry.coordinates;
      expect(coords[0]).toBe(-99.1333);
      expect(coords[1]).toBe(19.4327);
    });

    it('should remove null and undefined properties', () => {
      const collection = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          id: '1',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', extra: null, ignored: undefined },
        }],
      };
      const result = service.optimizeGeoJSON(collection);
      expect(result.features[0].properties).toEqual({ name: 'Test' });
    });

    it('should handle nested coordinate arrays', () => {
      const collection = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          id: '1',
          geometry: { type: 'Polygon', coordinates: [[[-99.133256, 19.432678], [-99.133, 19.433]]] },
          properties: {},
        }],
      };
      const result = service.optimizeGeoJSON(collection, 3);
      const coords = result.features[0].geometry.coordinates as number[][][];
      expect(coords[0][0][0]).toBe(-99.133);
      expect(coords[0][0][1]).toBe(19.433);
    });
  });
});
