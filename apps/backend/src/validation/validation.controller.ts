import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ValidationService } from './validation.service';

@ApiTags('Validation')
@Controller('validation')
export class ValidationController {
  constructor(private readonly val: ValidationService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Activos pendientes de validación (asset-based)' })
  getPending(@Query('municipalityId') municipalityId?: string) {
    return this.val.getPendingValidations(municipalityId);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Centro de Validación — cola completa' })
  getQueue(@Query('status') status?: string, @Query('municipalityId') municipalityId?: string) {
    return this.val.getQueue(status, municipalityId);
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Estadísticas de la cola de validación' })
  getQueueStats() {
    return this.val.getQueueStats();
  }

  @Post('queue/:id/approve')
  @ApiOperation({ summary: 'Aprobar item de la cola' })
  approveQueue(@Param('id') id: string, @Body('reviewerId') reviewerId: string) {
    return this.val.approveQueueItem(id, reviewerId);
  }

  @Post('queue/:id/edit')
  @ApiOperation({ summary: 'Editar item de la cola' })
  editQueue(@Param('id') id: string, @Body() body: { name?: string; latitude?: number; longitude?: number; notes?: string; reviewerId: string }) {
    return this.val.editQueueItem(id, body, body.reviewerId);
  }

  @Post('queue/:id/merge/:targetAssetId')
  @ApiOperation({ summary: 'Fusionar item de cola con activo existente' })
  mergeQueue(@Param('id') id: string, @Param('targetAssetId') targetAssetId: string, @Body('reviewerId') reviewerId: string) {
    return this.val.mergeQueueItem(id, targetAssetId, reviewerId);
  }

  @Post('queue/:id/discard')
  @ApiOperation({ summary: 'Descartar item de la cola' })
  discardQueue(@Param('id') id: string, @Body() body: { reviewerId: string; reason?: string }) {
    return this.val.discardQueueItem(id, body.reviewerId, body.reason);
  }

  @Post('queue/:id/promote')
  @ApiOperation({ summary: 'Promover item de cola a activo real' })
  promoteToAsset(@Param('id') id: string, @Body('reviewerId') reviewerId: string) {
    return this.val.promoteToAsset(id, reviewerId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprobar activo' })
  approve(@Param('id') id: string, @Body('reviewerId') reviewerId: string) {
    return this.val.approve(id, reviewerId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rechazar activo' })
  reject(@Param('id') id: string, @Body() body: { reviewerId: string; reason: string }) {
    return this.val.reject(id, body.reviewerId, body.reason);
  }

  @Post(':id/correct')
  @ApiOperation({ summary: 'Solicitar corrección' })
  requestCorrection(@Param('id') id: string, @Body() body: { reviewerId: string; notes: string }) {
    return this.val.requestCorrection(id, body.reviewerId, body.notes);
  }

  @Post(':id/merge/:targetId')
  @ApiOperation({ summary: 'Fusionar activos duplicados' })
  merge(@Param('id') id: string, @Param('targetId') targetId: string, @Body('reviewerId') reviewerId: string) {
    return this.val.merge(id, targetId, reviewerId);
  }
}
