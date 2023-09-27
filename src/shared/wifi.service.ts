import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { AnsibleService } from "./ansible.service";
import { retry } from '@ajimae/retry';
import { EthernetService } from "./ethernet.service";

@Injectable()
export class WifiService {

    public isEnabled: boolean = false;
    public isConnected: boolean = false;

    private ssid: string = undefined;
    private password: string = undefined;

    constructor(
        private bashService: BashService,
        private ansibleService: AnsibleService,
        private ethernetService: EthernetService) {}

    async run() {
        console.log(`Wifi Service Running`);
        try {

            const stdout = (await this.bashService.execWrapper('nmcli radio wifi')) ?? '';

            // have internet
            if (this.ethernetService.isAlive) {
                this.isConnected = true;
            } else {
                this.isConnected = false;
            }

            // is enabled
            if (stdout.trim() != ''
                && stdout.trim().toLowerCase() == 'enabled') {
                this.isEnabled = true;
            } else if (stdout.trim() != ''
                && stdout.trim().toLowerCase() == 'disabled') {
                this.isEnabled = false;
            } else {
                this.isEnabled = false;
            }
        } catch (e) {
            this.isEnabled = false;
        }
        console.log(`WIFI IsEnabled=${this.isEnabled}, IsConnected=${this.isConnected}`);
        console.log(`Wifi Service Running Finished`);
    }

    async connect(ssid: string, password: string) {
        this.ssid = ssid;
        this.password = password;

        this.ansibleService.run('remove_wap', {}).then(() => {
            console.log('Wap Disabled');
            this.ansibleService.run('wifi-on', {}).then((ansibleResult) => {

                // wait wifi detection of ssid's during 10s
                setTimeout(() => {

                    this.ansibleService.run('wifi-connection', {
                        ssid: this.ssid,
                        password: this.password
                    }).then((ansibleResult) => {
                        console.log(`Wifi Enabled = ${ansibleResult.exitCode == 0}`);
                        if (ansibleResult.exitCode != 0) {
                            
                            // enable correctly the wap
                            this.ansibleService.run('setup_wap', {}).then(() => {
                                console.log('Re setup Wap');
                            });
                        }
                    });

                }, 10000);
            });
        });
        return true;
    }
}