import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { PropertiesService } from 'src/shared/storage/properties.service';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {

    constructor(private propertiesService: PropertiesService) {}

    @Get('')
    @ApiOperation({ summary: 'Get the list of wallets' })
    async get() {
        let walletsCopy = { ... this.propertiesService.getProperty('wallets', {}) };

        for (let key of Object.keys(walletsCopy)) {
            if (walletsCopy[key].privateKey != undefined) {
                delete walletsCopy[key].privateKey;
            }
            if (walletsCopy[key].mnemonic != undefined) {
                delete walletsCopy[key].mnemonic;
            }
        }
        return walletsCopy;
    }

    @ApiBody({ type: Object })
    @Post('new')
    @ApiOperation({ summary: 'Create new wallet.' })
    async new(@Body() options: any) {

        const generativeWalletFunctions = {
            'evm': (options) => {
                const wallets = this.propertiesService.getProperty('wallets');

                if (wallets?.evm != undefined) {
                    return {
                        success: false,
                        description: 'Already Exists.'
                    };
                }

                const hdnode = require('@ethersproject/hdnode');  

                const mnemonic = hdnode.entropyToMnemonic(ethers.randomBytes(32))
                const wallet = ethers.Wallet.fromPhrase(mnemonic)

                this.propertiesService.setProperty('wallets', {
                    ... wallets,
                    evm: {
                        type: 'evm',
                        mnemonic: wallet.mnemonic.phrase,
                        address: wallet.address,
                        privateKey: wallet.privateKey
                    }
                });
                this.propertiesService.save();
                return this.propertiesService.getProperty('wallets');
            }
        };

        if (generativeWalletFunctions[options.type] == undefined) {
            return {
                success: false,
                description: 'Type not found.'
            };
        }

        return generativeWalletFunctions[options.type](options);
    }
}
