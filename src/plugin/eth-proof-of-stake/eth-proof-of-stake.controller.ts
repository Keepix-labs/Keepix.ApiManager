import { Controller, Get } from '@nestjs/common';
import { EthProofOfStakeService } from './eth-proof-of-stake.service';

@Controller('plugin/eth-proof-of-stake')
export class EthProofOfStakeController {

    constructor(ethProofOfStakeService: EthProofOfStakeService) {

    }

    @Get('status')
    status() {
        return 'Installed';
    }
}
