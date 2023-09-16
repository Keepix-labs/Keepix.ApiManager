import { Module } from '@nestjs/common';
import { PluginController } from './plugin.controller';
import { getDynamicPluginModules } from './dynamic-plugins';

@Module({
  imports: [
    // Dynamic import of each modules
    ... getDynamicPluginModules().map(x => x.dynamicModule())
  ],
  controllers: [PluginController],
  providers: [],
})
export class PluginModule {}
