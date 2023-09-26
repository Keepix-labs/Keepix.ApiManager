import { Body, Controller, Get, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { EthProofOfStakeService } from './eth-proof-of-stake.service';
import { InstallDto } from './dto/install';
import { Request } from 'express';

@Controller('plugin/eth-proof-of-stake')
export class EthProofOfStakeController {

    constructor(
        private ethProofOfStakeService: EthProofOfStakeService) {  
    }

    @Get('status')
    status() {
        return 'Installed';
    }

    @Get('page/0')
    async formDashboard() {
        return {
            componentName: 'proofOfStakeDashBoard',
            title: 'DashBoard',
            values: {
                poolStateEndpoint: '/state'
            }
        };
    }

    /**
     * Rocket pool documentation of laon and commissions: https://docs.rocketpool.net/guides/atlas/lebs.html
     * @returns Array of components
     */
    @Get('page/1')
    async formOne() {
        return {
            componentName: 'proofOfStakeAmount',
            title: 'How many ETH do you want stake?',
            nextPage: '/page/2?amount=$amount',
            values: {
                amount: {
                    defaultValue: '8',
                    values: [{
                        value: '8',
                        loan: '24',
                        costOfLoan: (24 * 11 / 100).toFixed(2), // 11% (minimum of 10%)
                        rewardCommissions: '14' // 14% on 8 ETH staking
                    }, {
                        value: '16',
                        loan: '16',
                        costOfLoan: (16 * 11 / 100).toFixed(2), // 11% (minimum of 10%)
                        rewardCommissions: '20' // 20% on 16 ETH staking
                    }, {
                        value: '32',
                        loan: '0',
                        costOfLoan: 0,
                        rewardCommissions: '0'
                    }]
                }
            }
        };
    }

    @Get('page/2:amount')
    async formTransfer(@Req() request: Request) {
        return {
            componentName: 'proofOfStakeDeposit',
            title: `Transfer ${request.params['amount']} to this address`,
            nextPage: '/page/3',
            values: {
                address: '',
                retrieveWalletSecretEndpoint: ''
            }
        };
    }

    @Get('page/3')
    async formDepositState(@Req() request: Request) {
        return {
            componentName: 'proofOfStakeDepositState',
            title: 'Transfer Detection',
            nextPage: '/page/4',
            values: {
                poolStateEndpoint: '/deposit-state'
            }
        };
    }

    @Get('page/4')
    async formInstallState(@Req() request: Request) {
        return {
            componentName: 'proofOfStakeInstallation',
            title: 'Setup In Progress',
            nextPage: '/page/0',
            values: {
                poolStateEndpoint: '/install-state',
                whenFinished: '/page/0'
            }
        };
    }

    @Post('install')
    @UsePipes(new ValidationPipe({ transform: true }))
    async install(@Body() settings: InstallDto) {

        // setup wallet into the nodes
        // open ports with upnp (Check Every Days expiration): 30303 TCP/UDP
        if (settings.amount == 8 || settings.amount == 16) {
            // todo for rocket pool swap eth's into RPL
            // run rocket pool node, consensus node
        } else {
            // run full node, consensus node
        }
        
        return true;
    }
}
