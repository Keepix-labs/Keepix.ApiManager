import { Body, Controller, Get, Post } from '@nestjs/common';
import { WapService } from './shared/wap.service';

@Controller('app')
export class ApiController {

    constructor(private wapService: WapService) {}

    @Get()
    get() {
        return 'Keepix Api';
    }

    @Get('hello')
    hello() {
        return 'OK';
    }

    @Get('wifi/list')
    async wifiList() {
        return await this.wapService.getWifiList();
    }

    @Post('wifi')
    async setWifi(@Body() body: { ssid: string, password: string }) {
        return await this.wapService.connectToWifi(body.ssid, body.password);
    }
}
