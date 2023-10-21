import { Controller, Get } from '@nestjs/common';
// import { getListOfPlugins, getListOfPluginsWithInformations } from './dynamic-plugins';
import { LoggerService } from 'src/shared/logger.service';
import { BashService } from 'src/shared/bash.service';
import { PluginService } from './plugin.service';

@Controller('plugin')
export class PluginController {

    public app: any = undefined;

    constructor(
        private loggerService: LoggerService,
        private bashService: BashService,
        private pluginService: PluginService) {
    }

    @Get('test')
    async test() {
        const dto = JSON.stringify({
            key: "exposed-functions"
        });
        let { result } = await this.pluginService.plugins['wasm.example'].exec(dto);

        return result;
    }

    // @Get('list')
    // async list() {

    //     const pluginList = await getListOfPlugins();
    //     let plugins: any[] = pluginList.map(x => {
    //         return {
    //             id: x
    //         };
    //     });

    //     const instanceMap = this.app._instanceLinksHost.instanceLinks;

    //     const keys = [... instanceMap.keys()];
    //     for (let i = 0; i < keys.length; i++) {
    //         const c = keys[i];
    //         const name = c.name ?? '';


    //         const kebabCase = string => string
    //             .replace(/([a-z])([A-Z])/g, "$1-$2")
    //             .replace(/[\s_]+/g, '-')
    //             .toLowerCase();

    //         const plugin = plugins.find(x => `${x.id}-controller` == kebabCase(name));
    //         if (plugin != undefined) {
    //             const instanceController = this.app.get(c);

    //             plugin.title = instanceController.title;
    //             plugin.subTitle = instanceController.subTitle;
    //             plugin.installed = instanceController.installed;
    //             plugin.description = instanceController.description;
    //         }
    //     }
    //     return plugins;
    // }
}