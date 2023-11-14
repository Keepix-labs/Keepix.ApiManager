import * as os from 'os';

export const getCpuLoadAverage = () => {
    try {
        const cpuPercentage = (os.loadavg()[0]).toFixed(2);
        return cpuPercentage;
    } catch (e) {
        return '0';
    }
};