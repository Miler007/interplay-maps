import { Module } from '@nestjs/common';
import { CertificationService } from './certification.service';
import { CertificationController } from './certification.controller';

@Module({
  controllers: [CertificationController],
  providers: [CertificationService],
  exports: [CertificationService],
})
export class CertificationModule {}
