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
    private wpa_passphrase: string = 'keepix';
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
                if (this.dhcpServer == undefined) {
                    this.createServerDHCP();
                }
                const options = {
                    channel: 6,
                    driver: 'rtl871xdrv',
                    hw_mode: 'g',
                    interface: 'wlan0',
                    ssid: 'RaspberryPi',
                    wpa: 2,
                    wpa_passphrase: 'keepixkeepix1234'
                };
                   
                hostapd.enable(options, (err) => {
                    console.log('HOSTAPD CREATED', err);
                    // the access point was created
                });
                // const ansibleResult = await this.ansibleService.run(
                //     `setup_wap`,
                //     {
                //         ssid: this.ssid,
                //         wpa_passphrase: this.wpa_passphrase
                //     }
                // );
                console.log('WAP START');
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

    createServerDHCP() {
        this.dhcpServer = DHCP.createServer({
            // System settings
            range: [
              "192.168.3.10", "192.168.3.99"
            ],
            forceOptions: ['hostname'], // Options that need to be sent, even if they were not requested
            randomIP: true, // Get random new IP from pool instead of keeping one ip
            static: {
              "11:22:33:44:55:66": "192.168.3.100"
            },
          
            // Option settings (there are MUCH more)
            netmask: '255.255.255.0',
            router: [
              '192.168.0.1'
            ],
            dns: ["8.8.8.8", "8.8.4.4"],
            hostname: "kacknup",
            broadcast: '192.168.0.255',
            server: '192.168.0.1', // This is us
            bootFile: function (req, res) {
              // res.ip - the actual ip allocated for the client
              if (req.clientId === 'foo bar') {
                return 'x86linux.0';
              } else {
                return 'x64linux.0';
              }
            }
        });
        this.dhcpServer.listen();
    }
}