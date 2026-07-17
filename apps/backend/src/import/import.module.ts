import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
