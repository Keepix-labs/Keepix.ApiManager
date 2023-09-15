import { Controller, Get } from '@nestjs/common';

@Controller('plugin/eth-proof-of-stake')
export class EthProofOfStakeController {

    @Get('status')
    status() {
        return 'Installed';
    }
}
