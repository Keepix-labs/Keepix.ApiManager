import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from 'src/shared/storage/properties.service';
import { getLocalIP, getLocalIpId } from 'src/shared/utils/get-local-ip';
import { subdomains } from 'src/shared/utils/subdomains';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {

    constructor(private propertiesService: PropertiesService) {}

    @Get('')
    @ApiOperation({ summary: 'Get a settings' })
    async get() {
        return {
            'wifi': this.propertiesService.getProperty('wifi', { ssid: undefined, password: undefined }),
            'rpcs': this.propertiesService.getProperty('rpcs', {}),
            'leds': this.propertiesService.getProperty('leds', true)
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

    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Set a rpc overrided.' })
    @Post('set-rpc')
    async setRpc(@Body() body) {
        let rpcs = this.propertiesService.getProperty('rpcs', {});

        rpcs[body.type] = {
            url: body.url,
            name: body.name,
            chainId: body.chainId
        };
        this.propertiesService.save();
        return true;
    }
}
