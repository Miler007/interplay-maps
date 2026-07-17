import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PilotService } from './pilot.service';

@ApiTags('Pilot')
@Controller('pilot')
export class PilotController {
  constructor(private readonly pilot: PilotService) {}

  @Get('quality/:municipalityId')
  @ApiOperation({ summary: 'Reporte de calidad de datos del municipio' })
  getQualityReport(@Param('municipalityId') municipalityId: string) {
    return this.pilot.generateQualityReport(municipalityId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Listar municipios con su estado de piloto' })
  getStatus() {
    return this.pilot.listStatus();
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Ejecutar operación masiva' })
  executeBulk(@Body() body: { type: string; municipalityId?: string; assetIds?: string[]; status?: string; userId?: string }) {
    return this.pilot.executeBulk(body);
  }

  @Post('publish/:municipalityId')
  @ApiOperation({ summary: 'Publicar municipio (quality gate >= 95%)' })
  publish(@Param('municipalityId') municipalityId: string) {
    return this.pilot.publish(municipalityId);
  }

  @Post('unpublish/:municipalityId')
  @ApiOperation({ summary: 'Despublicar municipio' })
  unpublish(@Param('municipalityId') municipalityId: string) {
    return this.pilot.unpublish(municipalityId);
  }

  @Get('report/:municipalityId')
  @ApiOperation({ summary: 'Reporte de cierre de piloto' })
  getClosureReport(@Param('municipalityId') municipalityId: string) {
    return this.pilot.generateClosureReport(municipalityId);
  }

  @Post('tour/:municipalityId')
  @ApiOperation({ summary: 'Obtener ruta óptima de activos pendientes por proximidad' })
  getTour(
    @Param('municipalityId') municipalityId: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.pilot.getTour(municipalityId, body.latitude, body.longitude);
  }
}
