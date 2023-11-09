import * as schedule from 'node-schedule';
import { Injectable } from "@nestjs/common";
import { BashService } from './shared/bash.service';
import { WapService } from './shared/wap.service';
import * as moment from 'moment';
import * as fs from 'fs';

import { AnsibleService } from './shared/ansible.service';
import { FirstLoadService } from './shared/first-load.service';
import { LoggerService } from './shared/logger.service';
import { PluginsService } from './plugins/plugins.service';
import { environment } from './environment';
import path from 'path';
import { BindService } from './shared/bind.service';

@Injectable()
export class ApiService {

    private title: string = "Keepix-Scheduler";

    constructor(
        private loggerService: LoggerService,
        private wapService: WapService,
        private bashService: BashService,
        private bindService: BindService,
        private firstLoadService: FirstLoadService,
        private pluginsService: PluginsService) {
    }

    schedule() {
        this.loggerService.log(`${this.title} Start`);
        this.bindService.addScheduler(schedule.scheduleJob('*/10 * * * *' /* 10min */, () => this.runEach10Minutes()));
        this.bindService.addInterval(setInterval(() => {
            this.runEach10Seconds();
        }, 1000 * 10)); // 10 sec
        this.initialRun(); // first run
    }

    async initialRun() {
        this.loggerService.log(`${this.title} (Initial) Run`);
        await this.runEach10Seconds();
        await this.runEach10Minutes();
    }

    async runEach10Seconds() {
        this.loggerService.log(`${this.title} (10s) Run`);
        await this.firstLoadService.run();

        if (environment.platform == 'linux') {
            // await this.wapService.run();
        }
    }

    async runEach10Minutes() {
        this.loggerService.log(`${this.title} (10min) Run`);
        await this.pluginsService.run();
    }

    public async getLatestVersionOfApi() {
        // const result = await this.bashService.execWrapper('npm view keepix-server-build versions --json');
        const result: any = await this.bashService.execWrapper('npm pack --dry-run keepix-server-build --json');

        if (result != undefined && result != '' && JSON.parse(result).length > 0 && JSON.parse(result)[0].version != undefined) {
            return JSON.parse(result).version;
        }
        return null;
    }
}