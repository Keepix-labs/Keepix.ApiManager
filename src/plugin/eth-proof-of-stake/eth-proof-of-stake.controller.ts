import { Body, Controller, Get, Post, Query, Req, Request, Response, StreamableFile, UsePipes, ValidationPipe } from '@nestjs/common';
import { EthProofOfStakeService } from './eth-proof-of-stake.service';
import { InstallDto } from './dto/install';
import { ethers } from 'ethers';
import { getDiskSpaceInGoString } from 'src/shared/utils/disk-space';

@Controller('plugin/eth-proof-of-stake')
export class EthProofOfStakeController {

    public title = 'Ethereum';
    public subTitle = 'Staking';
    public description = 'Application to become a validator on the ethereum blockchain. Allows you to stake 8 ETH, 16 ETH with the use of the rocket pool protocol to manage a complete node without having 32 ETH or 32 ETH for a complete node. The app offers quick and easy installation of the proof of stake and a relevant dashboard available 24/7 from your personal network.';
    public installed = false;
    public state = 'Stopped';

    constructor(
        private ethProofOfStakeService: EthProofOfStakeService) {
    }

    // temporary:
    private wallet: any = ethers.Wallet.createRandom();
    @Get('wallet-secret')
    getWalletSecret(@Req() req, @Response({ passthrough: true }) res) {
        res.set({
            'Content-Type': 'application/json'
        });
        return new StreamableFile(Buffer.from(JSON.stringify({
            privateKey: this.wallet.privateKey
        })));
    }

    @Get('installed')
    async getStatus() {
        return this.installed;
    }

    @Get('state')
    async getState() {
        return this.state;
    }

    @Get('start')
    async start() {
        this.state = 'Running';
        return true;
    }

    @Get('stop')
    async stop() {
        this.state = 'Stopped';
        return true;
    }

    @Post('withdraw-rewards')
    async withdrawRewards(@Body() data: any) {
        return true;
    }

    /**
     * 7d APY, 30d APY, one year APY, ETH Staked Amount,
     * RPL Staked Amount, Staking Type (Full or Mini Pool),
     * Total Rewards (Avec bouton unstake), 7d Rewards, 24h rewards,
     * Bouton pour aller sur le grafana,
     * Espace disk utilisé,
     * Bouton Stopper/redemarrer,
     * Bouton Uninstall (Activable si stoppé).
     * Description de l'app,
     * Lien vers les divers explorers t'elle que etherscan (address de sont wallet), lien vers explorer Validateur, Etat de l'app Running/Stopped,  Dedier un Espace message d'Alert, Dedier un espace ipc commands (petit shell permettant de d'executer des commandes sur les noeuds).
     */

    @Get('page/0')
    async formDashboard(@Request() req) {
        return {
            componentName: 'proofOfStakeDashBoard',
            title: this.title,
            subTitle: this.subTitle,
            description: this.description,
            poolStateEndpoint: '/state',
            installed: this.installed,
            state: await this.getState(),
            alerts: ['Fake Alert empty if no alert.'],
            APY: {
                '7d': '5.00%',
                '30d': '5.00%',
                '1Y': '5.00%',
            },
            locked: {
                'ETH': '32.00',
                'RPL': '0'
            },
            stakingType: 'FULL',
            rewards: {
                '24h': '0.0012524352642',
                '7d': '0.0372524352642',
                'total': '0.2372524352642'
            },
            memory: await getDiskSpaceInGoString(),
            grafanaLink: `http://${req.headers.host.split(':')[0]}:5000/grafana`,
            etherScanLink: `https://etherscan.io/address/${this.wallet.address}`,
            beanconScanLink: `https://beaconscan.com/validator/0x88841e426f271030ad2257537f4eabd216b891da850c1e0e2b92ee0d6e2052b1dac5f2d87bef51b8ac19d425ed024dd1`,
            
            // manage nodes
            ipcLogsStreamEndpoint: `/ipc-stream`,
            ipcPostCommandLineEndpoint: `/ipc-cmd`,

            stopEndpoint: `/stop`,
            startEndpoint: `/start`,
            uninstallEndpoint: `/uninstall`,
            withdrawPostRewardsEndpoint: `/withdraw-rewards`
        };
    }

    /**
     * Rocket pool documentation of laon and commissions: https://docs.rocketpool.net/guides/atlas/lebs.html
     * @returns Array of components
     */
    @Get('page/1')
    async formOne() {
        return {
            title: 'How many ETH do you want stake?',
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
        };
    }

    @Get('page/2')
    async formWallet(@Query() query) {

        const amount = query['amount'];
        
        return {
            title: `Save your wallet ${this.wallet.address}`,
            amount: amount,
            currency: 'ETH',
            address: this.wallet.address,
            retrieveWalletSecretEndpoint: '/wallet-secret',
            seedPhrase: 'mot1 mot2 mot3 mot4 mot5 mot6 mot1 mot2 mot3 mot4 mot5 mot6 mot1 mot2 mot3 mot4 mot5 mot6 mot1 mot2 mot3 mot4 mot5 mot6'
        };
    }

    @Get('page/3')
    async formTransfer(@Query() query) {

        const amount = query['amount'];
        let transferNeed = "0";

        if (amount == 8) {
            transferNeed = (8 + Number((24 * 11 / 100).toFixed(2))).toFixed(2);
        } else if (amount == 16) {
            transferNeed = (16 + Number((16 * 11 / 100).toFixed(2))).toFixed(2);
        } else {
            transferNeed = '32';
        }

        // add 0.1 % for pay fees
        transferNeed = (Number(transferNeed) + Number((Number(transferNeed) * 0.1 / 100).toFixed(2))).toFixed(2);

        return {
            title: `Transfer ${transferNeed} to this address ${this.wallet.address}`,
            amount: transferNeed,
            currency: 'ETH',
            address: this.wallet.address,
            retrieveWalletSecretEndpoint: '/wallet-secret'
        };
    }

    @Get('page/4')
    async formDepositState() {
        return {
            title: 'Transfer Detection',
            values: {
                poolStateEndpoint: '/deposit-state'
            }
        };
    }

    private depositStateMock = { state: 0, count: 0 };
    @Get('deposit-state')
    async depositState() {
        if (this.depositStateMock.count >= 10) {
            this.depositStateMock.count = 0;
            return {
                state: 'DONE'
            };
        }
        this.depositStateMock.count += 1;
        return {
            state: 'IN_PROGRESS'
        };
    }

    private installStateMock = { state: 0, percentage: 0 };
    @Get('install-state')
    async installState() {
        this.installStateMock.percentage += 5;
        if (this.installStateMock.percentage > 100) {
            this.installStateMock.percentage = 0;
        }
        return {
            percentage: this.installStateMock.percentage
        };
    }

    @Get('page/5')
    async formInstallState() {
        return {
            title: 'Setup In Progress',
            poolStateEndpoint: '/install-state',
            whenFinished: '/page/0'
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

    @Post('uninstall')
    async uninstall() {
        this.installed = false;
        return true;
    }
}
