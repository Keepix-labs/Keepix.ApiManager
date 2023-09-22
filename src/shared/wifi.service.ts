import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { AnsibleService } from "./ansible.service";
import { WapService } from "./wap.service";

@Injectable()
export class WifiService {

    public isConnected: boolean = false;
    public hotspotEnabled: boolean = false;
    public lastTimeAlive: number = 0;

    private ssid: string = undefined;
    private password: string = undefined;

    constructor(
        private bashService: BashService,
        private ansibleService: AnsibleService,
        private wapService: WapService) {}

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

        // stop wap
        await this.wapService.stop();

        const ansibleResult = await this.ansibleService.run('wifi-connection', {
            ssid: this.ssid,
            password: this.password
        });

        if (ansibleResult.exitCode != 0) {
            await this.wapService.start();
            return false;
        }

        return true;
    }
}