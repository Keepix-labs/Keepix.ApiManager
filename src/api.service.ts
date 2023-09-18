import * as schedule from 'node-schedule';
import { Injectable } from "@nestjs/common";
import { BashService } from './shared/bash.service';

@Injectable()
export class ApiService {

    private title: string = "[Keepix-Scheduler] -";
    private verbose: boolean = false;

    constructor(private bashService: BashService) {
        this.schedule();
    }

    schedule() {
        console.log(`${this.title} Start`);
        schedule.scheduleJob('*/1 * * * *' /* 1min */, () => {
            this.run();
        });
    }

    async run() {
        console.log(`${this.title} Run`);
    }

    log(... args) { if (this.verbose) console.log(... args); }
}