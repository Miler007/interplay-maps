import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Scores de salud' })
  getScores(@Query('municipalityId') municipalityId?: string, @Query('assetTypeId') assetTypeId?: string) {
    return this.health.getHealthScores({ municipalityId, assetTypeId });
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Recalcular scores de salud (configurable desde BD)' })
  recalculate() {
    return this.health.recalculateAll();
  }

  @Post(':assetId/calculate')
  @ApiOperation({ summary: 'Calcular salud para un activo específico' })
  calculate(@Param('assetId') assetId: string) {
    return this.health.calculateAssetHealth(assetId);
  }

  @Get('config')
  @ApiOperation({ summary: 'Configuración de pesos de salud' })
  getConfig() {
    return this.health.getConfig();
  }

  @Patch('config/:id')
  @ApiOperation({ summary: 'Actualizar peso de indicador de salud' })
  updateConfig(@Param('id') id: string, @Body() data: { weight?: number; isActive?: boolean }) {
    return this.health.updateConfig(id, data);
  }

  @Get(':assetId/history')
  @ApiOperation({ summary: 'Historial de salud de un activo' })
  getHistory(@Param('assetId') assetId: string) {
    return this.health.getAssetHealthHistory(assetId);
  }
}
