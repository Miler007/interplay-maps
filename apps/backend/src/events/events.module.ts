import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [EventsService],
  exports: [EventsService, EventEmitterModule],
})
export class EventsModule {}

export const EVENT_NAMES = {
  ASSET: {
    CREATED: 'asset.created',
    UPDATED: 'asset.updated',
    MOVED: 'asset.moved',
    DELETED: 'asset.deleted',
    RESTORED: 'asset.restored',
  },
  IMPORT: {
    STARTED: 'import.started',
    COMPLETED: 'import.completed',
    FAILED: 'import.failed',
    PIPELINE_STAGE: 'import.pipeline.stage',
  },
  VALIDATION: {
    APPROVED: 'validation.approved',
    CORRECTED: 'validation.corrected',
    REJECTED: 'validation.rejected',
    MERGED: 'validation.merged',
  },
  LAYER: {
    CREATED: 'layer.created',
    UPDATED: 'layer.updated',
    DELETED: 'layer.deleted',
  },
  HEALTH: {
    RECALCULATED: 'health.recalculated',
  },
  CONFIDENCE: {
    RECALCULATED: 'confidence.recalculated',
  },
  SYNC: {
    QUEUED: 'sync.queued',
    COMPLETED: 'sync.completed',
  },
} as const;
