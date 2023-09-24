import { Injectable } from "@nestjs/common";
import { EthernetService } from "./ethernet.service";
import * as moment from "moment";
import * as fs from 'fs';
import { AnsibleService } from "./ansible.service";
import { WifiService } from "./wifi.service";
import * as DHCP from "dhcp";
import * as hostapd from "wireless-tools/hostapd";

@Injectable()
export class WapService {

    private ssid: string = 'keepix';
    private wpa_passphrase: string = 'keepixpassword1234';
    private running: boolean = false;
    private dhcpServer: any = undefined;

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
                // if (this.dhcpServer == undefined) {
                //     this.createServerDHCP();
                // }
                const ansibleResult0 = await this.start();
                const ansibleResult1 = await this.stop();
                const ansibleResult2 = await this.start();
                console.log('WAP START', ansibleResult0.exitCode == 0, ansibleResult1.exitCode == 0, ansibleResult2.exitCode == 0);
            }
            // when internet alive stop wap.
            if (this.wifiService.hotspotEnabled
                && this.ethernetService.isAlive
                && this.wifiService.isConnected
            ) {
                const ansibleResult = await this.stop();
                console.log('WAP STOP', ansibleResult);
            }
        } catch (e) {
            console.error('WAP ERROR', e);
        }
        this.running = false;
        console.log(`Wap Service Running Finished`);
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