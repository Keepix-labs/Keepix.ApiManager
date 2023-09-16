import { Controller, Get } from '@nestjs/common';
import { getListOfPlugins } from './dynamic-plugins';

@Controller('plugin')
export class PluginController {

    @Get('list')
    list() {
        return getListOfPlugins();
    }
}