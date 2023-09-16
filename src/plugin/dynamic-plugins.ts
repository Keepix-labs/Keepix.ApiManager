import * as fs from 'fs';

export const getListOfPlugins = () => {
    return [... fs.readdirSync(__dirname)]
    .filter(x => fs.statSync(`${__dirname}/${x}`).isDirectory());
}

export const getDynamicPluginModules = () => {
    return getListOfPlugins().map(x => {
        return {
            dynamicModule: () => import(`./${x}/${x}.module`).then(m => m.register())
        }
    });
}