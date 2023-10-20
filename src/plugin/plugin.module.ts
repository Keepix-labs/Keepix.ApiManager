import { Module } from '@nestjs/common';
import { PluginController } from './plugin.controller';
// import { getDynamicPluginModules } from './dynamic-plugins';
import { PluginService } from './plugin.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    SharedModule,
    // Dynamic import of each modules
    // ... getDynamicPluginModules().map(x => x.dynamicModule())
  ],
  exports: [PluginService],
  controllers: [PluginController],
  providers: [PluginService],
})
export class PluginModule {}
