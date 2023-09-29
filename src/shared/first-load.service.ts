import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";

@Injectable()
export class FirstLoadService {

    private firstLoad: boolean = true;

    constructor(private bashService: BashService) {
    }

    async run() {
        if (this.firstLoad) {
            this.firstLoad = false;
            await this.bashService.execWrapper(`cp ${__dirname}/../scripts/keepix-api.systemd.config /etc/systemd/system/keepix-api.service`);
            await this.bashService.execWrapper(`systemctl enable keepix-api.service`);
            console.log('keepix-api.service enabled');
            await this.bashService.execWrapper(`systemctl enable ssh`);
            console.log('ssh.service enabled');
        }
    }
}