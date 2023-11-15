import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { PropertiesService } from 'src/shared/storage/properties.service';
import fetch from 'node-fetch';
import { WalletsService } from './wallets.service';
import { WalletStorageService } from 'src/shared/storage/wallet-storage.service';
import { AnalyticsService } from 'src/shared/storage/analytics.service';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {

    constructor(
        private walletStorageService: WalletStorageService,
        private walletsService: WalletsService,
        private analyticsService: AnalyticsService) {}

    @ApiQuery({ name: 'hide-secret-data', type: 'string', required: false })
    @Get('')
    @ApiOperation({ summary: 'Get the list of wallets' })
    async get(@Query('hide-secret-data') hiddenSecret: string = 'true') {
        let wallets = this.walletStorageService.getWallets();
        let walletsCopy = [];

        for (let i = 0; i < wallets.length; i++) {
            let wallet = wallets[i];

            if (wallet.type == 'bitcoin') {
                wallet.icon = 'logos:bitcoin';
                wallet.nativeCoinName = 'BTC';
            }
            if (wallet.type == 'ethereum') {
                wallet.icon = 'logos:ethereum';
                wallet.nativeCoinName = 'ETH';
            }
            if (wallet.type == 'bsc') {
                wallet.icon = 'mingcute:binance-coin-bnb-fill';
                wallet.nativeCoinName = 'BNB';
            }
            if (wallet.type == 'avalanche') {
                wallet.icon = 'cryptocurrency-color:avax';
                wallet.nativeCoinName = 'AVAX';
            }
            if (wallet.type == 'arbitrum') {
                wallet.icon = 'https://checkdot.io/assets/chains/ARB.png';
                wallet.nativeCoinName = 'ETH';
            }

            await this.walletsService.getNativeBalance(wallet);
            await this.walletsService.getTokensBalance(wallet);

            walletsCopy.push({
                ... wallet,
                privateKey: hiddenSecret === 'true' ? undefined : wallet.privateKey,
                mnemonic: hiddenSecret === 'true' ? undefined : wallet.mnemonic,
                analytics: this.analyticsService.getAnalytic(this.walletsService.getWalletAnalyticKey(wallet))
            });
        }
        return walletsCopy;
    }

    @ApiParam({ name: 'address', type: 'string' })
    @Get('secret-data/:address')
    @ApiOperation({ summary: 'Get the secret data of one wallet (Used for installation of plugins).' })
    async getSecretKey(@Param('address') address: string) {
        if (!address || address.length == 0) {
            return undefined;
        }
        return this.walletStorageService.getWalletByAddress(address);
    }

    @ApiBody({ type: Object })
    @Post('new')
    @ApiOperation({ summary: 'Create new wallet.' })
    async new(@Body() body: any) {
        return this.walletsService.generateNewWallet(body.type, body);
    }

    @ApiBody({ type: Object })
    @Post('import')
    @ApiOperation({ summary: 'Import existing wallet.' })
    async import(@Body() body: any) {
        return this.walletsService.importExistingWallet(body.type, body);
    }

    @ApiBody({ type: Object })
    @Post('refresh')
    @ApiOperation({ summary: 'Refresh balance of a wallet.' })
    async refresh(@Body() body: any) {
        let wallet = this.walletStorageService.getWallet(body.type, body.address);
        if (wallet != undefined) {
            await this.walletsService.getNativeBalance(wallet, true);
            await this.walletsService.getTokensBalance(wallet, true);
        }
        return wallet;
    }

    @ApiBody({ type: Object })
    @Post('delete')
    @ApiOperation({ summary: 'Delete a wallet.' })
    async delete(@Body() body: any) {

        if (body.address == undefined) {
            return {
                success: false,
                description: 'No Address Specified.'
            };
        }

        let targetWallet = this.walletStorageService.getWalletByAddress(body.address);
        if (targetWallet == undefined) {
            return {
                success: false,
                description: 'Wallet address not found.'
            };
        }
        targetWallet.deleted = true;
        this.walletStorageService.save();
        return {
            success: true,
            description: `Wallet ${body.address} deleted.`
        };
    }
}
