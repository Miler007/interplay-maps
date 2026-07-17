import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { EVENT_NAMES } from '../../events/events.module';

describe('HealthService', () => {
  let service: HealthService;
  let eventsService: EventsService;

  const mockPrisma = {
    asset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    assetHealth: {
      create: jest.fn(),
    },
    healthScoreConfig: {
      findMany: jest.fn(),
    },
  };

  const mockEvents = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get<HealthService>(HealthService);
    eventsService = module.get<EventsService>(EventsService);
  });

  describe('getHealthScores', () => {
    const mockAssets = [
      {
        id: 'a-1',
        code: 'A-001',
        name: 'Asset 1',
        status: 'ACTIVO',
        healthScores: [{
          overallScore: 85,
          connectivity: 100,
          photos: 100,
          dataQuality: 80,
          location: 100,
          relationships: 50,
          calculatedAt: new Date(),
        }],
      },
      {
        id: 'a-2',
        code: 'A-002',
        name: 'Asset 2',
        status: 'FUERA_DE_SERVICIO',
        healthScores: [],
      },
    ];

    it('should return scores with proper structure', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await service.getHealthScores();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('assetId', 'a-1');
      expect(result[0]).toHaveProperty('score', 85);
      expect(result[0]).toHaveProperty('factors');
      expect(result[0].factors).toHaveProperty('connectivity', 100);
      expect(result[0].factors).toHaveProperty('photos', 100);
      expect(result[0].factors).toHaveProperty('dataQuality', 80);
      expect(result[0].factors).toHaveProperty('location', 100);
      expect(result[0].factors).toHaveProperty('relationships', 50);
      expect(result[0]).toHaveProperty('lastCalculated');
    });

    it('should return null factors and 0 score for assets without health scores', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([mockAssets[1]]);

      const result = await service.getHealthScores();

      expect(result[0].score).toBe(0);
      expect(result[0].factors).toBeNull();
      expect(result[0].lastCalculated).toBeNull();
    });

    it('should filter by municipalityId when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      await service.getHealthScores({ municipalityId: 'mun-1' });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { municipalityId: 'mun-1' },
        }),
      );
    });
  });

  describe('calculateAssetHealth', () => {
    const mockAsset = {
      id: 'a-1',
      code: 'A-001',
      name: 'Asset 1',
      status: 'ACTIVO',
      latitude: 19.43,
      longitude: -99.13,
      observations: 'Some obs',
      municipalityId: 'mun-1',
      projectId: 'proj-1',
      createdById: 'user-1',
      geometry: { id: 'geo-1' },
      photos: [{ id: 'p-1' }],
      relationshipsFrom: [{ id: 'r-1' }],
      relationshipsTo: [],
      healthScores: [],
    };

    it('should compute health based on config weights', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrisma.healthScoreConfig.findMany.mockResolvedValue([
        { indicatorCode: 'connectivity', weight: 30, isActive: true },
        { indicatorCode: 'photos', weight: 20, isActive: true },
        { indicatorCode: 'dataQuality', weight: 20, isActive: true },
        { indicatorCode: 'location', weight: 20, isActive: true },
        { indicatorCode: 'relationships', weight: 10, isActive: true },
      ]);
      mockPrisma.assetHealth.create.mockResolvedValue({});

      const score = await service.calculateAssetHealth('a-1');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(mockPrisma.assetHealth.create).toHaveBeenCalled();
    });

    it('should return 0 when asset does not exist', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      const score = await service.calculateAssetHealth('nonexistent');
      expect(score).toBe(0);
    });

    it('should use default weights when no config is active', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrisma.healthScoreConfig.findMany.mockResolvedValue([]);
      mockPrisma.assetHealth.create.mockResolvedValue({});

      const score = await service.calculateAssetHealth('a-1');
      expect(score).toBeGreaterThan(0);
      expect(mockPrisma.assetHealth.create).toHaveBeenCalled();
    });

    it('should compute connectivity as 0 for RETIRADO assets', async () => {
      const bajaAsset = { ...mockAsset, status: 'RETIRADO' };
      mockPrisma.asset.findUnique.mockResolvedValue(bajaAsset);
      mockPrisma.healthScoreConfig.findMany.mockResolvedValue([]);
      mockPrisma.assetHealth.create.mockResolvedValue({});

      const score = await service.calculateAssetHealth('a-1');
      expect(score).toBeLessThan(85);
    });
  });

  describe('recalculateAll', () => {
    it('should process all active assets and emit event', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        { id: 'a-1' },
        { id: 'a-2' },
        { id: 'a-3' },
      ]);

      const mockAssetFull = {
        id: 'a-1',
        code: 'A-001',
        name: 'Test',
        status: 'ACTIVO',
        latitude: 19.43,
        longitude: -99.13,
        observations: 'obs',
        municipalityId: 'mun-1',
        projectId: 'proj-1',
        createdById: 'user-1',
        geometry: null,
        photos: [],
        relationshipsFrom: [],
        relationshipsTo: [],
        healthScores: [],
      };

      mockPrisma.asset.findUnique.mockResolvedValue(mockAssetFull);
      mockPrisma.healthScoreConfig.findMany.mockResolvedValue([]);
      mockPrisma.assetHealth.create.mockResolvedValue({});

      const result = await service.recalculateAll();

      expect(result.recalculated).toBe(3);
      expect(mockPrisma.asset.findUnique).toHaveBeenCalledTimes(3);
      expect(mockEvents.emit).toHaveBeenCalledWith(EVENT_NAMES.HEALTH.RECALCULATED, { total: 3 });
    });

    it('should return 0 when no active assets exist', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const result = await service.recalculateAll();
      expect(result.recalculated).toBe(0);
      expect(mockEvents.emit).toHaveBeenCalledWith(EVENT_NAMES.HEALTH.RECALCULATED, { total: 0 });
    });
  });
});
