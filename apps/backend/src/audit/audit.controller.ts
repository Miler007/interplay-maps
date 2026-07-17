import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de auditoría' })
  findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.audit.findAll({
      userId, entityType, entityId, action,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Auditoría por entidad' })
  getByEntity(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.audit.getByEntity(entityType, entityId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear registro de auditoría' })
  log(@Body() body: { userId: string; action: string; entityType: string; entityId: string; details?: any; ip?: string }) {
    return this.audit.log(body);
  }
}
