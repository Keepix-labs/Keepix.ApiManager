import { Injectable } from "@nestjs/common";
import * as schedule from 'node-schedule';

@Injectable()
export class EthernetService {

    public isAlive: boolean = false;
    public lastTimeAlive: number = 0;

    constructor() {
        this.schedule();
    }

    schedule() {
        schedule.scheduleJob('*/1 * * * *' /* 1min */, () => {
            this.run();
        });
        this.run(); // run before anything.
    }

    async run() {
        try {
            const request = await fetch('https://google.com');
            if (request.status == 200) {
                this.isAlive = true;
                this.lastTimeAlive = (new Date()).getTime();
                console.log('ETHERNET IsAlive=', this.isAlive);
            } else {
                this.isAlive = false;
                console.log('ETHERNET IsAlive=', this.isAlive);
            }
        } catch (e) {
            this.isAlive = false;
            console.log('ETHERNET IsAlive=', this.isAlive);
        }
    }

    async enableWifi() {

    }
}