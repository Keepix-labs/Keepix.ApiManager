import { statfs } from 'fs';

export const getDiskSpace = async () => {
   return await new Promise((resolve) => {
        statfs('/', (err, stats) => {
            if (err) {
              resolve({
                free: 1,
                available: 1,
                total: 1
              });
            }
            console.log(stats);
            resolve({
                free: stats.bsize*stats.bfree,
                used: (stats.bsize*stats.blocks) - (stats.bsize*stats.bfree),
                total: stats.bsize*stats.blocks
            });
        });
    });
};

export const getDiskSpaceInGoString = async () => {
    const spaceDisk: any = await getDiskSpace();
    return {
        free: `${(spaceDisk.free / 1000000000).toFixed(2)} Go`,
        used: `${(spaceDisk.used / 1000000000).toFixed(2)} Go`,
        total: `${(spaceDisk.total / 1000000000).toFixed(2)} Go`
    };
};