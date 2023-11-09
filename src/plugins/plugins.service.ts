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
            if (this.plugins[plugin.id] == undefined && plugin.packageName != undefined) {
                this.plugins[plugin.id] = {
                    ... plugin,
                    exec: async (argObject) => {
                        return await new Promise((resolve) => {
                            // double stringify for escapes double quotes
                            exec(`${environment.globalNodeModulesDirectory}/${plugin.packageName}/dist/${environment.platformId}/${plugin.id} ${JSON.stringify(JSON.stringify(argObject))}`, (error, stdout, stderr) => {
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

    public async getVersionOfPlugin(plugin: any) {
        const pathOfPackageJsonPlugin = `${environment.globalNodeModulesDirectory}/${plugin.packageName}/package.json`;
        console.log(pathOfPackageJsonPlugin);
        if (!fs.existsSync(pathOfPackageJsonPlugin)) {
            return undefined;
        }
        const packageJson = JSON.parse(fs.readFileSync(pathOfPackageJsonPlugin).toString());
        return packageJson.version;
    }

    private async detectPluginsAndLatestVersions() {
        const pluginList = await this.getListOfPlugins();
        if (pluginList.length <= 0) {
            return ;
        }
        let internalPlugins = this.propertiesService.getProperty('plugins', []).filter(x => x.packageName != undefined);
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
            const latestVersion = await this.getLatestVersionOfPlugin(plugin);

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

    public async getLatestVersionOfPlugin(plugin) {
        const result: any = await this.bashService.execWrapper(`npm pack --dry-run ${plugin.packageName} --json`);

        if (result !== undefined && result !== '' && JSON.parse(result).length > 0 && JSON.parse(result)[0].version !== undefined) {
            return JSON.parse(result)[0].version;
        }
        return null;
    }
}