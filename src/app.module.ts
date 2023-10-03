import { Module } from '@nestjs/common';
import { PluginModule } from './plugin/plugin.module';
import { BashService } from './shared/bash.service';
import { SharedModule } from './shared/shared.module';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [PluginModule, MonitoringModule, SharedModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class AppModule {}
