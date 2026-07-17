import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LayersService } from './layers.service';

@ApiTags('Layers')
@Controller('layers')
export class LayersController {
  constructor(private readonly layers: LayersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las capas' })
  findAll() {
    return this.layers.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener capa por ID' })
  findById(@Param('id') id: string) {
    return this.layers.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear capa' })
  create(@Body() body: { code: string; name: string; description?: string; icon?: string }) {
    return this.layers.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar capa' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; isActive?: boolean; sortOrder?: number }) {
    return this.layers.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar capa' })
  delete(@Param('id') id: string) {
    return this.layers.delete(id);
  }

  @Get(':id/assets')
  @ApiOperation({ summary: 'Activos asociados a la capa' })
  getAssets(@Param('id') id: string) {
    return this.layers.getAssetsByLayer(id);
  }
}
