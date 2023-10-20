// import * as fs from 'fs';

// export const getListOfPlugins = () => {
//     return [... fs.readdirSync(__dirname)]
//     .filter(x => fs.statSync(`${__dirname}/${x}`).isDirectory());
// }

// export const getListOfPluginsWithInformations = async () => {
//     const pluginIds = getListOfPlugins();
//     let pluginsWithInformations = [];

//     for (let i = 0; i < pluginIds.length; i++) {

//         const informations: any = (await (new Promise((resolve) => {
//             import(`./${pluginIds[i]}/${pluginIds[i]}.module`).then((m: any) => {
//                 resolve(m.pluginInformations);
//             });
//         })));

//         pluginsWithInformations.push({
//             id: pluginIds[i],
//             ... informations
//         });
//     }

//     return pluginsWithInformations;
// }

// export const getDynamicPluginModules = () => {
//     return getListOfPlugins().map(x => {
//         return {
//             dynamicModule: () => import(`./${x}/${x}.module`).then(m => m.register())
//         }
//     });
// }