import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrityService {
  constructor(private prisma: PrismaService) {}

  async checkAll(municipalityId?: string) {
    const mid = municipalityId || 'e4ff7e38-cd79-452c-a1d3-370d7080adb4';

    const [totalAssets, totalCajas, totalClientes, totalRels] = await Promise.all([
      this.prisma.asset.count({ where: { municipalityId: mid } }),
      this.prisma.asset.count({ where: { municipalityId: mid, assetType: { code: 'CAJA' } } }),
      this.prisma.asset.count({ where: { municipalityId: mid, assetType: { code: 'CLIENTE' } } }),
      this.prisma.assetRelationship.count(),
    ]);

    const sinCoordenadas = await this.prisma.asset.count({
      where: { municipalityId: mid, OR: [{ latitude: null }, { longitude: null }] },
    });

    const cajasSinCoordenadas = await this.prisma.asset.findMany({
      where: { municipalityId: mid, assetType: { code: 'CAJA' }, OR: [{ latitude: null }, { longitude: null }] },
      select: { code: true, name: true },
    });

    const coordsInvalidas = await this.prisma.asset.findMany({
      where: {
        municipalityId: mid, latitude: { not: null }, longitude: { not: null },
        OR: [
          { latitude: { gt: 10 } }, { latitude: { lt: 4 } },
          { longitude: { gt: -74 } }, { longitude: { lt: -76 } },
        ],
      },
      select: { code: true, name: true, latitude: true, longitude: true },
    });

    const capacitySummary = await this.prisma.capacityInfo.findMany({
      where: { asset: { municipalityId: mid } },
      select: { status: true, totalPorts: true, usedPorts: true, freePorts: true },
    });

    const portStats = capacitySummary.reduce((acc: any, c: any) => {
      acc.total += c.totalPorts; acc.used += c.usedPorts; acc.free += c.freePorts;
      acc.byStatus[c.status] = (acc.byStatus[c.status] || 0) + 1;
      return acc;
    }, { total: 0, used: 0, free: 0, byStatus: {} as Record<string, number> });

    const cajasConIds = await this.prisma.asset.findMany({
      where: { municipalityId: mid, assetType: { code: 'CAJA' } },
      select: { id: true, code: true },
    });
    const cajaIds = new Set(cajasConIds.map((c: any) => c.id));

    const activosAislados = cajasConIds.filter((c: any) => {
      return !(cajaIds.has(c.id));
    });

    const rels = await this.prisma.assetRelationship.findMany({
      select: { sourceAssetId: true, targetAssetId: true, relationType: true },
    });

    const cajasConRelaciones = new Set<string>();
    rels.forEach((r: any) => { cajasConRelaciones.add(r.sourceAssetId); cajasConRelaciones.add(r.targetAssetId); });

    const cajasAisladas = cajasConIds.filter((c: any) => !cajasConRelaciones.has(c.id));

    const rotas = rels.filter((r: any) => !cajaIds.has(r.sourceAssetId) || !cajaIds.has(r.targetAssetId));

    const codes = cajasConIds.map((c: any) => c.code);
    const dupCodes = codes.filter((c: string, i: number) => codes.indexOf(c) !== i);

    return {
      municipio: mid,
      totales: { activos: totalAssets, cajas: totalCajas, clientes: totalClientes, relaciones: totalRels },
      coordenadas: {
        cajasSinCoordenadas: cajasSinCoordenadas.map((c: any) => c.code),
        totalSinCoordenadas: sinCoordenadas,
        coordenadasInvalidas: coordsInvalidas.map((c: any) => ({ code: c.code, lat: c.latitude, lng: c.longitude })),
      },
      capacidad: {
        puertosTotales: portStats.total,
        puertosUsados: portStats.used,
        puertosLibres: portStats.free,
        ocupacionPct: portStats.total ? +((portStats.used / portStats.total) * 100).toFixed(1) : 0,
        porEstado: portStats.byStatus,
      },
      topologia: {
        cajasAisladas: cajasAisladas.map((c: any) => c.code),
        totalCajasAisladas: cajasAisladas.length,
        relacionesRotas: rotas.length,
        codigosDuplicados: [...new Set(dupCodes)],
      },
      diagnosticos: {
        clientesSinCaja: 0,
        ciclos: 0,
        fotosFaltantes: totalCajas,
      },
    };
  }
}
