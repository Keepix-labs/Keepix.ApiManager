import * as fs from 'fs';
import { name, version } from '../package.json';
import path from 'path';

const env = path.join(__dirname, `../..`).endsWith('.keepix') ? 'prod' : 'dev';
const platform = process.platform.replace("darwin", "osx").replace("win32", "win");
const appDataPath = env == 'prod' ? path.join(platform == 'win' ? process.env.APPDATA : process.env.HOME, '.keepix') : path.join(__dirname, `..`);

export const environment = {
    ENV: env,
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
    platform: platform,
    arch: process.arch,
    platformId: `${platform}-${process.arch}`,
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