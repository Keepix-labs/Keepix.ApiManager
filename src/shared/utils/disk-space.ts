import checkDiskSpace from 'check-disk-space';
import { environment } from 'src/environment';

export const getDiskSpace = async () => {
   return await new Promise((resolve) => {
        checkDiskSpace(environment.platform == 'win' ? 'C:/' : '/').then((diskSpace) => {
            resolve({
                free: diskSpace.free,
                used: diskSpace.size - diskSpace.free,
                total: diskSpace.size
              });
        });
    });
};

export const getDiskSpaceInGoString = async () => {
    try {
        const spaceDisk: any = await getDiskSpace();
        return {
            free: `${(spaceDisk.free / 1000000000).toFixed(2)} Go`,
            used: `${(spaceDisk.used / 1000000000).toFixed(2)} Go`,
            total: `${(spaceDisk.total / 1000000000).toFixed(2)} Go`
        };
    } catch (e) {
        console.error('getDiskSpaceInGoString Error', e);
        return {
            free: `0 Go`,
            used: `0 Go`,
            total: `0 Go`
        };
    }
};