import { Controller, Get, Query } from '@nestjs/common';
import { PlaybackService } from './playback.service';

@Controller('playback')
export class PlaybackController {
  constructor(private readonly playback: PlaybackService) {}

  @Get('state')
  getState(@Query('timestamp') timestamp: string) {
    return this.playback.getStateAt(new Date(timestamp));
  }

  @Get('diff')
  getDiff(@Query('from') from: string, @Query('to') to: string) {
    return this.playback.diff(new Date(from), new Date(to));
  }

  @Get('timeline')
  getTimeline(@Query('assetId') assetId: string) {
    return this.playback.getAssetTimeline(assetId);
  }

  @Get('snapshots')
  getSnapshots(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.playback.getSnapshots(page ? parseInt(page) : 1, limit ? parseInt(limit) : 10);
  }
}
