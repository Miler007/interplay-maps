import { Controller, Get, Post, Put, Delete, Param, Body, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NetworkService } from './network.service';
import { SegmentType, SegmentStatus } from '@prisma/client';

@ApiTags('Network')
@Controller('network')
export class NetworkController {
  constructor(private readonly net: NetworkService) {}

  @Get('tree/:assetId')
  @ApiOperation({ summary: 'Obtener árbol jerárquico completo desde un activo' })
  getTree(@Param('assetId') assetId: string) {
    return this.net.getTree(assetId);
  }

  @Get('children/:assetId')
  @ApiOperation({ summary: 'Obtener hijos directos de un activo' })
  getChildren(@Param('assetId') assetId: string) {
    return this.net.getChildren(assetId);
  }

  @Get('path/:fromId/:toId')
  @ApiOperation({ summary: 'Obtener ruta entre dos activos' })
  getPath(@Param('fromId') fromId: string, @Param('toId') toId: string) {
    return this.net.getPath(fromId, toId);
  }

  @Get('route/:assetId')
  @ApiOperation({ summary: 'Obtener ruta upstream completa (asset → mufla → OLT)' })
  getRoute(@Param('assetId') assetId: string) {
    return this.net.getRoute(assetId);
  }

  @Get('segments')
  @ApiOperation({ summary: 'Listar segmentos con filtros' })
  listSegments(
    @Query('type') type?: SegmentType,
    @Query('status') status?: SegmentStatus,
    @Query('municipality') municipality?: string,
  ) {
    return this.net.listSegments({ type, status, municipality });
  }

  @Get('segments/:id')
  @ApiOperation({ summary: 'Obtener segmento por ID' })
  getSegment(@Param('id') id: string) {
    return this.net.getSegment(id);
  }

  @Post('segments')
  @ApiOperation({ summary: 'Crear segmento' })
  @UsePipes(new ValidationPipe({ transform: true }))
  createSegment(@Body() body: any) {
    return this.net.createSegment(body);
  }

  @Put('segments/:id')
  @ApiOperation({ summary: 'Actualizar segmento' })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateSegment(@Param('id') id: string, @Body() body: any) {
    return this.net.updateSegment(id, body);
  }

  @Delete('segments/:id')
  @ApiOperation({ summary: 'Eliminar segmento' })
  deleteSegment(@Param('id') id: string) {
    return this.net.deleteSegment(id);
  }
}
