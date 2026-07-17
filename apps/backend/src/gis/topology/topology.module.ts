import { Module } from '@nestjs/common';
import { TopologyService } from './topology.service';

@Module({
  providers: [TopologyService],
  exports: [TopologyService],
})
export class TopologyModule {}
