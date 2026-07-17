import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MapService } from './map.service';

@ApiTags('Map')
@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  @Get('data')
  @ApiOperation({ summary: 'Datos para el mapa (viewport)' })
  getMapData(
    @Query('north') north?: string, @Query('south') south?: string,
    @Query('east') east?: string, @Query('west') west?: string,
    @Query('layerIds') layerIds?: string, @Query('type') type?: string,
    @Query('zoom') zoom?: string,
  ) {
    return this.map.getMapData({
      north: north ? parseFloat(north) : undefined,
      south: south ? parseFloat(south) : undefined,
      east: east ? parseFloat(east) : undefined,
      west: west ? parseFloat(west) : undefined,
      layerIds: layerIds?.split(','),
      type,
      zoom: zoom ? parseInt(zoom) : undefined,
    });
  }

  @Get('layers')
  @ApiOperation({ summary: 'Capas activas para el mapa' })
  getLayers() {
    return this.map.getMapLayers();
  }

  @Get('assets/:code')
  @ApiOperation({ summary: 'Obtener activo por código para popup' })
  getAssetByCode(@Param('code') code: string) {
    return this.map.getAssetByCode(code);
  }
}
