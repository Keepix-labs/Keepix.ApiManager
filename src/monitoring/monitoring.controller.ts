import { Controller, Get } from '@nestjs/common';
import * as os from 'os';
import { getDiskSpaceInGoString } from 'src/shared/utils/disk-space';

@Controller('monitoring')
export class MonitoringController {

    constructor() {}

    @Get('keepix')
    async get() {
        const spaceDisk: any = await getDiskSpaceInGoString();
        return {
            cpu: `${(os.loadavg()[0]).toFixed(2)} %`, // 1 min average CPU percentage
            memory: spaceDisk
        };
    }
}
