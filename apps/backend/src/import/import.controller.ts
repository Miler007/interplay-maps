import {
  Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile, Query, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ImportService } from './import.service';

@ApiTags('Import')
@Controller('import')
export class ImportController {
  constructor(private readonly imp: ImportService) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Simular importación — ejecuta pipeline completo sin escribir en BD' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async simulate(
    @UploadedFile() file: Express.Multer.File,
    @Body('municipalityId') municipalityId?: string,
    @Body('projectId') projectId?: string,
    @Body('userId') userId?: string,
  ) {
    return this.imp.runFullPipeline(file, { municipalityId, projectId, userId });
  }

  @Post('execute')
  @ApiOperation({ summary: 'Ejecutar importación confirmada después de simulación' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async execute(
    @UploadedFile() file: Express.Multer.File,
    @Body('simulation') simulation: string,
    @Body('municipalityId') municipalityId?: string,
    @Body('projectId') projectId?: string,
    @Body('userId') userId?: string,
  ) {
    const simObj = typeof simulation === 'string' ? JSON.parse(simulation) : simulation;
    return this.imp.runFullPipeline(file, {
      municipalityId, projectId, userId,
      confirmed: true, simulation: simObj,
    });
  }

  @Post('upload')
  @ApiOperation({ summary: 'Importación rápida (simula + ejecuta en un paso)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async quickImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('municipalityId') municipalityId?: string,
    @Body('projectId') projectId?: string,
    @Body('userId') userId?: string,
  ) {
    const simulation = await this.imp.runFullPipeline(file, { municipalityId, projectId, userId });
    return this.imp.runFullPipeline(file, {
      municipalityId, projectId, userId,
      confirmed: true, simulation,
    });
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Importar desde archivo WhatsApp (legacy)' })
  async importWhatsApp(@Body() body: { filePath: string; municipalityId?: string }) {
    throw new BadRequestException('Use POST /import/simulate o /import/upload en su lugar');
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de importaciones' })
  getHistory() {
    return this.imp.getImportHistory();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de importación por ID' })
  getById(@Param('id') id: string) {
    return this.imp.getImportById(id);
  }
}
