import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { EthProofOfStakeService } from './eth-proof-of-stake.service';
import { AnsibleService } from 'src/shared/ansible.service';
import { InstallDto } from './dto/install';

@Controller('plugin/eth-proof-of-stake')
export class EthProofOfStakeController {

    constructor(
        private ansibleService: AnsibleService,
        private ethProofOfStakeService: EthProofOfStakeService) {
        
    }

    @Get('status')
    status() {
        return 'Installed';
    }

    @Post('install')
    @UsePipes(new ValidationPipe({ transform: true }))
    async install(@Body() settings: InstallDto) {

        if (settings.amount == 8 || settings.amount == 16) {
            // todo for rocket pool swap eth's into RPL
            // run rocket pool node, consensus node
        } else {
            // run full node, consensus node

            const ansibleResult = await this.ansibleService.run(
                `basic_eth_node`, {
                    // TODO extra args
                }
            );


        }

        return settings.amount;
    }
}
