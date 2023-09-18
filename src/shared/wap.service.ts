import { Injectable } from "@nestjs/common";
import * as schedule from 'node-schedule';
import { EthernetService } from "./ethernet.service";
import moment from "moment";
import { BashService } from "./bash.service";
import * as fs from 'fs';

@Injectable()
export class WapService {

    public setup: boolean = false;
    public isAlive: boolean = false;
    private ssid: string = 'keepix';
    private wpa_passphrase: string = 'keepix';
    private running: boolean = false;

    constructor(
        private ethernetService: EthernetService,
        private bashService: BashService) {
        this.schedule();
    }

    schedule() {
        schedule.scheduleJob('*/1 * * * *' /* 1min */, () => {
            this.run();
        });
    }

    loadDynamicWapConfig() {
        const configPath = './.wap-config';
        if (fs.existsSync(configPath)) {
            const data = JSON.parse((fs.readFileSync(configPath)).toString());
            this.setup = data.setup;
            this.isAlive = data.isAlive;
        }
        this.setup = false;
        this.isAlive = false;
    }

    saveDynamicWapConfig() {
        const configPath = './.wap-config';
        fs.writeFileSync(configPath, JSON.stringify({
            setup: this.setup,
            isAlive: this.isAlive
        }));
    }

    async run() {
        if (this.running) { // skip duplicate running.
            return ;
        }
        this.running = true;
        try {
            this.loadDynamicWapConfig();
            
            // when no internet since 1min start wap
            if (!this.isAlive
                && !this.ethernetService.isAlive
                && moment(this.ethernetService.lastTimeAlive).add(1, 'minute').isBefore(moment())    
            ) {
                const resultOfExec = await this.bashService.execWrapper(`ansible-playbook "${__dirname}/../yml/setup_wap.yml" --extra-vars "ssid=${this.ssid} wpa_passphrase=${this.wpa_passphrase}"`);
                console.log('WAP START', resultOfExec);
                this.isAlive = true;
            }

            // when internet alive stop wap.
            if (this.isAlive
                && this.ethernetService.isAlive
            ) {
                const resultOfExec = await this.bashService.execWrapper(`ansible-playbook "${__dirname}/../yml/remove_wap.yml"`);
                console.log('WAP STOP', resultOfExec);
                this.isAlive = false;
            }

            this.saveDynamicWapConfig();
        } catch (e) {
            console.error('WAP ERROR', e);
            this.isAlive = false;
            this.saveDynamicWapConfig();
        }
        this.running = false;
    }
}