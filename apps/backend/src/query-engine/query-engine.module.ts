import { Module } from '@nestjs/common';
import { QueryEngineService } from './query-engine.service';
import { QueryEngineController } from './query-engine.controller';

@Module({
  controllers: [QueryEngineController],
  providers: [QueryEngineService],
  exports: [QueryEngineService],
})
export class QueryEngineModule {}
