import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller';
// import { getDynamicPluginModules } from './dynamic-plugins';
import { PluginsService } from './plugins.service';
import { SharedModule } from 'src/shared/shared.module';
import { UpnpModule } from 'src/upnp/upnp.module';

@Module({
  imports: [
    SharedModule,
    UpnpModule
  ],
  exports: [PluginsService],
  controllers: [PluginsController],
  providers: [PluginsService],
})
export class PluginsModule {}
