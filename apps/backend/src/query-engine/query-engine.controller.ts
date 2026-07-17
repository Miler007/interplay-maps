import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QueryEngineService } from './query-engine.service';

@ApiTags('Query Engine')
@Controller('query-engine')
export class QueryEngineController {
  constructor(private readonly queryEngine: QueryEngineService) {}

  @Get('nearest-available/:lat/:lng')
  @ApiOperation({ summary: 'Encontrar activo más cercano con capacidad disponible' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'minFreePorts', required: false, type: Number })
  findNearestAvailable(
    @Param('lat') lat: string,
    @Param('lng') lng: string,
    @Query('type') type?: string,
    @Query('minFreePorts') minFreePorts?: string,
  ) {
    return this.queryEngine.findNearestAvailable(
      parseFloat(lat),
      parseFloat(lng),
      type,
      minFreePorts ? parseInt(minFreePorts, 10) : undefined,
    );
  }

  @Get('orphans')
  @ApiOperation({ summary: 'Encontrar activos sin relaciones ni segmentos' })
  findOrphans() {
    return this.queryEngine.findOrphans();
  }

  @Get('cycles')
  @ApiOperation({ summary: 'Detectar ciclos en relaciones entre activos' })
  detectCycles() {
    return this.queryEngine.detectCycles();
  }

  @Get('routes/:assetId')
  @ApiOperation({ summary: 'Calcular rutas posibles desde un activo hacia OLT' })
  async calculateRoutes(@Param('assetId') assetId: string) {
    const result = await this.queryEngine.calculateRoutes(assetId);
    if (!result || result.length === 0) {
      throw new NotFoundException('No se encontraron rutas para el activo');
    }
    return result;
  }

  @Get('expansion/:assetId')
  @ApiOperation({ summary: 'Sugerir puntos de expansión cercanos' })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  async suggestExpansion(
    @Param('assetId') assetId: string,
    @Query('radius') radius?: string,
  ) {
    const result = await this.queryEngine.suggestExpansion(
      assetId,
      radius ? parseInt(radius, 10) : 500,
    );
    return result;
  }
}
