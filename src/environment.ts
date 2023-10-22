export const environment = {
    ENV: 'production',
    appTitle: 'Keepix.ApiManager',
    appVersion: '1.0.0',
    appDescription: '',
    appTag: 'ApiManager',
    port: 9000,
    ip: '0.0.0.0',
    pluginListUrl: 'https://github.com/Keepix-labs/Keepix.Plugins/raw/main/list.json',
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
    plateformId: `${process.platform.replace("darwin", "osx").replace("win32", "win")}-${process.arch}`
};