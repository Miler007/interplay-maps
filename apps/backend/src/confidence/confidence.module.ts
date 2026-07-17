import { Module } from '@nestjs/common';
import { ConfidenceService } from './confidence.service';
import { ConfidenceController } from './confidence.controller';

@Module({
  controllers: [ConfidenceController],
  providers: [ConfidenceService],
  exports: [ConfidenceService],
})
export class ConfidenceModule {}
