import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  emit(event: string, payload: Record<string, unknown>): void {
    this.logger.debug(`Evento emitido: ${event}`);
    this.eventEmitter.emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
      eventName: event,
    });
  }

  async emitAsync(event: string, payload: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Evento async emitido: ${event}`);
    await this.eventEmitter.emitAsync(event, {
      ...payload,
      timestamp: new Date().toISOString(),
      eventName: event,
    });
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
}
