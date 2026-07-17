import { Test, TestingModule } from '@nestjs/testing';
import { ConfidenceService } from '../confidence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { EVENT_NAMES } from '../../events/events.module';

describe('ConfidenceService', () => {
  let service: ConfidenceService;

  const mockPrisma = {
    asset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    assetConfidence: {
      create: jest.fn(),
    },
    confidenceScoreConfig: {
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
        ConfidenceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get<ConfidenceService>(ConfidenceService);
  });

  describe('getConfidenceScores', () => {
    const mockAssets = [
      {
        id: 'a-1',
        code: 'A-001',
        name: 'Asset 1',
        confidenceScores: [{
          score: 85,
          validCoords: true,
          nameIdentified: true,
          noDuplicates: true,
          hasPhoto: true,
          reviewedByAdmin: false,
          calculatedAt: new Date(),
        }],
      },
      {
        id: 'a-2',
        code: 'A-002',
        name: 'Asset 2',
        confidenceScores: [{
          score: 45,
          validCoords: true,
          nameIdentified: true,
          noDuplicates: false,
          hasPhoto: false,
          reviewedByAdmin: false,
          calculatedAt: new Date(),
        }],
      },
      {
        id: 'a-3',
        code: 'A-003',
        name: 'Asset 3',
        confidenceScores: [],
      },
    ];

    it('should return all confidence scores when no minScore is provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await service.getConfidenceScores();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('assetId', 'a-1');
      expect(result[0]).toHaveProperty('score', 85);
      expect(result[0]).toHaveProperty('factors');
      expect(result[0].factors).toHaveProperty('validCoords', true);
      expect(result[0].factors).toHaveProperty('nameIdentified', true);
      expect(result[0].factors).toHaveProperty('noDuplicates', true);
      expect(result[0].factors).toHaveProperty('hasPhoto', true);
      expect(result[0].factors).toHaveProperty('reviewedByAdmin', false);
    });

    it('should filter by minScore', async () => {
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await service.getConfidenceScores({ minScore: 50 });

      expect(result).toHaveLength(1);
      expect(result[0].assetId).toBe('a-1');
      expect(result[0].score).toBeGreaterThanOrEqual(50);
    });

    it('should return null factors and 0 score for assets without confidence scores', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([mockAssets[2]]);

      const result = await service.getConfidenceScores();

      expect(result[0].score).toBe(0);
      expect(result[0].factors).toBeNull();
    });

    it('should filter by municipalityId when provided', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      await service.getConfidenceScores({ municipalityId: 'mun-1' });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { municipalityId: 'mun-1' },
        }),
      );
    });
  });

  describe('calculateAssetConfidence', () => {
    const mockAsset = {
      id: 'a-1',
      code: 'A-001',
      name: 'Asset 1',
      status: 'ACTIVO',
      latitude: 19.43,
      longitude: -99.13,
      municipalityId: 'mun-1',
      observations: null,
      geometry: { id: 'geo-1' },
      photos: [{ id: 'p-1' }],
      relationshipsFrom: [{ id: 'r-1' }],
      relationshipsTo: [],
      confidenceScores: [{ reviewedByAdmin: true, score: 85 }],
    };

    it('should compute score from config weights', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrisma.confidenceScoreConfig.findMany.mockResolvedValue([
        { factorCode: 'VALID_COORDS', weight: 25, isActive: true },
        { factorCode: 'NAME_IDENTIFIED', weight: 20, isActive: true },
        { factorCode: 'NO_DUPLICATES', weight: 20, isActive: true },
        { factorCode: 'HAS_PHOTO', weight: 10, isActive: true },
        { factorCode: 'REVIEWED_BY_ADMIN', weight: 15, isActive: true },
        { factorCode: 'CONSISTENCY', weight: 5, isActive: true },
        { factorCode: 'HAS_RELATIONSHIPS', weight: 5, isActive: true },
      ]);
      mockPrisma.assetConfidence.create.mockResolvedValue({});

      const score = await service.calculateAssetConfidence('a-1');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(mockPrisma.assetConfidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: 'a-1',
            score,
          }),
        }),
      );
    });

    it('should return 0 when asset does not exist', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      const score = await service.calculateAssetConfidence('nonexistent');
      expect(score).toBe(0);
    });

    it('should use default weights when no config is active', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrisma.confidenceScoreConfig.findMany.mockResolvedValue([]);
      mockPrisma.assetConfidence.create.mockResolvedValue({});

      const score = await service.calculateAssetConfidence('a-1');
      expect(score).toBeGreaterThan(0);
    });

    it('should compute lower score for incomplete assets', async () => {
      const incompleteAsset = {
        id: 'a-2',
        code: null,
        name: null,
        status: 'PENDIENTE_INSTALACION',
        latitude: null,
        longitude: null,
        municipalityId: null,
        observations: 'duplicado',
        geometry: null,
        photos: [],
        relationshipsFrom: [],
        relationshipsTo: [],
        confidenceScores: [],
      };
      mockPrisma.asset.findUnique.mockResolvedValue(incompleteAsset);
      mockPrisma.confidenceScoreConfig.findMany.mockResolvedValue([]);
      mockPrisma.assetConfidence.create.mockResolvedValue({});

      const score = await service.calculateAssetConfidence('a-2');
      expect(score).toBe(0);
    });
  });

  describe('recalculateAll', () => {
    it('should process all active assets and emit event', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        { id: 'a-1' },
        { id: 'a-2' },
      ]);

      const mockAssetFull = {
        id: 'a-1',
        code: 'A-001',
        name: 'Test',
        status: 'ACTIVO',
        latitude: 19.43,
        longitude: -99.13,
        municipalityId: 'mun-1',
        observations: null,
        geometry: null,
        photos: [],
        relationshipsFrom: [],
        relationshipsTo: [],
        confidenceScores: [],
      };

      mockPrisma.asset.findUnique.mockResolvedValue(mockAssetFull);
      mockPrisma.confidenceScoreConfig.findMany.mockResolvedValue([]);
      mockPrisma.assetConfidence.create.mockResolvedValue({});

      const result = await service.recalculateAll();

      expect(result.recalculated).toBe(2);
      expect(mockPrisma.asset.findUnique).toHaveBeenCalledTimes(2);
      expect(mockEvents.emit).toHaveBeenCalledWith(EVENT_NAMES.CONFIDENCE.RECALCULATED, { total: 2 });
    });

    it('should return 0 when no active assets exist', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const result = await service.recalculateAll();
      expect(result.recalculated).toBe(0);
      expect(mockEvents.emit).toHaveBeenCalledWith(EVENT_NAMES.CONFIDENCE.RECALCULATED, { total: 0 });
    });
  });
});
