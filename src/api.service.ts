import * as schedule from 'node-schedule';
import { Injectable } from "@nestjs/common";
import { BashService } from './shared/bash.service';
import { WapService } from './shared/wap.service';
import * as moment from 'moment';
import { AnsibleService } from './shared/ansible.service';
import { FirstLoadService } from './shared/first-load.service';
import { LoggerService } from './shared/logger.service';

@Injectable()
export class ApiService {

    private title: string = "Keepix-Scheduler";

    constructor(
        private loggerService: LoggerService,
        private wapService: WapService,
        private firstLoadService: FirstLoadService) {
    }

    schedule() {
        this.loggerService.log(`${this.title} Start`);
        setInterval(() => {
            this.run();
        }, 1000 * 10); // 10 sec
        this.run(); // first run
    }

    async run() {
        this.loggerService.log(`${this.title} Run`);
        await this.firstLoadService.run();
        //await this.wapService.run();
    }
}