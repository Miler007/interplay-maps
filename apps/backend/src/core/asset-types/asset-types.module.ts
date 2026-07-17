import { Module } from '@nestjs/common';
import { AssetTypesService } from './asset-types.service';
import { AssetTypesController } from './asset-types.controller';

@Module({
  controllers: [AssetTypesController],
  providers: [AssetTypesService],
  exports: [AssetTypesService],
})
export class AssetTypesModule {}
