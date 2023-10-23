import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from 'src/shared/storage/properties.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {

    constructor(private propertiesService: PropertiesService) {}

    @Get('')
    @ApiOperation({ summary: 'Get a settings' })
    async get() {
        console.log('KSKSKSKS');
        return {
            'keepix-name': this.propertiesService.getProperty('keepix-name')
        };
    }

    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Set a settings' })
    @Post('')
    async set(@Body() body: any) {
        let keys = Object.keys(body);
        for (let key of keys) {
            this.propertiesService.setProperty(key, body[key]);
        }
        this.propertiesService.save();
        return true;
    }
}
