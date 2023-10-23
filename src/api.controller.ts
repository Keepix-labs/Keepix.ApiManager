import { Body, Controller, Get, Post, Type } from '@nestjs/common';
import { WapService } from './shared/wap.service';
import { BashService } from './shared/bash.service';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { environment } from './environment';
import * as fs from 'fs';
import { ApiService } from './api.service';
import { PropertiesService } from './shared/storage/properties.service';

@ApiTags('App')
@Controller('app')
export class ApiController {

    constructor(
        private wapService: WapService,
        private bashService: BashService,
        private apiService: ApiService,
        private propertiesService: PropertiesService) {
    }

    @Get()
    get() {
        return this.propertiesService.getProperty('keepix-name');
    }

    @Get('hello')
    hello() {
        return 'OK';
    }

    @Get('wifi/list')
    @ApiOperation({ summary: 'Get list of wifi ssid\'s.' })
    async wifiList() {
        return await this.wapService.getWifiList();
    }

    @ApiBody({ type: Object })
    @Post('wifi')
    @ApiOperation({ summary: 'Connect Keepix to a wifi.' })
    async setWifi(@Body() body: { name: string, ssid: string, password: string }) {
        if (body.name != undefined) {
            this.propertiesService.setProperty('keepix-name', body.name);
            this.propertiesService.save();
        }
        return await this.wapService.connectToWifi(body.ssid, body.password);
    }

    @Get('reset')
    async reset() {
        this.wapService.stopHotSpot().then(async () => {
            await this.bashService.execWrapper('reboot'); // reboot
        });
        return true;
    }

    @Get('platform-id')
    async plateformId() {
        return environment.platformId;
    }

    @Get('keepix-information')
    async keepixInformation() {
        return {
            version: environment.appVersion,
            latestVersion: await this.apiService.getLatestVersionOfApiGit()
        }
    }

    @ApiQuery({ name: 'version', type: 'string', required: true })
    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Install a new keepix api version.' })
    @Post('update')
    async update() {
        console.log(process.argv.join(' '), process.env);
        // if (environment.ENV == 'dev') {
        //     const description = 'Updates not allowed in dev.';
        //     console.log(description);
        //     return { success: false, description: description };
        // }
        // let latestVersion = await this.apiService.getLatestVersionOfApiGit();
        // if (environment.appVersion == latestVersion) {
        //     return { success: false, description: 'Already Up-to-date.' };
        // }
        // this.apiService.downloadAndUnTarApi(
        //     environment.apiManagerRepositoryUrl,
        //     latestVersion,
        //     () => {
        //         console.log('Downloaded');
        //     },
        //     () => {
        //         console.log('Untared');
        //     },
        //     (version) => {
        //         console.log('Done');
        //     })
        // .then(async () => {
        //     console.log('Done, restart');
        //     await this.bashService.execWrapper('pm2 restart API');
        // });
        return { success: true, description: 'Installation Running.' };
    }
}
