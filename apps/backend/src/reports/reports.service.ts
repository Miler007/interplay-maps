import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export interface ReportRecord {
  id: string;
  type: string;
  format: 'pdf' | 'excel';
  createdAt: Date;
  filePath: string;
  filters?: any;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private reportsDir: string;
  private records: ReportRecord[] = [];

  constructor(private prisma: PrismaService) {
    this.reportsDir = path.resolve(process.cwd(), 'temp-reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  getRecord(id: string): ReportRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  getHistory(): ReportRecord[] {
    return [...this.records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async generate(request: { type: string; municipalityId?: string; departmentId?: string; format: 'pdf' | 'excel'; filters?: any }): Promise<{ id: string; message: string; downloadUrl: string; format: string }> {
    this.logger.log(`Generating report: type=${request.type}, format=${request.format}`);

    let data: any[];
    let headers: string[];
    let rows: string[][];

    switch (request.type) {
      case 'infrastructure':
        ({ headers, rows } = await this.buildInfrastructureReport(request));
        break;
      case 'capacity':
        ({ headers, rows } = await this.buildCapacityReport(request));
        break;
      case 'topology':
        ({ headers, rows } = await this.buildTopologyReport(request));
        break;
      case 'inventory':
        ({ headers, rows } = await this.buildInventoryReport(request));
        break;
      default:
        throw new BadRequestException(`Tipo de reporte no válido: ${request.type}`);
    }

    const id = randomUUID();
    const record: ReportRecord = { id, type: request.type, format: request.format, createdAt: new Date(), filePath: '', filters: request.filters };

    if (request.format === 'pdf') {
      record.filePath = path.join(this.reportsDir, `${id}.html`);
      const html = this.buildHtmlTable(request.type, headers, rows);
      fs.writeFileSync(record.filePath, html, 'utf-8');
    } else {
      record.filePath = path.join(this.reportsDir, `${id}.csv`);
      const csv = this.buildCsv(headers, rows);
      fs.writeFileSync(record.filePath, csv, 'utf-8');
    }

    this.records.push(record);
    this.logger.log(`Report generated: ${id}`);

    return {
      id,
      message: 'Reporte generado exitosamente',
      downloadUrl: `/reports/download/${id}`,
      format: request.format,
    };
  }

  private async buildInfrastructureReport(request: { municipalityId?: string; departmentId?: string }): Promise<{ headers: string[]; rows: string[][] }> {
    const where: any = {};
    if (request.municipalityId) where.municipalityId = request.municipalityId;
    if (request.departmentId) where.departmentId = request.departmentId;

    const assets = await this.prisma.asset.findMany({
      where,
      include: { assetType: true, municipality: true },
    });

    const grouped = new Map<string, Map<string, number>>();
    for (const a of assets) {
      const typeName = a.assetType?.name || 'Sin tipo';
      const munName = a.municipality?.name || 'Sin municipio';
      if (!grouped.has(typeName)) grouped.set(typeName, new Map());
      const munMap = grouped.get(typeName)!;
      munMap.set(munName, (munMap.get(munName) || 0) + 1);
    }

    const headers = ['Tipo de Activo', 'Municipio', 'Cantidad'];
    const rows: string[][] = [];
    let total = 0;
    for (const [typeName, munMap] of grouped) {
      for (const [munName, count] of munMap) {
        rows.push([typeName, munName, String(count)]);
        total += count;
      }
    }
    rows.push(['TOTAL', '', String(total)]);
    return { headers, rows };
  }

  private async buildCapacityReport(request: { municipalityId?: string; departmentId?: string }): Promise<{ headers: string[]; rows: string[][] }> {
    const where: any = {};
    if (request.municipalityId) where.municipalityId = request.municipalityId;
    if (request.departmentId) where.departmentId = request.departmentId;

    const assets = await this.prisma.asset.findMany({
      where,
      include: { capacity: true, assetType: true, municipality: true },
    });

    const withCapacity = assets.filter((a) => a.capacity).sort((a, b) => (b.capacity!.occupancyPct || 0) - (a.capacity!.occupancyPct || 0));

    const headers = ['Código', 'Nombre', 'Tipo', 'Municipio', 'Puertos Totales', 'Puertos Usados', 'Puertos Libres', 'Ocupación %'];
    const rows: string[][] = withCapacity.map((a) => [
      a.code,
      a.name,
      a.assetType?.name || '',
      a.municipality?.name || '',
      String(a.capacity!.totalPorts),
      String(a.capacity!.usedPorts),
      String(a.capacity!.freePorts),
      `${a.capacity!.occupancyPct.toFixed(1)}%`,
    ]);
    return { headers, rows };
  }

  private async buildTopologyReport(request: { municipalityId?: string; departmentId?: string }): Promise<{ headers: string[]; rows: string[][] }> {
    const where: any = {};
    if (request.municipalityId) where.municipalityId = request.municipalityId;

    const [relationships, segments] = await Promise.all([
      this.prisma.assetRelationship.findMany({
        include: { sourceAsset: true, targetAsset: true },
      }),
      this.prisma.networkSegment.findMany({
        where,
        include: { sourceAsset: true, targetAsset: true },
      }),
    ]);

    const headers = ['Tipo', 'Origen', 'Destino', 'Tipo Relación/Segmento', 'Longitud (m)', 'Estado'];
    const rows: string[][] = [];

    for (const r of relationships) {
      rows.push(['Relación', r.sourceAsset?.name || r.sourceAssetId, r.targetAsset?.name || r.targetAssetId, r.relationType, '', '']);
    }
    for (const s of segments) {
      rows.push(['Segmento', s.sourceAsset?.name || s.sourceAssetId, s.targetAsset?.name || s.targetAssetId, s.segmentType, s.lengthMeters ? String(s.lengthMeters) : '', s.status]);
    }

    rows.push(['TOTAL', '', '', '', '', `${relationships.length + segments.length} elementos`]);
    return { headers, rows };
  }

  private async buildInventoryReport(request: { municipalityId?: string; departmentId?: string }): Promise<{ headers: string[]; rows: string[][] }> {
    const where: any = {};
    if (request.municipalityId) where.municipalityId = request.municipalityId;
    if (request.departmentId) where.departmentId = request.departmentId;

    const assets = await this.prisma.asset.findMany({
      where,
      include: { assetType: true, municipality: true, department: true, geometry: true },
    });

    const headers = ['Código', 'Nombre', 'Tipo', 'Departamento', 'Municipio', 'Estado', 'Latitud', 'Longitud', 'Observaciones', 'Creado'];
    const rows: string[][] = assets.map((a) => [
      a.code,
      a.name,
      a.assetType?.name || '',
      a.department?.name || '',
      a.municipality?.name || '',
      a.status,
      a.latitude?.toString() || '',
      a.longitude?.toString() || '',
      a.observations || '',
      a.createdAt.toISOString().split('T')[0],
    ]);
    rows.push(['TOTAL', `${assets.length} activos`, '', '', '', '', '', '', '', '']);
    return { headers, rows };
  }

  private buildHtmlTable(title: string, headers: string[], rows: string[][]): string {
    const headerRow = headers.map((h) => `<th>${this.esc(h)}</th>`).join('');
    const dataRows = rows.map((r) => `<tr>${r.map((c) => `<td>${this.esc(c)}</td>`).join('')}</tr>`).join('\n');
    return `<html><head><meta charset="utf-8"><title>Reporte: ${this.esc(title)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  h1 { color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th { background: #1a3a5c; color: white; padding: 10px 8px; text-align: left; }
  td { border: 1px solid #ddd; padding: 8px; }
  tr:nth-child(even) { background: #f5f7fa; }
  tr:last-child td { font-weight: bold; background: #e8ecf1; }
  .footer { margin-top: 20px; font-size: 12px; color: #666; }
</style></head><body>
<h1>Reporte: ${this.esc(title)}</h1>
<table><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table>
<div class="footer">Generado el ${new Date().toLocaleString('es-CO')} - Interplay Maps</div>
</body></html>`;
  }

  private buildCsv(headers: string[], rows: string[][]): string {
    const escCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headerLine = headers.map(escCsv).join(',');
    const dataLines = rows.map((r) => r.map(escCsv).join(','));
    return [headerLine, ...dataLines].join('\r\n');
  }

  private esc(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
