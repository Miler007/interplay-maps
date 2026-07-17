import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificationService {
  private readonly logger = new Logger(CertificationService.name);

  constructor(private prisma: PrismaService) {}

  async validate(
    assetId: string,
    userId: string,
    options?: { gpsLatitude?: number; gpsLongitude?: number; observations?: string },
  ) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    if (asset.certStatus === 'CERTIFICADO') throw new ConflictException('El activo ya está certificado');

    const previousStatus = asset.certStatus;
    const action = previousStatus === 'PENDIENTE' ? 'CONFIRMADO' as const : 'CORREGIDO' as const;

    const [updated] = await this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: {
          certStatus: 'VALIDADO',
          validatedBy: userId,
          validatedAt: new Date(),
        },
      }),
      this.prisma.verificationRecord.create({
        data: {
          assetId,
          action,
          previousStatus,
          newStatus: 'VALIDADO',
          gpsLatitude: options?.gpsLatitude,
          gpsLongitude: options?.gpsLongitude,
          userId,
          observations: options?.observations,
        },
      }),
    ]);

    await this.updateMunicipalityPilotCounts(asset.municipalityId);
    this.logger.log(`Asset ${assetId} validated by ${userId}`);
    return updated;
  }

  async certify(assetId: string, userId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    if (asset.certStatus !== 'VALIDADO') throw new BadRequestException('El activo debe estar VALIDADO antes de certificar');

    const [updated] = await this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: {
          certStatus: 'CERTIFICADO',
          certifiedBy: userId,
          certifiedAt: new Date(),
        },
      }),
      this.prisma.verificationRecord.create({
        data: {
          assetId,
          action: 'CONFIRMADO',
          previousStatus: 'VALIDADO',
          newStatus: 'CERTIFICADO',
          userId,
          observations: 'Certificado',
        },
      }),
    ]);

    await this.updateMunicipalityPilotCounts(asset.municipalityId);
    this.logger.log(`Asset ${assetId} certified by ${userId}`);
    return updated;
  }

  async reject(assetId: string, userId: string, reason: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const [updated] = await this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: {
          certStatus: 'PENDIENTE',
          validatedBy: null,
          validatedAt: null,
          certifiedBy: null,
          certifiedAt: null,
        },
      }),
      this.prisma.verificationRecord.create({
        data: {
          assetId,
          action: 'REQUIERE_REVISION',
          previousStatus: asset.certStatus,
          newStatus: 'PENDIENTE',
          userId,
          observations: reason,
        },
      }),
    ]);

    await this.updateMunicipalityPilotCounts(asset.municipalityId);
    this.logger.log(`Asset ${assetId} rejected by ${userId}: ${reason}`);
    return updated;
  }

  async flag(assetId: string, userId: string, observations?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    const record = await this.prisma.verificationRecord.create({
      data: {
        assetId,
        action: 'REQUIERE_REVISION',
        previousStatus: asset.certStatus,
        newStatus: asset.certStatus,
        userId,
        observations: observations || 'Marcado para revisión',
      },
    });

    this.logger.log(`Asset ${assetId} flagged by ${userId}`);
    return record;
  }

  async getHistory(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    return this.prisma.verificationRecord.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async updateMunicipalityPilotCounts(municipalityId: string) {
    const [totalAssets, validatedAssets, certifiedAssets] = await Promise.all([
      this.prisma.asset.count({ where: { municipalityId } }),
      this.prisma.asset.count({ where: { municipalityId, certStatus: { in: ['VALIDADO', 'CERTIFICADO'] } } }),
      this.prisma.asset.count({ where: { municipalityId, certStatus: 'CERTIFICADO' } }),
    ]);

    await this.prisma.municipalityPilot.upsert({
      where: { municipalityId },
      update: { totalAssets, validatedAssets, certifiedAssets },
      create: {
        municipalityId,
        pilotStatus: 'EN_PREPARACION',
        totalAssets,
        validatedAssets,
        certifiedAssets,
        qualityScore: 0,
      },
    });
  }
}
