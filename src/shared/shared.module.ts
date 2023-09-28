import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { WapService } from './wap.service';
import { AnsibleService } from './ansible.service';
import { FirstLoadService } from './first-load.service';

@Module({
  controllers: [],
  providers: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService
  ],
  exports: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService
  ]
})
export class SharedModule {}
