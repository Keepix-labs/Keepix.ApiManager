import { Injectable } from "@nestjs/common";
import { environment } from "src/environment";
import { LoggerService } from "src/shared/logger.service";
import { PropertiesService } from "src/shared/storage/properties.service";
import * as fs from 'fs';
import { BashService } from "src/shared/bash.service";

@Injectable()
export class PluginService {

    public plugins: any = {};

    private title: string = "Keepix-Plugin-Service";

    constructor(
        private loggerService: LoggerService,
        private propertiesService: PropertiesService,
        private bashService: BashService) {
    }

    async run() {
        this.loggerService.log(`${this.title} Run`);
        await this.detectPluginsAndLatestVersions();

        await this.loadInstalledPlugins();

        const internalPlugins = this.propertiesService.getProperty('plugins', []);
        await this.installPlugin(internalPlugins[0], async (filePath, version, downloadStatus) => {
            console.log(filePath, version, downloadStatus);
            

            const decompress = require('decompress');
            const decompressTargz = require('decompress-targz');
            
            decompress(filePath, `./.plugins/${internalPlugins[0].id}`, {
                plugins: [
                    decompressTargz()
                ]
            }).then(() => {
                console.log('Files decompressed');
            });

            internalPlugins[0].version = version;
            internalPlugins[0].installed = true;
            this.propertiesService.setProperty('plugins', internalPlugins);

            await this.loadInstalledPlugins();
        });
    }

    private async loadInstalledPlugins() {
        const internalPlugins = this.propertiesService.getProperty('plugins', []);

        for (let plugin of internalPlugins) {
            if (this.plugins[plugin.id] == undefined && plugin.installed == true) {
                const { wasm } = await import(`../../../.plugins/${plugin.id}/dist/wasm.js`);
                const dotnetExports = await wasm(false);

                this.plugins[plugin.id] = {
                    ... plugin,
                    exports: dotnetExports
                };
            }
        }
    }

    private async installPlugin(plugin, cb = async (filePath, version, downloadStatus) => {}) {
        if (plugin.latestVersion == undefined) {
            return false;
        }
        if (plugin.latestVersion == plugin.version) {
            return false;
        }
        const Downloader = require("nodejs-file-downloader");
        const downloader = new Downloader({
            url: `${plugin.repositoryUrl}/releases/download/${plugin.latestVersion}/wasm.tar.gz`,
            directory: `.plugins/${plugin.id}`, //This folder will be created, if it doesn't exist.   
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
        const internalPlugins = this.propertiesService.getProperty('plugins', []);
        const newPlugins = pluginList.filter(x => !internalPlugins.find(p => p.id == x.id));

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