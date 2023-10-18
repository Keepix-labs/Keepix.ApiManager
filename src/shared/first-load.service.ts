import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { PropertiesService } from "./properties.service";
import * as fs from 'fs';
import { LoggerService } from "./logger.service";

/**
 * 
 */
@Injectable()
export class FirstLoadService {

    private firstLoad: boolean = true;

    constructor(
        private loggerService: LoggerService,
        private bashService: BashService
        ) {
    }

    async run() {
        if (!this.firstLoad) return ;
        this.firstLoad = false;

        // if program is on linux
        if (fs.existsSync('/etc/systemd/system')) {

            // Setup the keepix service for restart the app at each boot system
            await this.bashService.execWrapper(`cp ${__dirname}/../scripts/keepix-api.systemd.config /etc/systemd/system/keepix-api.service`);
            await this.bashService.execWrapper(`systemctl enable keepix-api.service`);
            this.loggerService.log('keepix-api.service enabled');

            // enable ssh service
            await this.bashService.execWrapper(`systemctl restart ssh`);
            await this.bashService.execWrapper(`systemctl enable ssh`);
            this.loggerService.log('ssh.service enabled');
        }

        this.loggerService.log('First Load Completed.');
    }
}