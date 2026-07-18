import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback de Campo')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly svc: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar observación de campo' })
  create(@Body() body: {
    userId?: string; municipalityId: string; assetId?: string;
    category: string; priority: string; description: string;
  }) {
    return this.svc.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar observaciones' })
  list(
    @Query('municipalityId') municipalityId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.svc.list(municipalityId, status, category);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar observación' })
  update(@Param('id') id: string, @Body() body: { status?: string; resolution?: string; priority?: string }) {
    return this.svc.update(id, body);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de feedback' })
  stats(@Query('municipalityId') municipalityId?: string) {
    return this.svc.stats(municipalityId);
  }
}
