import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BaselineService } from './baseline.service';
import { BaselineController } from './baseline.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BaselineController],
  providers: [BaselineService],
  exports: [BaselineService],
})
export class BaselineModule {}
