import * as schedule from 'node-schedule';
import { Injectable } from "@nestjs/common";
import { BashService } from './shared/bash.service';
import { WapService } from './shared/wap.service';
import * as moment from 'moment';
import { AnsibleService } from './shared/ansible.service';
import { FirstLoadService } from './shared/first-load.service';

@Injectable()
export class ApiService {

    private title: string = "[Keepix-Scheduler] -";
    private verbose: boolean = false;

    constructor(
        private wapService: WapService,
        private firstLoadService: FirstLoadService) {
    }

    schedule() {
        console.log(`${this.title} Start`);
        setInterval(() => {
            this.run();
        }, 1000 * 10); // 10 sec
        // schedule.scheduleJob({
        //     start: moment().add(1, 'minute').toDate(),
        //     rule: '*/1 * * * *' /* 1min */
        // }, () => {
        //     this.run();
        // });
        this.run(); // first run
    }

    async run() {
        console.log(`${this.title} Run`);

        await this.firstLoadService.run();
        await this.wapService.run();
    }

    log(... args) { if (this.verbose) console.log(... args); }
}