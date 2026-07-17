import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los proyectos' })
  findAll() {
    return this.projects.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyecto por ID' })
  findById(@Param('id') id: string) {
    return this.projects.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear proyecto' })
  create(@Body() body: { name: string; description?: string; municipalityId: string }) {
    return this.projects.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proyecto' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; status?: string }) {
    return this.projects.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proyecto' })
  delete(@Param('id') id: string) {
    return this.projects.delete(id);
  }
}
