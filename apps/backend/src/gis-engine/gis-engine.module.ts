import { Module } from '@nestjs/common';
import { GISEngineService } from './gis-engine.service';
import { GISEngineController } from './gis-engine.controller';

@Module({
  controllers: [GISEngineController],
  providers: [GISEngineService],
  exports: [GISEngineService],
})
export class GISEngineModule {}
