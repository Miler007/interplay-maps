import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MunicipalitiesService } from './municipalities.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Municipios')
@Controller('municipalities')
export class MunicipalitiesController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  @Post('departments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear departamento' })
  createDepartment(@Body('name') name: string) {
    return this.municipalitiesService.createDepartment(name);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Listar departamentos con municipios' })
  findAllDepartments() {
    return this.municipalitiesService.findAllDepartments();
  }

  @Delete('departments/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar departamento' })
  deleteDepartment(@Param('id') id: string) {
    return this.municipalitiesService.deleteDepartment(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear municipio' })
  createMunicipality(
    @Body('name') name: string,
    @Body('departmentId') departmentId: string,
    @Body('bounds') bounds?: { north: number; south: number; east: number; west: number },
  ) {
    return this.municipalitiesService.createMunicipality(name, departmentId, bounds);
  }

  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Municipios por departamento' })
  findByDepartment(@Param('departmentId') departmentId: string) {
    return this.municipalitiesService.findMunicipalitiesByDepartment(departmentId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar municipio' })
  deleteMunicipality(@Param('id') id: string) {
    return this.municipalitiesService.deleteMunicipality(id);
  }

  @Post(':municipalityId/projects')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear proyecto en municipio' })
  createProject(
    @Param('municipalityId') municipalityId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.municipalitiesService.createProject(name, municipalityId, description);
  }

  @Get(':municipalityId/projects')
  @ApiOperation({ summary: 'Proyectos por municipio' })
  findProjects(@Param('municipalityId') municipalityId: string) {
    return this.municipalitiesService.findProjectsByMunicipality(municipalityId);
  }
}
