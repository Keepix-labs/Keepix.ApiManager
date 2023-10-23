import * as fs from 'fs';
import { name, version } from '../package.json';

export const environment = {
    ENV: fs.existsSync('./scripts') ? 'prod' : 'dev',
    appTitle: name,
    appVersion: `v${version}`,
    appDescription: '',
    appTag: name,
    port: 9000,
    ip: '0.0.0.0',
    pluginListUrl: 'https://github.com/Keepix-labs/Keepix.Plugins/raw/main/list.json',
    apiManagerRepositoryUrl: 'https://github.com/Keepix-labs/Keepix.ApiManager',
    corsConfig: {
        allowedHeaders: "*",
        origin: "*",
        headers: [
            ['Access-Control-Allow-Origin', '*'],
            ['Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE'],
            ['Access-Control-Allow-Headers', 'Content-Type, Accept']
        ]
    },
    plateform: process.platform.replace("darwin", "osx").replace("win32", "win"),
    arch: process.arch,
    plateformId: `${process.platform.replace("darwin", "osx").replace("win32", "win")}-${process.arch}`,
    appDirectory: {
        'win': `${process.env.APPDATA}\\.keepix`,
        'osx': `${process.env.HOME}/.keepix`,
        'linux': `${process.env.HOME}/.keepix`
    },
    analyticsFilePath: {
        'win': `${process.env.APPDATA}\\.keepix\\analytics.json`,
        'osx': `${process.env.HOME}/.keepix/analytics.json`,
        'linux': `${process.env.HOME}/.keepix/analytics.json`
    },
    propertiesFilePath: {
        'win': `${process.env.APPDATA}\\.keepix\\properties.json`,
        'osx': `${process.env.HOME}/.keepix/properties.json`,
        'linux': `${process.env.HOME}/.keepix/properties.json`
    }
};