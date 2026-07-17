import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AssetTypesService } from './asset-types.service';

@ApiTags('Asset Types')
@Controller('asset-types')
export class AssetTypesController {
  constructor(private readonly at: AssetTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de activo' })
  findAll() {
    return this.at.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de activo' })
  findById(@Param('id') id: string) {
    return this.at.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear tipo de activo' })
  create(@Body() body: { code: string; name: string; prefix: string; icon?: string; geometryType?: string }) {
    return this.at.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tipo de activo' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; icon?: string; color?: string; isActive?: boolean }) {
    return this.at.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tipo de activo' })
  delete(@Param('id') id: string) {
    return this.at.delete(id);
  }

  @Get(':id/attributes')
  @ApiOperation({ summary: 'Obtener definiciones de atributos' })
  getAttributes(@Param('id') id: string) {
    return this.at.getAttributeDefinitions(id);
  }

  @Post(':id/attributes')
  @ApiOperation({ summary: 'Crear/actualizar definición de atributo' })
  upsertAttribute(@Param('id') id: string, @Body() body: { id?: string; code: string; name: string; fieldType?: string; isRequired?: boolean; options?: any; sortOrder?: number; unit?: string }) {
    return this.at.upsertAttributeDefinition(id, body);
  }

  @Delete('attributes/:attrId')
  @ApiOperation({ summary: 'Eliminar definición de atributo' })
  deleteAttribute(@Param('attrId') attrId: string) {
    return this.at.deleteAttributeDefinition(attrId);
  }
}
