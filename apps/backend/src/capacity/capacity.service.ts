import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityStatus } from '@prisma/client';

@Injectable()
export class CapacityService {
  private readonly logger = new Logger(CapacityService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreate(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    let capacity = await this.prisma.capacityInfo.findUnique({
      where: { assetId },
    });

    if (!capacity) {
      capacity = await this.prisma.capacityInfo.create({
        data: { assetId },
      });
    }

    return capacity;
  }

  async update(assetId: string, totalPorts: number, usedPorts: number) {
    await this.getOrCreate(assetId);

    const freePorts = totalPorts - usedPorts;
    const occupancyPct = totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 10000) / 100 : 0;

    let status: CapacityStatus;
    if (occupancyPct >= 100) {
      status = 'SIN_CAPACIDAD';
    } else if (occupancyPct >= 80) {
      status = 'ALTA_OCUPACION';
    } else if (occupancyPct >= 60) {
      status = 'ADVERTENCIA';
    } else {
      status = 'DISPONIBLE';
    }

    const capacity = await this.prisma.capacityInfo.update({
      where: { assetId },
      data: { totalPorts, usedPorts, freePorts, occupancyPct, status },
    });

    await this.prisma.capacityHistory.create({
      data: {
        assetId,
        totalPorts,
        usedPorts,
        freePorts,
        occupancyPct,
      },
    });

    return capacity;
  }

  async getSummary() {
    const capacities = await this.prisma.capacityInfo.findMany({
      include: { asset: { select: { id: true, code: true, name: true } } },
    });

    const totalAssets = capacities.length;
    const totalPorts = capacities.reduce((sum, c) => sum + c.totalPorts, 0);
    const totalUsed = capacities.reduce((sum, c) => sum + c.usedPorts, 0);
    const totalFree = capacities.reduce((sum, c) => sum + c.freePorts, 0);
    const overallPct = totalPorts > 0 ? Math.round((totalUsed / totalPorts) * 10000) / 100 : 0;

    const byStatus = {
      DISPONIBLE: capacities.filter((c) => c.status === 'DISPONIBLE').length,
      ADVERTENCIA: capacities.filter((c) => c.status === 'ADVERTENCIA').length,
      ALTA_OCUPACION: capacities.filter((c) => c.status === 'ALTA_OCUPACION').length,
      SIN_CAPACIDAD: capacities.filter((c) => c.status === 'SIN_CAPACIDAD').length,
    };

    return { totalAssets, totalPorts, totalUsed, totalFree, overallPct, byStatus };
  }

  async getSaturated() {
    const capacities = await this.prisma.capacityInfo.findMany({
      where: {
        status: { in: ['ALTA_OCUPACION', 'SIN_CAPACIDAD'] },
      },
      include: { asset: { select: { id: true, code: true, name: true } } },
      orderBy: { occupancyPct: 'desc' },
    });

    return capacities;
  }

  async getHistory(assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    return this.prisma.capacityHistory.findMany({
      where: { assetId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
