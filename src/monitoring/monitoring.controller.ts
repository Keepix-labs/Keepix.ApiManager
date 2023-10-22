import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as os from 'os';
import { getDiskSpaceInGoString } from 'src/shared/utils/disk-space';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {

    constructor() {}

    @Get('keepix')
    async get() {
        const spaceDisk: any = await getDiskSpaceInGoString();
        const cpuPercentage = (os.loadavg()[0]).toFixed(2);

        return {
            cpu: `${cpuPercentage} %`, // 1 min average CPU percentage
            memory: spaceDisk
        };
    }
}
