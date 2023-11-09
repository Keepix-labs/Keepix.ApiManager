import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LoggerService } from 'src/shared/logger.service';
import { BashService } from 'src/shared/bash.service';
import { PluginsService } from './plugins.service';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from 'src/shared/storage/properties.service';

@ApiTags('Plugins')
@Controller('plugins')
export class PluginsController {

    private runningTasks: any = {
        nextId: 1,
        getNextTaskId: function () {
            return this.nextId++;
        }
    };

    constructor(
        private loggerService: LoggerService,
        private bashService: BashService,
        private propertiesService: PropertiesService,
        private pluginsService: PluginsService) {
    }

    @ApiQuery({ name: 'only-installed', type: 'boolean', required: false })
    @ApiOperation({ summary: 'Return the internal list of plugins.' })
    @Get('list')
    async list(@Query('only-installed') onlyInstalled: boolean = false) {
        return this.propertiesService.getProperty('plugins', [])
            .filter(x => onlyInstalled ? x.installed == true : true);
    }

    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiQuery({ name: 'version', type: 'string', required: false })
    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Install latest pluginId version by default.' })
    @Post(':pluginId/install')
    async installPlugin(
        @Param('pluginId') pluginId,
        @Body() body: any,
        @Query('version') version: string = "latest") {
        const taskId = `${pluginId}-install`;

        if (this.runningTasks[taskId] != undefined && this.runningTasks[taskId].status == 'INSTALLING') {
            return { error: 'Installation Already In progress' };
        }

        this.runningTasks[taskId] = {
            status: 'INSTALLING',
            description: 'Downloading'
        };
        let plugin = this.propertiesService.getProperty('plugins', []).find(x => x.id == pluginId);

        (new Promise(async () => {
            if (plugin == undefined) {
                this.runningTasks[taskId] = {
                    status: 'ERROR',
                    description: 'Plugin not found'
                };
                return ;
            }
            if (plugin.installed == true) {
                this.runningTasks[taskId] = {
                    status: 'ERROR',
                    description: 'Plugin already Installed.'
                };
                return ;
            }

            const resultOfNpmInstall = await this.bashService.execWrapper(`npm install -g ${plugin.packageName}@${version}`);

            console.log(resultOfNpmInstall);

            const versionOfInstalledPlugin = await this.pluginsService.getVersionOfPlugin(plugin);

            console.log(versionOfInstalledPlugin);
            if (versionOfInstalledPlugin == undefined) {
                this.runningTasks[taskId] = {
                    status: 'ERROR',
                    description: 'Installation failed.'
                };
                return ;
            }

            // update plugin
            plugin.installed = true;
            plugin.version = versionOfInstalledPlugin;
            this.propertiesService.save();

            await this.pluginsService.loadInstalledPlugins();
            
            this.runningTasks[taskId] = {
                status: 'INSTALLING',
                description: 'Running Installation Plugin.'
            };

            this.runCommandToPlugin(pluginId, {
                key: 'install',
                ... body
            }).then((resultOfExec) => {
                if (resultOfExec.result == true) {
                    plugin.ready = true;
                    this.propertiesService.save();
                    this.runningTasks[taskId] = {
                        status: 'FINISHED',
                        description: 'Installed with Success.'
                    };
                } else {
                    this.runningTasks[taskId] = {
                        status: 'Error',
                        description: resultOfExec.stdOut
                    };
                }
            });
        })).then(() => {
            console.log('Installation Finished');
        });
        return { taskId: taskId };
    }

    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Uninstall pluginId.' })
    @Post(':pluginId/uninstall')
    async uninstallPlugin(
        @Param('pluginId') pluginId,
        @Body() body: any) {
        const taskId = `${pluginId}-uninstall`;

        if (this.runningTasks[taskId] != undefined && this.runningTasks[taskId].status == 'UNINSTALLING') {
            return { error: 'Uninstallation Already In progress.' };
        }

        let plugin = this.propertiesService.getProperty('plugins', []).find(x => x.id == pluginId);

        if (plugin == undefined) {
            return { error: 'pluginId not found.' };
        }

        this.runningTasks[taskId] = {
            status: 'UNINSTALLING',
            description: 'Uninstalling'
        };

        this.runCommandToPlugin(pluginId, {
            key: 'uninstall',
            ... body
        }).then((resultOfExec) => {
            if (resultOfExec.result == true) {
                let plugin = this.propertiesService.getProperty('plugins', []).find(x => x.id == pluginId);
                plugin.ready = false;
                delete plugin.version;
                plugin.installed = false;
                
                this.propertiesService.save();
                this.runningTasks[taskId] = {
                    status: 'FINISHED',
                    description: 'Uninstalled with Success.'
                };
            } else {
                this.runningTasks[taskId] = {
                    status: 'Error',
                    description: resultOfExec.stdOut
                };
            }
        });

        return { taskId: taskId };
    }

    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiQuery({ name: 'version', type: 'string', required: true })
    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'Install a new pluginId version.' })
    @Post(':pluginId/update')
    async updatePlugin(
        @Param('pluginId') pluginId,
        @Body() body: any,
        @Query('version') version: string = "latest") {
        const taskId = `${pluginId}-update`;
        if (this.runningTasks[taskId] != undefined && this.runningTasks[taskId].status == 'INSTALLING') {
            return { error: 'Update Already In progress' };
        }

        this.runningTasks[taskId] = {
            status: 'UPDATING',
            description: 'Downloading'
        };
        let plugin = this.propertiesService.getProperty('plugins', []).find(x => x.id == pluginId);

        (new Promise(async () => {
            if (plugin == undefined) {
                this.runningTasks[taskId] = {
                    status: 'ERROR',
                    description: 'Plugin not found'
                };
                return ;
            }
            if (!plugin.installed) {
                this.runningTasks[taskId] = {
                    status: 'ERROR',
                    description: 'Plugin Not Installed.'
                };
                return ;
            }

            const resultOfNpmInstall = await this.bashService.execWrapper(`npm install -g ${plugin.packageName}@${version}`);

            const versionOfInstalledPlugin = await this.pluginsService.getVersionOfPlugin(plugin);
            if (versionOfInstalledPlugin == undefined) {
                this.runningTasks[taskId] = {
                    status: 'ERROR',
                    description: 'Update failed.'
                };
                return ;
            }

            // update plugin
            plugin.version = versionOfInstalledPlugin;
            this.propertiesService.save();

            await this.pluginsService.loadInstalledPlugins();
            
            this.runningTasks[taskId] = {
                status: 'FINISHED',
                description: 'Updated with Success.'
            };
        })).then(() => {
            console.log('Update Finished');
        });
        return { taskId: taskId };
    }

    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiOperation({ summary: 'Check if the plugin "pluginId" exists.' })
    @Get(':pluginId/exists')
    async exists(@Param('pluginId') pluginId) {
        return this.pluginsService.plugins[pluginId] != undefined;
    }

    @ApiQuery({ name: 'async', type: 'boolean', required: false })
    @ApiParam({ name: 'key', type: 'string' })
    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiOperation({ summary: 'For get plugin information with "key" function.' })
    @Get(':pluginId/:key')
    async runGetCommandToPlugin(
        @Param('pluginId') pluginId,
        @Param('key') key,
        @Query('async') isAsync: boolean = false) {
        const dto = {
            key: key
        };
        return await this.runCommandToPlugin(pluginId, dto, isAsync);
    }

    @ApiQuery({ name: 'async', type: 'boolean', required: false })
    @ApiParam({ name: 'key', type: 'string' })
    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiBody({ type: Object })
    @ApiOperation({ summary: 'For push plugin action with "key" function and body data.' })
    @Post(':pluginId/:key')
    async runPostCommandToPlugin(
        @Param('pluginId') pluginId,
        @Param('key') key,
        @Query('async') isAsync: boolean = false,
        @Body() body: any) {
        const dto = {
            key: key,
            ... body
        };
        return await this.runCommandToPlugin(pluginId, dto, isAsync);
    }

    private async runCommandToPlugin(pluginId: string, dto: any, isAsync: boolean = false) {
        if (isAsync) {
            const taskId = `${pluginId}-${dto.key}`;

            // skip duplicate running
            if (this.runningTasks[taskId] != undefined && this.runningTasks[taskId].status != 'FINISHED') {
                return {
                    taskId: taskId,
                    aborted: true,
                    reason: "Already Running"
                };
            }

            // save the task status
            this.runningTasks[taskId] = {
                status: 'RUNNING'
            };

            // run asynchronously
            this.pluginsService.plugins[pluginId].exec(dto).then((result) => {
                this.runningTasks[taskId] = {
                    status: 'FINISHED',
                    result: result
                };
            });

            return { taskId: taskId };
        } else {
            return await this.pluginsService.plugins[pluginId].exec(dto);
        }
    }

    @ApiParam({ name: 'taskId', type: 'string' })
    @ApiParam({ name: 'pluginId', type: 'string' })
    @ApiOperation({ summary: 'Return task state for asynchronous (get/post) actions launched.' })
    @Get(':pluginId/watch/task/:taskId')
    async watchTask(@Param('taskId') taskId) {
        return this.runningTasks[taskId];
    }

}