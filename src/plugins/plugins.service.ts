import { Injectable } from "@nestjs/common";
import { environment } from "src/environment";
import { LoggerService } from "src/shared/logger.service";
import { PropertiesService } from "src/shared/storage/properties.service";
import * as fs from 'fs';
import { BashService } from "src/shared/bash.service";
import { exec } from 'child_process';

@Injectable()
export class PluginsService {

    public plugins: any = {};

    private title: string = "Keepix-Plugins-Service";

    constructor(
        private loggerService: LoggerService,
        private propertiesService: PropertiesService,
        private bashService: BashService) {
    }

    async run() {
        this.loggerService.log(`${this.title} Run`);
        await this.detectPluginsAndLatestVersions();
        await this.loadInstalledPlugins();
    }

    public async loadInstalledPlugins() {
        const internalPlugins = this.propertiesService.getProperty('plugins', []);

        for (let plugin of internalPlugins) {
            if (this.plugins[plugin.id] == undefined && plugin.installed == true) {
                this.plugins[plugin.id] = {
                    ... plugin,
                    exec: async (argObject) => {
                        return await new Promise((resolve) => {
                            // double stringify for escapes double quotes
                            exec(`${environment.appDirectory[environment.platform]}/plugins/${plugin.id}/dist/${environment.platformId}/${plugin.id} ${JSON.stringify(JSON.stringify(argObject))}`, (error, stdout, stderr) => {
                                const result = JSON.parse(stdout);
    
                                resolve({
                                    result: JSON.parse(result.jsonResult),
                                    stdOut: result.stdOut
                                });
                            });
                        });
                    }
                };
            }
        }
    }

    public async downloadAndUnTarPlugin(
        plugin: any,
        onDownloaded = () => {},
        onUnTar = () => {},
        onInstalled = (version) => {}) {
        return await new Promise(async (resolve) => {
            await this.downloadPlugin(plugin, async (fileTarGzPath, version, downloadStatus) => {
                console.log(fileTarGzPath, version, downloadStatus);
                onDownloaded();
    
                const decompress = require('decompress');
                const decompressTargz = require('decompress-targz');
                await decompress(fileTarGzPath, `${environment.appDirectory[environment.platform]}/plugins/${plugin.id}`, {
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

    private async downloadPlugin(plugin, cb = async (filePath, version, downloadStatus) => {}) {
        if (plugin.latestVersion == undefined) {
            return false;
        }
        if (plugin.latestVersion == plugin.version) {
            return false;
        }
        const Downloader = require("nodejs-file-downloader");
        const downloader = new Downloader({
            url: `${plugin.repositoryUrl}/releases/download/${plugin.latestVersion}/${environment.platformId}.tar.gz`,
            directory: `${environment.appDirectory[environment.platform]}/plugins/${plugin.id}`, //This folder will be created, if it doesn't exist.   
        });
        
        try {
            const {filePath,downloadStatus} = await downloader.download();
            await cb(filePath, plugin.latestVersion, downloadStatus);
        } catch (error) {
            console.log("Download failed", error);
            return false;
        }
        return true;
    }

    private async detectPluginsAndLatestVersions() {
        const pluginList = await this.getListOfPlugins();
        if (pluginList.length <= 0) {
            return ;
        }
        let internalPlugins = this.propertiesService.getProperty('plugins', []);
        const newPlugins = pluginList.filter(x => !internalPlugins.find(p => p.id == x.id));

        internalPlugins = internalPlugins.filter(x => x.installed || pluginList.map(p => p.id).includes(x.id));
        if (newPlugins.length > 0) {
            internalPlugins.push(... newPlugins.map(x => {
                return {
                    ... x,
                    installed: false
                };
            }));
            this.loggerService.log(`${newPlugins.length} new plugins Detected.`);
        }

        for (let plugin of internalPlugins) {
            const latestVersion = await this.getLatestVersionOfPluginGit(plugin.repositoryUrl);

            if (latestVersion != undefined
                && plugin.latestVersion != latestVersion) {
                    plugin.latestVersion = latestVersion;
                    this.loggerService.log(`new version ${latestVersion} for ${plugin.id}.`);
            }
        }
        this.propertiesService.setProperty('plugins', internalPlugins);
    }

    private async getListOfPlugins() {
        try  {
            const result = await fetch(environment.pluginListUrl);
            const lst = await result.json();
            return lst as any;
        } catch (e) {
            return [];
        }
    }

    private async getLatestVersionOfPluginGit(pluginRepositoryUrl) {
        const result = await fetch(`${pluginRepositoryUrl}/releases/latest`);

        if (result.redirected) {
            const d = result.url.split('/');
            return d[d.length - 1];
        }
        return null;
    }
}