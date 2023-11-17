import { Body, Controller, Get, Post, Res, Type, StreamableFile, Query } from '@nestjs/common';
import { WapService } from './shared/wap.service';
import { BashService } from './shared/bash.service';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { environment } from './environment';
import * as fs from 'fs';
import { ApiService } from './api.service';
import { PropertiesService } from './shared/storage/properties.service';
import path from 'path';
import { spawn } from 'child_process';
import { BindService } from './shared/bind.service';

@ApiTags('App')
@Controller('')
export class ApiController {

    constructor(
        private wapService: WapService,
        private bashService: BashService,
        private apiService: ApiService,
        private bindService: BindService,
        private propertiesService: PropertiesService) {
    }

    @Get('/favicon.png')
    favicon(): StreamableFile {
        const file = fs.createReadStream(path.join(path.join(__dirname, '..'), 'public/favicon.png'));
        return new StreamableFile(file);
    }

    @Get('/app')
    @ApiOperation({ summary: 'Get keepix-name' })
    get() {
        return this.propertiesService.getProperty('keepix-name');
    }

    @Get('/app/wifi/list')
    @ApiOperation({ summary: 'Get list of wifi ssid\'s.' })
    async wifiList() {
        return await this.wapService.getWifiList();
    }

    @Get('/app/platform-id')
    @ApiOperation({ summary: 'Get plateform id' })
    async plateformId() {
        return environment.platformId;
    }

    @ApiBody({ type: Object })
    @Post('/app/wifi')
    @ApiOperation({ summary: 'Connect Keepix to a wifi.' })
    async setWifi(@Body() body: { name: string, ssid: string, password: string }) {
        if (body.name != undefined) {
            this.propertiesService.setProperty('keepix-name', body.name);
            this.propertiesService.save();
        }
        return await this.wapService.connectToWifi(body.ssid, body.password);
    }

    @Get('/app/keepix-information')
    async keepixInformation() {
        const result = {
            version: environment.appVersion,
            latestVersion: await this.apiService.getLatestVersionOfApi()
        };
        return result;
    }

    @Get('/app/restart')
    async restart() {
        setTimeout(async () => {
            await this.bindService.clean();
            console.log('READY RESTARTING');
            require("child_process")
                .spawn(
                  process.argv.shift(),
                  process.argv,
                  {
                    cwd: process.cwd(),
                    detached: false,
                    stdio: "inherit"
                  }
                );
        }, 1000);

        return true;
    }

    @ApiQuery({ name: 'version', type: 'string', required: true })
    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Install a new keepix api version.' })
    @Post('/app/update')
    async update(@Query('version') version: string = "latest") {
        if (environment.ENV == 'dev') {
            const description = 'Updates not allowed in dev.';
            console.log(description);
            return { success: false, description: description };
        }

        fs.writeFileSync(path.join(environment.appDirectory[environment.platform], 'update'), version);

        if (environment.platform == 'linux') {
            this.bashService.execWrapper(`pm2 restart Keepix`).then(() => {
                console.log('Update launched.');
            });
        } else {
            await this.restart();
        }

        return { success: true, description: 'Installation Running.' };
    }
}
