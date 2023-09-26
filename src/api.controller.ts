import { Body, Controller, Get, Post } from '@nestjs/common';
import { WifiService } from './shared/wifi.service';

@Controller('app')
export class ApiController {

    constructor(private wifiService: WifiService) {}

    @Get()
    get() {
        return 'Keepix Api';
    }

    @Post('wifi')
    async setWifi(@Body() body: { ssid: string, password: string }) {
        return await this.wifiService.connect(body.ssid, body.password);
    }
}
