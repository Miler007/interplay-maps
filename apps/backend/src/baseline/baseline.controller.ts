import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaselineService } from './baseline.service';

@ApiTags('Baseline')
@Controller('baseline')
export class BaselineController {
  constructor(private readonly baseline: BaselineService) {}

  @Post(':municipalityId')
  @ApiOperation({ summary: 'Crear nueva línea base del municipio' })
  create(
    @Param('municipalityId') municipalityId: string,
    @Body() body: { version: string; label?: string; userId?: string },
  ) {
    return this.baseline.create(municipalityId, body.version, body.label, body.userId);
  }

  @Get(':municipalityId')
  @ApiOperation({ summary: 'Listar líneas base del municipio' })
  list(@Param('municipalityId') municipalityId: string) {
    return this.baseline.list(municipalityId);
  }

  @Get(':municipalityId/diff')
  @ApiOperation({ summary: 'Comparar dos líneas base' })
  diff(
    @Param('municipalityId') municipalityId: string,
    @Query('from') fromVersion: string,
    @Query('to') toVersion: string,
  ) {
    return this.baseline.diff(municipalityId, fromVersion, toVersion);
  }

  @Get(':municipalityId/:version')
  @ApiOperation({ summary: 'Obtener línea base por versión' })
  get(
    @Param('municipalityId') municipalityId: string,
    @Param('version') version: string,
  ) {
    return this.baseline.get(municipalityId, version);
  }

  @Put(':municipalityId/:version/activate')
  @ApiOperation({ summary: 'Activar línea base' })
  activate(
    @Param('municipalityId') municipalityId: string,
    @Param('version') version: string,
  ) {
    return this.baseline.activate(municipalityId, version);
  }

  @Delete(':municipalityId/:version')
  @ApiOperation({ summary: 'Eliminar línea base' })
  delete(
    @Param('municipalityId') municipalityId: string,
    @Param('version') version: string,
  ) {
    return this.baseline.delete(municipalityId, version);
  }
}
