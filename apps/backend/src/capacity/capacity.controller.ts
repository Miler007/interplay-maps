import { Controller, Get, Put, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CapacityService } from './capacity.service';

@ApiTags('Capacity')
@Controller('capacity')
export class CapacityController {
  constructor(private readonly cap: CapacityService) {}

  @Get('stats/summary')
  @ApiOperation({ summary: 'Estadísticas agregadas de capacidad' })
  getSummary() {
    return this.cap.getSummary();
  }

  @Get('stats/saturated')
  @ApiOperation({ summary: 'Activos con alta ocupación o sin capacidad' })
  getSaturated() {
    return this.cap.getSaturated();
  }

  @Get('history/:assetId')
  @ApiOperation({ summary: 'Historial de capacidad de un activo' })
  getHistory(@Param('assetId') assetId: string) {
    return this.cap.getHistory(assetId);
  }

  @Get(':assetId')
  @ApiOperation({ summary: 'Obtener capacidad de un activo' })
  getCapacity(@Param('assetId') assetId: string) {
    return this.cap.getOrCreate(assetId);
  }

  @Put(':assetId')
  @ApiOperation({ summary: 'Actualizar capacidad de un activo' })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateCapacity(
    @Param('assetId') assetId: string,
    @Body() body: { totalPorts: number; usedPorts: number },
  ) {
    return this.cap.update(assetId, body.totalPorts, body.usedPorts);
  }
}
