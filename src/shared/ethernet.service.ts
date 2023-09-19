import { Injectable } from "@nestjs/common";

@Injectable()
export class EthernetService {

    public isAlive: boolean = false;
    public lastTimeAlive: number = 0;

    constructor() {}

    async run() {
        console.log(`Ethernet Service Running`);
        try {
            const request = await fetch('https://google.com');
            if (request.status == 200) {
                this.isAlive = true;
                this.lastTimeAlive = (new Date()).getTime();
                console.log('ETHERNET IsAlive=', this.isAlive);
            } else {
                this.isAlive = false;
                console.log('ETHERNET IsAlive=', this.isAlive);
            }
        } catch (e) {
            this.isAlive = false;
            console.log('ETHERNET IsAlive=', this.isAlive);
        }
        console.log(`Ethernet Service Running Finished`);
    }

    async enableWifi() {

    }
}