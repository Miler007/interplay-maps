import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dash: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen del dashboard' })
  getSummary() {
    return this.dash.getSummary();
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Activos agrupados por tipo' })
  getByType() {
    return this.dash.getAssetsByType();
  }

  @Get('by-status')
  @ApiOperation({ summary: 'Activos agrupados por estado' })
  getByStatus() {
    return this.dash.getAssetsByStatus();
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Actividad reciente' })
  getRecentActivity(@Query('limit') limit?: string) {
    return this.dash.getRecentActivity(limit ? parseInt(limit) : 20);
  }
}
