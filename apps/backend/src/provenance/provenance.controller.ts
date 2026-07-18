import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProvenanceService } from './provenance.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Proveniencia')
@Controller('provenance')
export class ProvenanceController {
  constructor(private readonly svc: ProvenanceService) {}

  @Get('asset/:assetId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Proveniencia de un activo específico' })
  getAssetProvenance(@Param('assetId') assetId: string) {
    return this.svc.getAssetProvenance(assetId);
  }

  @Get('municipio/:municipalityId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Proveniencia general del municipio' })
  getMunicipioProvenance(@Param('municipalityId') municipalityId: string) {
    return this.svc.getMunicipioProvenance(municipalityId);
  }
}
