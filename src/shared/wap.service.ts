import { Injectable } from "@nestjs/common";
import { EthernetService } from "./ethernet.service";
import * as moment from "moment";
import * as fs from 'fs';
import { AnsibleService } from "./ansible.service";
import { WifiService } from "./wifi.service";

@Injectable()
export class WapService {

    private ssid: string = 'keepix';
    private wpa_passphrase: string = 'keepix';
    private running: boolean = false;

    constructor(
        private ethernetService: EthernetService,
        private wifiService: WifiService,
        private ansibleService: AnsibleService) {
    }

    async run() {
        if (this.running) { // skip duplicate running.
            return ;
        }
        console.log(`Wap Service Running`);
        this.running = true;
        try {
            // when no internet since 1min start wap
            if (
                !this.wifiService.hotspotEnabled
                && !this.ethernetService.isAlive
                && !this.wifiService.isConnected
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
            }
            // when internet alive stop wap.
            if (this.wifiService.hotspotEnabled
                && this.ethernetService.isAlive
                && this.wifiService.isConnected
            ) {
                const ansibleResult = await this.ansibleService.run(`remove_wap`);
                console.log('WAP STOP', ansibleResult);
            }
        } catch (e) {
            console.error('WAP ERROR', e);
        }
        this.running = false;
        console.log(`Wap Service Running Finished`);
    }
}