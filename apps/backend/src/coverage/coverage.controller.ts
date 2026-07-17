import { Controller, Get, Post, Put, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoverageService } from './coverage.service';

@ApiTags('Coverage')
@Controller('coverage')
export class CoverageController {
  constructor(private readonly cov: CoverageService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las áreas de cobertura' })
  findAll() {
    return this.cov.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener área de cobertura por ID' })
  findById(@Param('id') id: string) {
    return this.cov.findById(id);
  }

  @Post('calculate/:municipalityId')
  @ApiOperation({ summary: 'Calcular cobertura automática desde infraestructura existente' })
  calculate(@Param('municipalityId') municipalityId: string) {
    return this.cov.calculate(municipalityId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar área de cobertura' })
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('id') id: string, @Body() body: any) {
    return this.cov.update(id, body);
  }
}
