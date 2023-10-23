import * as schedule from 'node-schedule';
import { Injectable } from "@nestjs/common";
import { BashService } from './shared/bash.service';
import { WapService } from './shared/wap.service';
import * as moment from 'moment';
import * as fs from 'fs';

import { AnsibleService } from './shared/ansible.service';
import { FirstLoadService } from './shared/first-load.service';
import { LoggerService } from './shared/logger.service';
import { PluginsService } from './plugins/plugins.service';
import { environment } from './environment';

@Injectable()
export class ApiService {

    private title: string = "Keepix-Scheduler";

    constructor(
        private loggerService: LoggerService,
        private wapService: WapService,
        private firstLoadService: FirstLoadService,
        private pluginsService: PluginsService) {
    }

    schedule() {
        this.loggerService.log(`${this.title} Start`);
        schedule.scheduleJob('*/10 * * * *' /* 10min */, () => this.runEach10Minutes());
        setInterval(() => {
            this.runEach10Seconds();
        }, 1000 * 10); // 10 sec
        this.initialRun(); // first run
    }

    async initialRun() {
        this.loggerService.log(`${this.title} (Initial) Run`);
        await this.runEach10Seconds();
        await this.runEach10Minutes();
    }

    async runEach10Seconds() {
        this.loggerService.log(`${this.title} (10s) Run`);
        await this.firstLoadService.run();

        if (environment.platform == 'linux') {
            await this.wapService.run();
        }
    }

    async runEach10Minutes() {
        this.loggerService.log(`${this.title} (10min) Run`);
        await this.pluginsService.run();
    }

    public async getLatestVersionOfApiGit() {
        const result = await fetch(`${environment.apiManagerRepositoryUrl}/releases/latest`);

        if (result.redirected) {
            const d = result.url.split('/');
            return d[d.length - 1];
        }
        return null;
    }

    public async downloadAndUnTarApi(
        repositoryUrl: string,
        version: string,
        onDownloaded = () => {},
        onUnTar = () => {},
        onInstalled = (version) => {}) {
        return await new Promise(async (resolve) => {
            await this.downloadApi(repositoryUrl, version, async (fileTarGzPath, version, downloadStatus) => {
                console.log(fileTarGzPath, version, downloadStatus);
                onDownloaded();

                // remove scripts directory
                fs.rmSync(`${environment.appDirectory}/release`, {
                    recursive: true,
                    force: true
                });
    
                const decompress = require('decompress');
                const decompressTargz = require('decompress-targz');
                await decompress(fileTarGzPath, `${environment.appDirectory}/release`, {
                    plugins: [
                        decompressTargz()
                    ]
                });
                console.log('Files decompressed');
                onUnTar();
                
                // remove tar.gz file
                fs.rmSync(fileTarGzPath, {
                    recursive: true,
                    force: true
                });
                
                onInstalled(version);
                resolve(true);
            });
        });
    }

    public async downloadApi(repositoryUrl, version, cb = async (filePath, version, downloadStatus) => {}) {
        const Downloader = require("nodejs-file-downloader");
        const downloader = new Downloader({
            url: `${repositoryUrl}/releases/download/${version}/api.${version}.tar.gz`,
            directory: environment.appDirectory, //This folder will be created, if it doesn't exist.   
        });
        
        try {
            const {filePath,downloadStatus} = await downloader.download();
            await cb(filePath, version, downloadStatus);
        } catch (error) {
            console.log("Download failed", error);
            return false;
        }
        return true;
    }
}