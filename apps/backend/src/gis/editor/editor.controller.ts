import { Controller, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EditorService } from './editor.service';

@ApiTags('Editor GIS')
@Controller('editor')
export class EditorController {
  constructor(private readonly editor: EditorService) {}

  @Post('features')
  @ApiOperation({ summary: 'Crear feature geométrico' })
  createFeature(@Body() body: { assetId: string; geometry: any; properties?: Record<string, any> }) {
    return this.editor.createFeature(body);
  }

  @Patch('features/:assetId')
  @ApiOperation({ summary: 'Actualizar geometría' })
  updateFeature(@Param('assetId') assetId: string, @Body() body: { geometry: any }) {
    return this.editor.updateFeature(assetId, body.geometry);
  }

  @Delete('features/:assetId')
  @ApiOperation({ summary: 'Eliminar geometría' })
  deleteFeature(@Param('assetId') assetId: string) {
    return this.editor.deleteFeature(assetId);
  }

  @Post('move')
  @ApiOperation({ summary: 'Mover activo a nuevas coordenadas' })
  moveAsset(@Body() body: { assetId: string; latitude: number; longitude: number }) {
    return this.editor.moveAsset(body.assetId, body.latitude, body.longitude);
  }
}
