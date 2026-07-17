import { Module } from '@nestjs/common';
import { GeometryService } from './geometry.service';

@Module({
  providers: [GeometryService],
  exports: [GeometryService],
})
export class GeometryModule {}
