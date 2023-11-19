import { Injectable } from "@nestjs/common";
import { environment } from "src/environment";
import { LoggerService } from "src/shared/logger.service";
import { PropertiesService } from "src/shared/storage/properties.service";
import * as fs from 'fs';
import { BashService } from "src/shared/bash.service";
import { exec } from 'child_process';
import fetch from 'node-fetch';
import path from "path";
import { UpnpService } from "src/upnp/upnp.service";

@Injectable()
export class PluginsService {

    public plugins: any = {};

    private title: string = "Keepix-Plugins-Service";

    constructor(
        private loggerService: LoggerService,
        private propertiesService: PropertiesService,
        private bashService: BashService,
        private upnpService: UpnpService) {
    }

    async run() {
        this.loggerService.log(`${this.title} Run Started`);
        await this.detectPluginsAndLatestVersions();
        await this.loadInstalledPlugins();
        await this.openAndCheckUpnpPortsOnInstalledPlugins();
        this.loggerService.log(`${this.title} Run Finished`);
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
                            const commandPath = path.join(environment.globalNodeModulesDirectory, `${plugin.packageName}/dist/${environment.platformId}/${plugin.id}`);

                            exec(`${commandPath} ${JSON.stringify(JSON.stringify(argObject))}`, (error, stdout, stderr) => {
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

    public async openAndCheckUpnpPortsOnInstalledPlugins() {
        const internalPlugins = this.propertiesService.getProperty('plugins', []);

        if (await this.upnpService.isEnabled()) {
            const mapping = await this.upnpService.getMapping();

            if (mapping === undefined || !Array.isArray(mapping)) {
                this.loggerService.log('[Error] upnp enabled but get mapping failed (Retry in 10 minutes).');
                return ;
            }
            for (let plugin of internalPlugins) {
                if (plugin.requires === undefined) {
                    continue ;
                }
                if (plugin.requires.ports === undefined || !Array.isArray(plugin.requires.ports)) {
                    continue ;
                }
                for (let portInformation of plugin.requires.ports) {
                    if (plugin.installed === true) { // map or remap the port
                        const mapResult = await this.upnpService.map(portInformation.external, portInformation.protocol, portInformation.description);
                        if (mapResult !== undefined) {
                            this.loggerService.log(`[Success] map (ExternalPort:${portInformation.external}), (Protocol:${portInformation.protocol}), (Description:${portInformation.description}).`);
                        } else {
                            this.loggerService.log(`[Error] map Failed of (ExternalPort:${portInformation.external}), (Protocol:${portInformation.protocol}), (Description:${portInformation.description}) - (Retry in 10 minutes).`);
                        }
                    } else if (mapping.find(x => x.NewExternalPort == portInformation.external)) { // if port exists unmap
                        const mapResult = this.upnpService.unmap(portInformation.external, portInformation.protocol);
                        if (mapResult !== undefined) {
                            this.loggerService.log(`[Success] unmap (ExternalPort:${portInformation.external}), (Protocol:${portInformation.protocol}), (Description:${portInformation.description}).`);
                        } else {
                            this.loggerService.log(`[Error] unmap Failed of (ExternalPort:${portInformation.external}), (Protocol:${portInformation.protocol}), (Description:${portInformation.description}) - (Retry in 10 minutes).`);
                        }
                    }
                }
            }
        } else {
            this.loggerService.log('[Warning] UPNP is Disabled.');
        }
    }

    public async getVersionOfPlugin(plugin: any) {
        const pathOfPackageJsonPlugin = path.join(environment.globalNodeModulesDirectory, `${plugin.packageName}/package.json`);
        if (!fs.existsSync(pathOfPackageJsonPlugin)) {
            this.loggerService.log(`${plugin.id} package.json at ${pathOfPackageJsonPlugin} not found.`);
            return undefined;
        }
        try  {
            const packageJson = JSON.parse(fs.readFileSync(pathOfPackageJsonPlugin).toString());
            this.loggerService.log(`${plugin.id} check version ${packageJson?.version}`);
            return packageJson?.version;
        } catch (e) {
            this.loggerService.log(`${plugin.id} package.json at ${pathOfPackageJsonPlugin} parsing failed.`);
        }
        return undefined;
    }

    private async detectPluginsAndLatestVersions() {
        const pluginList = await this.getListOfPlugins();
        if (pluginList.length <= 0) {
            return ;
        }
        let internalPlugins = this.propertiesService.getProperty('plugins', []).filter(x => x.packageName != undefined);

        internalPlugins = internalPlugins.map(x => {
            const newPluginInformations = pluginList.find(p => p.id === x.id);
            if (newPluginInformations) { // override new informations
                this.loggerService.log(`${x.id} Updated.`);
                return { ... x, ... newPluginInformations };
            }
            return x;
        });

        
        const newPlugins = pluginList.filter(x => !internalPlugins.find(p => p.id == x.id));
        if (newPlugins.length > 0) {
            internalPlugins.push(... newPlugins);
            newPlugins.forEach(x => this.loggerService.log(`${x.id} Detected.`));
            this.loggerService.log(`${newPlugins.length} new plugins Detected.`);
        }

        // try getting lastests versions of each plugins via npm.
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
            this.loggerService.log(`Getting list of plugins Success (${lst.length} Plugins)`);
            return lst as any;
        } catch (e) {
            this.loggerService.log('Getting list of plugins Failed', e);
            return [];
        }
    }

    public async getLatestVersionOfPlugin(plugin) {
        const result: any = await this.bashService.execWrapper(`npm pack --dry-run ${plugin.packageName} --json`);

        if (result !== undefined && result !== '' && JSON.parse(result).length > 0 && JSON.parse(result)[0].version !== undefined) {
            const version = JSON.parse(result)[0].version;
            this.loggerService.log(`${plugin.id} Latest Version ${version}`);
            return JSON.parse(result)[0].version;
        }
        this.loggerService.log(`${plugin.id} Getting Latest Version Failed`, result);
        return null;
    }
}