import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProvenanceService {
  constructor(private prisma: PrismaService) {}

  async getAssetProvenance(assetId: string) {
    const [asset, versions, logs, importRecords] = await Promise.all([
      this.prisma.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true, code: true, name: true, createdAt: true, updatedAt: true,
          createdById: true, observations: true, currentVersion: true,
          validatedBy: true, validatedAt: true, certifiedBy: true, certifiedAt: true,
        },
      }),
      this.prisma.assetVersion.findMany({
        where: { assetId },
        orderBy: { version: 'desc' },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        where: { entityId: assetId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.importRecord.findMany({
        where: { municipalityId: assetId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      asset: {
        code: asset?.code,
        name: asset?.name,
        created: asset?.createdAt,
        updated: asset?.updatedAt,
        version: asset?.currentVersion,
        validatedAt: asset?.validatedAt,
        certifiedAt: asset?.certifiedAt,
      },
      source: importRecords.map((i) => ({
        source: i.source,
        filename: i.filename,
        batch: i.batchCode,
        importedAt: i.createdAt,
        totalRecords: i.totalRecords,
        validRecords: i.validRecords,
      })),
      versions: versions.map((v) => ({
        version: v.version,
        changedAt: v.createdAt,
        changeType: v.changeType,
        changes: v.changes,
      })),
      audit: logs.map((l) => ({
        action: l.action,
        user: l.userId,
        details: l.details,
        timestamp: l.createdAt,
      })),
    };
  }

  async getMunicipioProvenance(municipalityId: string) {
    const imports = await this.prisma.importRecord.findMany({
      where: { municipalityId },
      orderBy: { createdAt: 'desc' },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 3 } },
    });

    const totalAssets = await this.prisma.asset.count({ where: { municipalityId } });
    const importedCount = imports.reduce((sum, i) => sum + i.validRecords, 0);
    const manualCount = totalAssets - importedCount;

    return {
      municipio: municipalityId,
      totalActivos: totalAssets,
      importaciones: imports.map((i) => ({
        id: i.id,
        fuente: i.source,
        archivo: i.filename,
        lote: i.batchCode,
        fecha: i.createdAt,
        total: i.totalRecords,
        validos: i.validRecords,
        duplicados: i.duplicateRecords,
        pendientes: i.pendingReview,
        precision: i.parserAccuracy,
        logs: i.logs,
      })),
      resumen: {
        importados: importedCount,
        editadosManual: manualCount > 0 ? manualCount : 0,
      },
    };
  }
}
