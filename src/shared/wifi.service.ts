import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { AnsibleService } from "./ansible.service";
import { retry } from '@ajimae/retry';

@Injectable()
export class WifiService {

    public isConnected: boolean = false;
    public hotspotEnabled: boolean = false;
    public lastTimeAlive: number = 0;

    private ssid: string = undefined;
    private password: string = undefined;

    constructor(
        private bashService: BashService,
        private ansibleService: AnsibleService) {}

    async run() {
        console.log(`Wifi Service Running`);
        try {

            const exec = () => {
                // This will be any async or sync action that needs to be retried.
                return this.bashService.execWrapper('/usr/sbin/iwgetid')
            }

            const predicate = (response, retryCount) => {
                console.log('retry', response, retryCount) // goes from 0 to maxRetries 
              
                // once this condition is met the retry exits
                return (response != undefined)
            }

            const stdout = (await retry(exec, predicate, { maxRetries: 5, backoff: true })) ?? '';
            
            console.log('WIFI iwgetid: ', stdout);

            if (stdout.trim() != ''
                && stdout.trim().match(/ESSID\:\"[\w\W]+\"/gm) != undefined) {
                // const wifiSSID = stdout.trim();
                this.isConnected = true;
                this.hotspotEnabled = false;
                this.lastTimeAlive = (new Date()).getTime();
            } else if (stdout.trim() != ''
                && stdout.trim().match(/ESSID\:\"\"/gm) != undefined) {
                // Wap mode
                this.hotspotEnabled = true;
                this.isConnected = false;
            } else {
                this.isConnected = false;
                this.hotspotEnabled = false;
            }
        } catch (e) {
            this.isConnected = false;
            this.hotspotEnabled = false;
        }
        console.log(`WIFI IsConnected=${this.isConnected}, HotSpotEnabled=${this.hotspotEnabled}`);
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