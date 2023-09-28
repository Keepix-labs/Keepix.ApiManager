import { Injectable } from "@nestjs/common";
import * as moment from "moment";
import * as fs from 'fs';
import { AnsibleService } from "./ansible.service";
import * as DHCP from "dhcp";
import * as hostapd from "wireless-tools/hostapd";
import { BashService } from "./bash.service";

@Injectable()
export class WapService {

    private running: boolean = false;
    private lastTimeEthernetAlive: number = 0;

    private wifiSSID: string = undefined;
    private wifiPassword: string = undefined;

    private ledWapEnabledInterval = undefined;
    private ledWapTick = 0;

    private firstLoad: boolean = true;

    constructor(
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



            if (this.firstLoad) {
                await this.stopHotSpot(); // force stop hotspot
                if (!(await this.wifiIsActive())) {
                    await this.bashService.execWrapper('nmcli radio wifi on');
                    // wait 2sec
                    new Promise((resolve) => { setTimeout(() => { resolve(true); }, 2000); });
                }
                this.lastTimeEthernetAlive = moment().subtract(30, 'minutes').toDate().getTime();
                this.firstLoad = false;
            }

            let hasWifiActivated = await this.wifiIsActive();
            let hasWifiConnectedOnBox = await this.hasWifiConnectedOnBox();
            let ethernetIsAlive = await this.ethernetIsAlive();
            let hotSpotIsActive = await this.hotSpotIsActive();

            if (ethernetIsAlive) {
                this.lastTimeEthernetAlive = moment().toDate().getTime();
            }

            if (hotSpotIsActive && ethernetIsAlive) {
                await this.stopHotSpot();
                this.running = false;
                return ;
            }

            if (ethernetIsAlive && (hasWifiActivated == false || hasWifiConnectedOnBox == false)) {
                // Connexion Filaire OK
                this.running = false;
                return ;
            }
            if (ethernetIsAlive && hasWifiActivated && hasWifiConnectedOnBox) {
                // Connexion Wifi OK
                this.running = false;
                return ;
            }
            
            // If no internet and connected to wifi waiting 30 min.
            if (!ethernetIsAlive
                && hasWifiActivated
                && hasWifiConnectedOnBox
                && moment(this.lastTimeEthernetAlive).add(29, 'minutes').isAfter(moment())) {
                    console.log('Internet Disconnected Waiting ...');
                    this.running = false;
                return ;
            }

            // no Internet and Wifi SSID and password Already Saved.
            if (ethernetIsAlive == false && this.wifiSSID != undefined) {
                if ((await this.connectToWifi(this.wifiSSID, this.wifiPassword))) {
                    ethernetIsAlive = await this.ethernetIsAlive();
                }
            }
            
            // No HotSpot
            if (!ethernetIsAlive && !hotSpotIsActive) {
                const hostSpotIsRunning = await this.startHotSpot();
                console.log('HotSpot Started:', hostSpotIsRunning);
            }

            // if no wifi radio set on the radio wifi
            const wifiIsActive = await this.wifiIsActive();
            if (ethernetIsAlive == false && wifiIsActive == false) {
                await this.bashService.execWrapper('nmcli radio wifi on');
            }
        } catch (e) {
            console.error('WAP ERROR', e);
        }
        this.running = false;
        console.log(`Wap Service Running Finished`);
    }

    async hasWifiConnectedOnBox() {
        const stdout = (await this.bashService.execWrapper('iw wlan0 info')) ?? '';

        if (stdout.toLowerCase().includes('ssid')
            && !stdout.toLowerCase().includes('keepix')) {
            return true;
        }
        return false;
    }

    async hotSpotIsActive() {
        const stdout = (await this.bashService.execWrapper('iw wlan0 info')) ?? '';

        console.log('iw:', stdout);

        if (stdout.toLowerCase().includes('ssid') && stdout.toLowerCase().includes('keepix')) {
            return true;
        }
        return false;
    }

    async startHotSpot() {
        await this.bashService.execWrapper(`pkill hostapd`);
        await this.bashService.execWrapper(`killall dnsmasq`);
        // await this.bashService.execWrapper(`killall wpa_supplicant`);
        await this.bashService.execWrapper(`rfkill unblock wlan`);
        
        await this.bashService.execWrapper(`cp ${__dirname}/../scripts/interfaces.config /etc/network/interfaces`);
        await this.bashService.execWrapper(`ip address add 192.168.1.1/24 broadcast 192.168.1.255 dev wlan0`);
        // accesspoint start
        await this.bashService.execWrapper(`sysctl -w net.ipv4.ip_forward=1`);
        await this.bashService.execWrapper(`dnsmasq --dhcp-authoritative --interface=wlan0 --dhcp-range=192.168.1.20,192.168.1.100,255.255.255.0,4h`);
        await this.bashService.execWrapper(`hostapd -B ${__dirname}/../scripts/hostapd.config`);
        
        await this.bashService.execWrapper(`systemctl restart networking`);

        const wapIsActive = await this.hotSpotIsActive();

        if (wapIsActive == true) {
            if (this.ledWapEnabledInterval != undefined) {
                clearInterval(this.ledWapEnabledInterval);
                this.ledWapEnabledInterval = undefined;
            }
            this.ledWapEnabledInterval = setInterval(async () => {
                if (this.ledWapTick == 1) {
                    this.ledWapTick = 0;
                } else {
                    this.ledWapTick = 1;
                }
                await this.bashService.execWrapper(`sh -c "echo ${this.ledWapTick} > /sys/class/leds/user-led2/brightness"`);
            }, 500);
        }

        console.log(`HotSpot Enabled=${wapIsActive}`);

        return wapIsActive;
    }

    async stopHotSpot() {
        if (this.ledWapEnabledInterval != undefined) {
            clearInterval(this.ledWapEnabledInterval);
            this.ledWapEnabledInterval = undefined;
        }
        await this.bashService.execWrapper(`cp ${__dirname}/../scripts/interfaces-default.config /etc/network/interfaces.config`);
        await this.bashService.execWrapper(`ip address delete 192.168.1.1/24 dev wlan0`);
        await this.bashService.execWrapper(`systemctl restart networking`);

        // accesspoint stop
        await this.bashService.execWrapper(`pkill hostapd`);
        await this.bashService.execWrapper(`killall dnsmasq`);
        await this.bashService.execWrapper(`sysctl -w net.ipv4.ip_forward=0`);

        const wapIsActive = await this.hotSpotIsActive();

        console.log(`HotSpot Disabled=${!wapIsActive}`);

        if (wapIsActive) {
            return false;
        }
        return true;
    }

    async ethernetIsAlive() {
        try {
            const request = await fetch('https://google.com');
            if (request.status == 200) {
                return true;
            }
        } catch (e) {}
        return false;
    }

    async wifiIsActive() {
        const stdout = (await this.bashService.execWrapper('nmcli radio wifi')) ?? '';

        // is enabled
        if (stdout.trim() != ''
            && stdout.trim().toLowerCase() == 'enabled') {
            return true;
        }
        return false;
    }

    async getWifiList() {
        if ((await this.wifiIsActive()) == false) {
            await this.bashService.execWrapper('nmcli radio wifi on');
            await new Promise((resolve) => { setTimeout(() => { resolve(true) }, 1000); });
        }
        const stdout = (await this.bashService.execWrapper('nmcli device wifi list')) ?? '';

        // is enabled
        if (stdout.trim() != '') {
            return stdout
                .split('\n')
                .filter(x => x != undefined && x != '')
                .slice(1)
                .map(x => x.split(' ').filter(x => x != undefined && x != '')[1])
                .filter(x => x != undefined && x != '');
        }
        return [];
    }

    async connectToWifi(ssid: string, password: string) {
        this.wifiSSID = ssid;
        this.wifiPassword = password;

        if ((await this.wifiIsActive()) == false) {
            await this.bashService.execWrapper('nmcli radio wifi on');
            await new Promise((resolve) => { setTimeout(() => { resolve(true) }, 1000); });
        }

        const result = (await this.bashService.execWrapper(`nmcli dev wifi connect "${ssid}" password "${password}"`)) ?? '';

        if (result.toLowerCase().includes('error')) {
            return false;
        }

        const hotSpotIsActive = await this.hotSpotIsActive();
        if (hotSpotIsActive) {
            this.stopHotSpot().then(() => { console.log('hotspot stopped'); });
        }
        return true;
    }
}