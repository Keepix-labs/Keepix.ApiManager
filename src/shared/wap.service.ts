import { Injectable } from "@nestjs/common";
import * as moment from "moment";
import * as fs from 'fs';
import { AnsibleService } from "./ansible.service";
import * as DHCP from "dhcp";
import * as hostapd from "wireless-tools/hostapd";
import { BashService } from "./bash.service";

@Injectable()
export class WapService {

    private ssid: string = 'keepix';
    private wpa_passphrase: string = 'keepixpassword1234';
    private wapIsActive: boolean = false;
    private running: boolean = false;
    private lastTimeEthernetAlive: number = 0;
    private firstTimeRunning: boolean = true;

    private wifiSSID: string = undefined;
    private wifiPassword: string = undefined;

    private ledWapEnabledInterval = undefined;
    private ledWapTick = 0;

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

            if (this.firstTimeRunning) {
                this.lastTimeEthernetAlive = moment().subtract(30, 'minutes').toDate().getTime();
                this.firstTimeRunning = false;
            }

            let ethernetIsAlive = await this.ethernetIsAlive();

            if (ethernetIsAlive) {
                this.lastTimeEthernetAlive = moment().toDate().getTime();
            }

            if (ethernetIsAlive == false && this.wifiSSID != undefined) {
                if ((await this.connectToWifi(this.wifiSSID, this.wifiPassword))) {
                    ethernetIsAlive = await this.ethernetIsAlive();
                }
            }

            //&& moment(this.ethernetService.lastTimeAlive).add(30, 'seconds').isBefore(moment()
            const wapIsActive = await this.isActive();
            // when no internet since 30min start wap
            if (!ethernetIsAlive && !wapIsActive) {
                await this.startHotSpot();
                this.wapIsActive = await this.isActive();
                console.log('WAP START:', this.wapIsActive);
            }

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

    async isActive() {
        const stdout = (await this.bashService.execWrapper('iw wlan0 info')) ?? '';

        console.log('iw:', stdout);

        if (stdout.toLowerCase().includes('ssid') && stdout.toLowerCase().includes('keepix')) {
            this.wapIsActive = true;
        } else {
            this.wapIsActive = false;
        }
        return this.wapIsActive;
    }

    async startHotSpot() {
        await this.bashService.execWrapper('mkdir /etc/accesspoint');
        await this.bashService.execWrapper(`cp ${__dirname}/../scripts/accesspoint.json /etc/accesspoint/accesspoint.json`);
        await this.bashService.execWrapper(`cp ${__dirname}/../scripts/hostapd.config /etc/accesspoint/hostapd.config`);
        await this.bashService.execWrapper(`cp ${__dirname}/../scripts/interfaces.config /etc/network/interfaces.config`);
        await this.bashService.execWrapper(`ip address add 192.168.1.1/24 broadcast 192.168.1.255 dev wlan0`);
        await this.bashService.execWrapper(`systemctl restart networking`);
        
        // accesspoint start
        await this.bashService.execWrapper(`killall wpa_supplicant`);
        // await this.bashService.execWrapper(`nmcli radio wifi off`);
        //if error await this.bashService.execWrapper(`nmcli nm wifi off`);
        await this.bashService.execWrapper(`rfkill unblock wlan`);
        await this.bashService.execWrapper(`ifconfig wlan0 up 192.168.1.1 netmask 255.255.255.0`);
        await this.bashService.execWrapper(`sysctl -w net.ipv4.ip_forward=1`);
        await this.bashService.execWrapper(`dnsmasq --dhcp-authoritative --interface=wlan0 --dhcp-range=192.168.1.20,192.168.1.100,255.255.255.0,4h`);
        await this.bashService.execWrapper(`hostapd -B ${__dirname}/../scripts/hostapd.config`);
        
        // accesspoint stop
        // await this.bashService.execWrapper(`ifconfig mon.wlan0 down`);
        // await this.bashService.execWrapper(`pkill hostapd`);
        // await this.bashService.execWrapper(`killall dnsmasq`);
        // await this.bashService.execWrapper(`sysctl -w net.ipv4.ip_forward=0`);

        // await this.bashService.execWrapper(`/usr/local/bin/pyaccesspoint --config start`);
        // await this.bashService.execWrapper(`/usr/local/bin/pyaccesspoint --config stop`);
        // await this.bashService.execWrapper(`/usr/local/bin/pyaccesspoint --config start`);
        await this.bashService.execWrapper(`nmcli radio wifi on`);

        const wapIsActive = await this.isActive();

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
                await this.bashService.execWrapper(`sh -c "echo ${this.ledWapTick} > /sys/class/leds/user-led1/brightness"`);
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
        await this.bashService.execWrapper(`ifconfig mon.wlan0 down`);
        await this.bashService.execWrapper(`pkill hostapd`);
        await this.bashService.execWrapper(`killall dnsmasq`);
        await this.bashService.execWrapper(`sysctl -w net.ipv4.ip_forward=0`);

        // await this.bashService.execWrapper(`/usr/local/bin/pyaccesspoint stop`);

        const wapIsActive = await this.isActive();

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
            return stdout.split('\n').filter(x => x != undefined && x != '');
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

        const wapIsActive = await this.isActive();
        if (wapIsActive) {
            this.stopHotSpot().then(() => { console.log('hotspot stopped'); });
        }
        return true;
    }
}