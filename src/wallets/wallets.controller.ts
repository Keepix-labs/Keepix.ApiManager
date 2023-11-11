import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { PropertiesService } from 'src/shared/storage/properties.service';
import * as bitcore from 'bitcore-lib';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {

    constructor(private propertiesService: PropertiesService) {}

    @Get('')
    @ApiOperation({ summary: 'Get the list of wallets' })
    async get() {
        let walletsCopy = [ ... this.propertiesService.getProperty('wallets', []) ];

        for (let i = 0; i < walletsCopy.length; i++) {
            let wallet = walletsCopy[i];

            if (wallet.privateKey != undefined) {
                delete wallet.privateKey;
            }
            if (wallet.mnemonic != undefined) {
                delete wallet.mnemonic;
            }

            // recuperer les balances
            if (wallet.type == 'bitcoin') {
                const resultOfBalance = (await (await fetch(`https://blockchain.info/balance?active=${wallet.address}`)).json());
                const balance = resultOfBalance[wallet.address]?.final_balance ?? 0;

                wallet.balance = `${(balance / 100000000).toFixed(8)} BTC`;
                wallet.icon = 'logos:bitcoin';
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
                const hdnode = require('@ethersproject/hdnode');  
                const mnemonic = hdnode.entropyToMnemonic(ethers.randomBytes(32));
                const wallet = ethers.Wallet.fromPhrase(mnemonic);
                this.propertiesService.setProperty('wallets', [
                    ... wallets,
                    {
                        type: 'evm',
                        mnemonic: wallet.mnemonic.phrase,
                        address: wallet.address,
                        privateKey: wallet.privateKey
                    }
                ]);
                this.propertiesService.save();
                return this.propertiesService.getProperty('wallets');
            },
            'bitcoin': (options) => {
                const privateKey = new bitcore.PrivateKey();
                const wallets = this.propertiesService.getProperty('wallets');
                this.propertiesService.setProperty('wallets', [
                    ... wallets,
                    {
                        type: 'bitcoin',
                        address: privateKey.toAddress().toString(),
                        privateKey: privateKey.toObject()
                    }
                ]);
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
