import { Module } from '@nestjs/common';
import { PluginModule } from './plugin/plugin.module';
import { BashService } from './shared/bash.service';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [PluginModule, SharedModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
