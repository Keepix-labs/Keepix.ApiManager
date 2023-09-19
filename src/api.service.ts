import * as schedule from 'node-schedule';
import { Injectable } from "@nestjs/common";
import { BashService } from './shared/bash.service';
import { WapService } from './shared/wap.service';
import { EthernetService } from './shared/ethernet.service';
import * as moment from 'moment';

@Injectable()
export class ApiService {

    private title: string = "[Keepix-Scheduler] -";
    private verbose: boolean = false;

    constructor(
        private bashService: BashService,
        private ethernetService: EthernetService,
        private wapService: WapService) {
    }

    schedule() {
        console.log(`${this.title} Start`);
        schedule.scheduleJob({
            start: moment().add(1, 'minute').toDate(),
            rule: '*/1 * * * *' /* 1min */
        }, () => {
            this.run();
        });
        this.run(); // first run
    }

    async run() {
        console.log(`${this.title} Run`);
        await this.ethernetService.run();
        await this.wapService.run();
    }

    log(... args) { if (this.verbose) console.log(... args); }
}