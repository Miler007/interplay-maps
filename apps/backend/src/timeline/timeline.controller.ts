import { Controller, Get, Param, Query } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller('timeline')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get(':assetId')
  getTimeline(@Param('assetId') assetId: string) {
    return this.timeline.getTimeline(assetId);
  }

  @Get(':assetId/at')
  getStateAtDate(@Param('assetId') assetId: string, @Query('date') date: string) {
    return this.timeline.getStateAtDate(assetId, new Date(date));
  }

  @Get('changes')
  getChanges(@Query('from') from: string, @Query('to') to: string) {
    return this.timeline.getChanges(new Date(from), new Date(to));
  }
}
