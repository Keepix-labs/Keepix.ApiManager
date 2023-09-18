import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { EthernetService } from './ethernet.service';

@Module({
  controllers: [],
  providers: [BashService, EthernetService],
  exports: [BashService, EthernetService]
})
export class SharedModule {}
