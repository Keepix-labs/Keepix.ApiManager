import { Module } from '@nestjs/common';
import { BashService } from './bash.service';
import { WapService } from './wap.service';
import { AnsibleService } from './ansible.service';
import { FirstLoadService } from './first-load.service';
import { PropertiesService } from './storage/properties.service';
import { LoggerService } from './logger.service';
import { AnalyticsService } from './storage/analytics.service';
import { BindService } from './bind.service';
import { WalletStorageService } from './storage/wallet-storage.service';

@Module({
  controllers: [],
  providers: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService,
    PropertiesService,
    LoggerService,
    AnalyticsService,
    BindService,
    WalletStorageService
  ],
  exports: [
    BashService,
    WapService,
    AnsibleService,
    FirstLoadService,
    PropertiesService,
    LoggerService,
    AnalyticsService,
    BindService,
    WalletStorageService
  ]
})
export class SharedModule {}
