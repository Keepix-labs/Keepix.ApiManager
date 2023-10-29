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

@Injectable()
export class ApiService {

    private title: string = "Keepix-Scheduler";

    constructor(
        private loggerService: LoggerService,
        private wapService: WapService,
        private bashService: BashService,
        private firstLoadService: FirstLoadService,
        private pluginsService: PluginsService) {
    }

    schedule() {
        this.loggerService.log(`${this.title} Start`);
        schedule.scheduleJob('*/10 * * * *' /* 10min */, () => this.runEach10Minutes());
        setInterval(() => {
            this.runEach10Seconds();
        }, 1000 * 10); // 10 sec
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
        const result = await this.bashService.execWrapper('npm view keepix-server-build versions --json');

        if (result != undefined && result != '') {
            const versions = JSON.parse(result);
            return versions[versions.length - 1];
        }
        return null;
    }
}