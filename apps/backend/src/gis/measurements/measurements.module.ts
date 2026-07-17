import { Module } from '@nestjs/common';
import { MeasurementsService } from './measurements.service';

@Module({
  providers: [MeasurementsService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
