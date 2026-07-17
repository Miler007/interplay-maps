import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar activos' })
  findAll(
    @Query('type') type?: string,
    @Query('municipalityId') municipalityId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.assets.findAll({ type, municipalityId, departmentId, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener activo por ID' })
  findById(@Param('id') id: string) {
    return this.assets.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear activo' })
  create(@Body() body: any) {
    return this.assets.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar activo' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.assets.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar activo' })
  delete(@Param('id') id: string) {
    return this.assets.delete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restaurar activo eliminado' })
  restore(@Param('id') id: string) {
    return this.assets.restore(id);
  }
}
