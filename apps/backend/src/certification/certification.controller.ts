import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CertificationService } from './certification.service';

@ApiTags('Certification')
@Controller('certification')
export class CertificationController {
  constructor(private readonly cert: CertificationService) {}

  @Put(':assetId/validate')
  @ApiOperation({ summary: 'Validar un activo (marcar como VALIDADO)' })
  validate(
    @Param('assetId') assetId: string,
    @Body() body: { userId: string; gpsLatitude?: number; gpsLongitude?: number; observations?: string },
  ) {
    return this.cert.validate(assetId, body.userId, {
      gpsLatitude: body.gpsLatitude,
      gpsLongitude: body.gpsLongitude,
      observations: body.observations,
    });
  }

  @Put(':assetId/certify')
  @ApiOperation({ summary: 'Certificar un activo (requiere VALIDADO)' })
  certify(@Param('assetId') assetId: string, @Body() body: { userId: string }) {
    return this.cert.certify(assetId, body.userId);
  }

  @Put(':assetId/reject')
  @ApiOperation({ summary: 'Rechazar un activo (volver a PENDIENTE)' })
  reject(@Param('assetId') assetId: string, @Body() body: { userId: string; reason: string }) {
    return this.cert.reject(assetId, body.userId, body.reason);
  }

  @Put(':assetId/flag')
  @ApiOperation({ summary: 'Marcar activo como REQUIERE_REVISION' })
  flag(@Param('assetId') assetId: string, @Body() body: { userId: string; observations?: string }) {
    return this.cert.flag(assetId, body.userId, body.observations);
  }

  @Get(':assetId/history')
  @ApiOperation({ summary: 'Historial de verificaciones del activo' })
  getHistory(@Param('assetId') assetId: string) {
    return this.cert.getHistory(assetId);
  }
}
