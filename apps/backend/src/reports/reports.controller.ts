import { Controller, Get, Post, Param, Query, Body, Res, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('generate')
  generate(@Body() body: { type: string; municipalityId?: string; departmentId?: string; format: 'pdf' | 'excel'; filters?: any }) {
    return this.reports.generate(body);
  }

  @Get('download/:id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const record = this.reports.getRecord(id);
    if (!record) throw new NotFoundException('Reporte no encontrado');
    const filePath = path.resolve(record.filePath);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Archivo no encontrado en disco');
    const ext = record.format === 'pdf' ? '.html' : '.csv';
    const contentType = record.format === 'pdf' ? 'text/html' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${record.type}-${record.id}${ext}"`);
    res.sendFile(filePath);
  }

  @Get('history')
  history() {
    return this.reports.getHistory();
  }
}
