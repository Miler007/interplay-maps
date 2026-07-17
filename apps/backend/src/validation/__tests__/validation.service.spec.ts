import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from '../validation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { EVENT_NAMES } from '../../events/events.module';

describe('ValidationService', () => {
  let service: ValidationService;
  let eventsService: EventsService;

  const mockPrisma = {
    validationQueue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    asset: {
      findUnique: jest.fn(),
    },
    importLog: {
      create: jest.fn(),
    },
  };

  const mockEvents = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get<ValidationService>(ValidationService);
    eventsService = module.get<EventsService>(EventsService);
  });

  describe('getQueue', () => {
    it('should return validation queue items ordered by createdAt desc', async () => {
      const queueItems = [
        { id: 'q-1', status: 'PENDIENTE', createdAt: new Date() },
        { id: 'q-2', status: 'APROBADO', createdAt: new Date(Date.now() - 1000) },
      ];
      mockPrisma.validationQueue.findMany.mockResolvedValue(queueItems);

      const result = await service.getQueue();

      expect(result).toEqual(queueItems);
      expect(mockPrisma.validationQueue.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrisma.validationQueue.findMany.mockResolvedValue([]);
      await service.getQueue('PENDIENTE');
      expect(mockPrisma.validationQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDIENTE' },
        }),
      );
    });

    it('should filter by municipalityId when provided', async () => {
      mockPrisma.validationQueue.findMany.mockResolvedValue([]);
      await service.getQueue(undefined, 'mun-1');
      expect(mockPrisma.validationQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { municipalityId: 'mun-1' },
        }),
      );
    });
  });

  describe('approveQueueItem', () => {
    it('should update status to APROBADO and emit event', async () => {
      const queueItem = { id: 'q-1', status: 'PENDIENTE' };
      const updatedItem = { id: 'q-1', status: 'APROBADO', reviewedById: 'reviewer-1', reviewedAt: expect.any(Date) };

      mockPrisma.validationQueue.findUnique.mockResolvedValue(queueItem);
      mockPrisma.validationQueue.update.mockResolvedValue(updatedItem);

      const result = await service.approveQueueItem('q-1', 'reviewer-1');

      expect(result).toEqual(updatedItem);
      expect(mockPrisma.validationQueue.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { status: 'APROBADO', reviewedById: 'reviewer-1', reviewedAt: expect.any(Date) },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith(EVENT_NAMES.VALIDATION.APPROVED, {
        queueId: 'q-1',
        reviewerId: 'reviewer-1',
      });
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockPrisma.validationQueue.findUnique.mockResolvedValue(null);
      await expect(service.approveQueueItem('q-nonexistent', 'reviewer-1')).rejects.toThrow();
    });
  });

  describe('getQueueStats', () => {
    it('should return correct counts for all statuses', async () => {
      mockPrisma.validationQueue.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        pendiente: 10,
        aprobado: 5,
        corregido: 3,
        fusionado: 2,
        rechazado: 1,
        total: 21,
      });
      expect(mockPrisma.validationQueue.count).toHaveBeenCalledTimes(5);
      expect(mockPrisma.validationQueue.count).toHaveBeenCalledWith({ where: { status: 'PENDIENTE' } });
      expect(mockPrisma.validationQueue.count).toHaveBeenCalledWith({ where: { status: 'APROBADO' } });
      expect(mockPrisma.validationQueue.count).toHaveBeenCalledWith({ where: { status: 'CORREGIDO' } });
      expect(mockPrisma.validationQueue.count).toHaveBeenCalledWith({ where: { status: 'FUSIONADO' } });
      expect(mockPrisma.validationQueue.count).toHaveBeenCalledWith({ where: { status: 'RECHAZADO' } });
    });

    it('should return zero counts when queue is empty', async () => {
      mockPrisma.validationQueue.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getQueueStats();
      expect(result).toEqual({
        pendiente: 0,
        aprobado: 0,
        corregido: 0,
        fusionado: 0,
        rechazado: 0,
        total: 0,
      });
    });
  });
});
