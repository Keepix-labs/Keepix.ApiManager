import * as fs from 'fs';
import { name, version } from '../package.json';
import path from 'path';

const env = 'prod';
const platform = process.platform.replace("darwin", "osx").replace("win32", "win");
const appDataPath = path.join(platform == 'win' ? process.env.APPDATA : process.env.HOME, '.keepix');
const npmNodeModulesGlobalDir = path.join(process.argv[0], '../../lib/node_modules');

export const environment = {
    ENV: env,
    appTitle: name,
    appVersion: `${version}`,
    appDescription: '',
    appTag: name,
    httpPort: 2000,
    httpsPort: 9000,
    webAppHttpPort: 80,
    webAppHttpsPort: 443,
    autoUpdateApp: false,
    autoUpdateInstalledPlugins: false,
    ip: '0.0.0.0',
    security: {
        certUrl: 'https://cert.keepix.org/cert.pem',
        keyUrl: 'https://cert.keepix.org/privkey.pem'
    },
    pluginListUrl: 'https://github.com/Keepix-labs/Keepix.Plugins/raw/main/list.json',
    apiManagerRepositoryUrl: 'https://github.com/Keepix-labs/Keepix.ApiManager',
    corsConfig: {
        allowedHeaders: "*",
        origin: "*",
        headers: [
            ['Access-Control-Allow-Origin', '*'],
            ['Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS'],
            ['Access-Control-Allow-Headers', 'Content-Type, Accept']
        ]
    },
    platform: platform,
    arch: process.arch,
    platformId: `${platform}-${process.arch}`,
    globalNodeModulesDirectory: npmNodeModulesGlobalDir,
    appDirectory: {
        'win': appDataPath,
        'osx': appDataPath,
        'linux': appDataPath
    },
    analyticsFilePath: {
        'win': path.join(appDataPath, 'analytics.json'),
        'osx': path.join(appDataPath, 'analytics.json'),
        'linux': path.join(appDataPath, 'analytics.json')
    },
    propertiesFilePath: {
        'win': path.join(appDataPath, 'properties.json'),
        'osx': path.join(appDataPath, 'properties.json'),
        'linux': path.join(appDataPath, 'properties.json')
    }
};