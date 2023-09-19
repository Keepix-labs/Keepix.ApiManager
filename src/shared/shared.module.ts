import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { EthernetService } from './ethernet.service';
import { WapService } from './wap.service';

@Module({
  controllers: [],
  providers: [BashService, EthernetService, WapService],
  exports: [BashService, EthernetService, WapService]
})
export class SharedModule {}
