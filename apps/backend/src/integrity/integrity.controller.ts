import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegrityService } from './integrity.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Integridad')
@Controller('integrity')
export class IntegrityController {
  constructor(private readonly svc: IntegrityService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Diagnóstico completo de integridad de red' })
  checkAll(@Query('municipalityId') municipalityId?: string) {
    return this.svc.checkAll(municipalityId);
  }
}
