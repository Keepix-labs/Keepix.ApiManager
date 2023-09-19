import { Injectable } from "@nestjs/common";
import { EthernetService } from "./ethernet.service";
import * as moment from "moment";
import * as fs from 'fs';
import { AnsibleService } from "./ansible.service";

@Injectable()
export class WapService {

    public setup: boolean = false;
    public isAlive: boolean = false;
    private ssid: string = 'keepix';
    private wpa_passphrase: string = 'keepix';
    private running: boolean = false;

    constructor(
        private ethernetService: EthernetService,
        private ansibleService: AnsibleService) {
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
        console.log(`Wap Service Running`);
        this.running = true;
        try {
            this.loadDynamicWapConfig();
            
            // when no internet since 1min start wap
            if (!this.isAlive
                && !this.ethernetService.isAlive
                && moment(this.ethernetService.lastTimeAlive).add(1, 'minute').isBefore(moment())    
            ) {
                const ansibleResult = await this.ansibleService.run(
                    `setup_wap`,
                    {
                        ssid: this.ssid,
                        wpa_passphrase: this.wpa_passphrase
                    }
                );
                console.log('WAP START', ansibleResult);
                this.isAlive = true;
            }

            // when internet alive stop wap.
            if (this.isAlive
                && this.ethernetService.isAlive
            ) {
                const ansibleResult = await this.ansibleService.run(`remove_wap`);
                console.log('WAP STOP', ansibleResult);
                this.isAlive = false;
            }

            this.saveDynamicWapConfig();
        } catch (e) {
            console.error('WAP ERROR', e);
            this.isAlive = false;
            this.saveDynamicWapConfig();
        }
        this.running = false;
        console.log(`Wap Service Running Finished`);
    }
}