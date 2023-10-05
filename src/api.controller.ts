import { Body, Controller, Get, Post } from '@nestjs/common';
import { WapService } from './shared/wap.service';
import { BashService } from './shared/bash.service';

@Controller('app')
export class ApiController {

    private name: string = 'Keepix';

    constructor(
        private wapService: WapService,
        private bashService: BashService) {
    }

    @Get()
    get() {
        return this.name;
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
    async setWifi(@Body() body: { name: string, ssid: string, password: string }) {
        this.name = body.name;
        return await this.wapService.connectToWifi(body.ssid, body.password);
    }

    @Get('reset')
    async reset() {
        this.wapService.stopHotSpot().then(async () => {
            await this.bashService.execWrapper('reboot'); // reboot
        });
        return true;
    }
}
