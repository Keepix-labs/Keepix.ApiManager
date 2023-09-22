import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { AnsibleService } from "./ansible.service";

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
            const stdout = (await this.bashService.execWrapper('/usr/sbin/iwgetid')) ?? '';
            
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

        await this.ansibleService.run('remove_wap', {});

        const ansibleResult = await this.ansibleService.run('wifi-connection', {
            ssid: this.ssid,
            password: this.password
        });

        if (ansibleResult.exitCode != 0) {
            await this.ansibleService.run('setup_wap', {});
            return false;
        }

        return true;
    }
}