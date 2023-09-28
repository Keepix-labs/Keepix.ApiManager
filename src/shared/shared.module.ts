import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { WapService } from './wap.service';
import { AnsibleService } from './ansible.service';

@Module({
  controllers: [],
  providers: [
    BashService,
    WapService,
    AnsibleService
  ],
  exports: [
    BashService,
    WapService,
    AnsibleService
  ]
})
export class SharedModule {}
