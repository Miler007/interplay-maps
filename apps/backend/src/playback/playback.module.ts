import { Module } from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { PlaybackController } from './playback.controller';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [TimelineModule],
  controllers: [PlaybackController],
  providers: [PlaybackService],
  exports: [PlaybackService],
})
export class PlaybackModule {}
