import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { EthernetService } from './ethernet.service';
import { WapService } from './wap.service';
import { AnsibleService } from './ansible.service';

@Module({
  controllers: [],
  providers: [BashService, EthernetService, WapService, AnsibleService],
  exports: [BashService, EthernetService, WapService, AnsibleService]
})
export class SharedModule {}
