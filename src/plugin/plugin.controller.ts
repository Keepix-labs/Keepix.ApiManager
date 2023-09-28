import { Controller, Get } from '@nestjs/common';
import { getListOfPluginsWithInformations } from './dynamic-plugins';

@Controller('plugin')
export class PluginController {

    @Get('list')
    async list() {
        return await getListOfPluginsWithInformations();
    }
}