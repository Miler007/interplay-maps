import { Module } from '@nestjs/common';
import { SpatialService } from './spatial.service';

@Module({
  providers: [SpatialService],
  exports: [SpatialService],
})
export class SpatialModule {}
