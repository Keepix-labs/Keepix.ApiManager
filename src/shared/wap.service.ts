import { Injectable } from "@nestjs/common";
import { EthernetService } from "./ethernet.service";
import * as moment from "moment";
import * as fs from 'fs';
import { AnsibleService } from "./ansible.service";
import { WifiService } from "./wifi.service";
import * as DHCP from "dhcp";
import * as hostapd from "wireless-tools/hostapd";
import { BashService } from "./bash.service";

@Injectable()
export class WapService {

    private ssid: string = 'keepix';
    private wpa_passphrase: string = 'keepixpassword1234';
    private wapIsActive: boolean = false;
    private running: boolean = false;

    constructor(
        private ethernetService: EthernetService,
        private wifiService: WifiService,
        private ansibleService: AnsibleService,
        private bashService: BashService) {
    }

    async run() {
        if (this.running) { // skip duplicate running.
            return ;
        }
        console.log(`Wap Service Running`);
        this.running = true;
        try {
            //&& moment(this.ethernetService.lastTimeAlive).add(30, 'seconds').isBefore(moment()
            const wapIsActive = await this.isActive(); 
            // when no internet since 1min start wap
            if (!this.ethernetService.isAlive && !wapIsActive) {
                const ansibleResult0 = await this.start();
                const ansibleResult1 = await this.stop();
                const ansibleResult2 = await this.start();
                console.log('WAP START', ansibleResult0.exitCode == 0, ansibleResult1.exitCode == 0, ansibleResult2.exitCode == 0);
                this.wapIsActive = ansibleResult0.exitCode == 0 && ansibleResult1.exitCode == 0 && ansibleResult2.exitCode == 0;
            }
        } catch (e) {
            console.error('WAP ERROR', e);
        }
        this.running = false;
        console.log(`Wap Service Running Finished`);
    }

    async isActive() {
        const stdout = (await this.bashService.execWrapper('iw wlan0 info')) ?? '';

        console.log('iw:', stdout);

        if (stdout.includes('ssid')) {
            this.wapIsActive = true;
        } else {
            this.wapIsActive = false;
        }
        return this.wapIsActive;
    }

    async start() {
        return await this.ansibleService.run(
            `setup_wap`,
            {
                ssid: this.ssid,
                wpa_passphrase: this.wpa_passphrase
            }
        );
    }

    async stop() {
        return await this.ansibleService.run(`remove_wap`);
    }
}