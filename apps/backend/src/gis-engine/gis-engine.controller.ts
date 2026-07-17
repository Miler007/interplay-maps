import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GISEngineService } from './gis-engine.service';

@ApiTags('GIS Engine')
@Controller('gis')
export class GISEngineController {
  constructor(private readonly gis: GISEngineService) {}

  @Get('geojson')
  @ApiOperation({ summary: 'Activos en GeoJSON FeatureCollection' })
  getGeoJSON(
    @Query('municipalityId') municipalityId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('type') type?: string,
    @Query('layerId') layerId?: string,
    @Query('status') status?: string,
  ) {
    return this.gis.assetsToGeoJSON({ municipalityId, departmentId, type, layerId, status });
  }

  @Get('nearest')
  @ApiOperation({ summary: 'Nearest Neighbor — activo más cercano' })
  nearest(@Query('lat') lat: string, @Query('lng') lng: string, @Query('type') type?: string, @Query('limit') limit?: string, @Query('maxDistance') maxDistance?: string) {
    return this.gis.nearestNeighbor({
      latitude: parseFloat(lat), longitude: parseFloat(lng), type,
      limit: limit ? parseInt(limit) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
    });
  }

  @Get('bounding-box')
  @ApiOperation({ summary: 'Bounding Box — activos dentro de un área' })
  boundingBox(@Query('north') north: string, @Query('south') south: string, @Query('east') east: string, @Query('west') west: string, @Query('type') type?: string) {
    return this.gis.boundingBox({ north: parseFloat(north), south: parseFloat(south), east: parseFloat(east), west: parseFloat(west), type });
  }

  @Post('distance-matrix')
  @ApiOperation({ summary: 'Distance Matrix — matriz de distancias entre puntos' })
  distanceMatrix(@Body() body: { points: Array<{ lat: number; lng: number }> }) {
    return this.gis.distanceMatrix(body);
  }

  @Get('spatial-index-validation')
  @ApiOperation({ summary: 'Validar índices espaciales y calidad de coordenadas' })
  spatialIndexValidation(@Query('municipalityId') municipalityId?: string) {
    return this.gis.spatialIndexValidation({ municipalityId });
  }

  @Post('optimize-geojson')
  @ApiOperation({ summary: 'Optimizar GeoJSON (reducir precisión decimal, limpiar nulos)' })
  optimizeGeoJSON(@Body() body: { collection: any; precision?: number }) {
    return this.gis.optimizeGeoJSON(body.collection, body.precision);
  }

  @Get('distance')
  @ApiOperation({ summary: 'Distancia entre dos coordenadas' })
  distance(@Query('fromLat') fromLat: string, @Query('fromLng') fromLng: string, @Query('toLat') toLat: string, @Query('toLng') toLng: string) {
    return this.gis.calculateDistance(parseFloat(fromLat), parseFloat(fromLng), parseFloat(toLat), parseFloat(toLng));
  }

  @Get('clusters')
  @ApiOperation({ summary: 'Datos para clustering en mapa' })
  clusters(@Query('zoom') zoom: string, @Query('north') north?: string, @Query('south') south?: string, @Query('east') east?: string, @Query('west') west?: string) {
    const bounds = north && south && east && west ? { north: parseFloat(north), south: parseFloat(south), east: parseFloat(east), west: parseFloat(west) } : undefined;
    return this.gis.getClusterData(parseInt(zoom), bounds);
  }

  @Get('validate-coords')
  @ApiOperation({ summary: 'Validar coordenadas' })
  validateCoords(@Query('lat') lat: string, @Query('lng') lng: string, @Query('municipalityId') municipalityId?: string) {
    return this.gis.validateCoordinate(parseFloat(lat), parseFloat(lng), municipalityId);
  }
}
