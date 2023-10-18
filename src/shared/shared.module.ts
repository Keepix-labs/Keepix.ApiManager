import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { WapService } from './wap.service';
import { AnsibleService } from './ansible.service';
import { FirstLoadService } from './first-load.service';
import { PropertiesService } from './storage/properties.service';
import { LoggerService } from './logger.service';
import { AnalyticsService } from './storage/analytics.service';

@Module({
  controllers: [],
  providers: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService,
    PropertiesService,
    LoggerService,
    AnalyticsService
  ],
  exports: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService,
    PropertiesService,
    LoggerService,
    AnalyticsService
  ]
})
export class SharedModule {}
