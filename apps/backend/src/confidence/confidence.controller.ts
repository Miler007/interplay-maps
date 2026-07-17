import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfidenceService } from './confidence.service';

@ApiTags('Confidence')
@Controller('confidence')
export class ConfidenceController {
  constructor(private readonly conf: ConfidenceService) {}

  @Get()
  @ApiOperation({ summary: 'Scores de confianza' })
  getScores(@Query('municipalityId') municipalityId?: string, @Query('minScore') minScore?: string) {
    return this.conf.getConfidenceScores({ municipalityId, minScore: minScore ? parseFloat(minScore) : undefined });
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Recalcular scores de confianza (configurable desde BD)' })
  recalculate() {
    return this.conf.recalculateAll();
  }

  @Post(':assetId/calculate')
  @ApiOperation({ summary: 'Calcular confianza para un activo específico' })
  calculate(@Param('assetId') assetId: string) {
    return this.conf.calculateAssetConfidence(assetId);
  }

  @Get('config')
  @ApiOperation({ summary: 'Configuración de pesos de confianza' })
  getConfig() {
    return this.conf.getConfig();
  }

  @Patch('config/:id')
  @ApiOperation({ summary: 'Actualizar peso de factor de confianza' })
  updateConfig(@Param('id') id: string, @Body() data: { weight?: number; isActive?: boolean }) {
    return this.conf.updateConfig(id, data);
  }

  @Get(':assetId/history')
  @ApiOperation({ summary: 'Historial de confianza de un activo' })
  getHistory(@Param('assetId') assetId: string) {
    return this.conf.getAssetConfidenceHistory(assetId);
  }
}
