import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { WapService } from './wap.service';
import { AnsibleService } from './ansible.service';
import { FirstLoadService } from './first-load.service';
import { PropertiesService } from './properties.service';
import { LoggerService } from './logger.service';

@Module({
  controllers: [],
  providers: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService,
    PropertiesService,
    LoggerService
  ],
  exports: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService,
    PropertiesService,
    LoggerService
  ]
})
export class SharedModule {}
