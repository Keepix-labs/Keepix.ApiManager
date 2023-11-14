import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { getDiskSpaceInGoString } from 'src/shared/utils/disk-space';
import { getCpuLoadAverage } from 'src/shared/utils/cpu-load-average';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {

    @Get('keepix')
    async get() {
        const spaceDisk: any = await getDiskSpaceInGoString();
        const cpuPercentage = getCpuLoadAverage();

        return {
            cpu: `${cpuPercentage} %`, // 1 min average CPU percentage
            memory: spaceDisk
        };
    }
}
