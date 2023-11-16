import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ethers } from 'ethers';
import { PropertiesService } from 'src/shared/storage/properties.service';
import fetch from 'node-fetch';
import { WalletsService } from './wallets.service';
import { WalletStorageService } from 'src/shared/storage/wallet-storage.service';
import { AnalyticsService } from 'src/shared/storage/analytics.service';
import { coins, tokens } from "keepix-tokens";

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {

    constructor(
        private walletStorageService: WalletStorageService,
        private walletsService: WalletsService,
        private analyticsService: AnalyticsService) {}

    @Get('types')
    @ApiOperation({ summary: 'Get the list of wallet types managed.' })
    async getTypes() {
        return this.walletsService.getListOfTypes();
    }

    @ApiQuery({ name: 'hide-secret-data', type: 'string', required: false })
    @Get('')
    @ApiOperation({ summary: 'Get the list of wallets' })
    async get(@Query('hide-secret-data') hiddenSecret: string = 'true') {
        let wallets = this.walletStorageService.getWallets();
        let walletsCopy = [];

        for (let i = 0; i < wallets.length; i++) {
            let wallet = wallets[i];

            if (coins[wallet.type] !== undefined) {
                if (coins[wallet.type].icon !== undefined) {
                    if (coins[wallet.type].icon.startsWith('./icons/')) {
                        wallet.icon = `/wallets/icons/${coins[wallet.type].icon.replace('./icons/', '')}`;
                    } else {
                        wallet.icon = coins[wallet.type].icon;
                    }
                }
                wallet.nativeCoinName = coins[wallet.type].nativeCoinName;
            }

            await this.walletsService.getNativeBalance(wallet);
            await this.walletsService.getBalanceOfTokens(wallet);

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
            return false;
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
            await this.walletsService.getBalanceOfTokens(wallet, true);
        }
        return wallet;
    }

    @ApiBody({ type: Object })
    @Post('send')
    @ApiOperation({ summary: 'Send token or native token to an address.' })
    async send(@Body() body: any) {
        let wallet = this.walletStorageService.getWallet(body.type, body.address);
        if (wallet != undefined) {
            if (body.name === wallet.nativeCoinName) {
                // native send
                return await this.walletsService.sendCoinTo(wallet, body.to, body.amount);
            } else {
                const token = wallet.tokens?.find(x => x.name === body.name);

                if (token !== undefined) {
                    // token send
                }
            }
            return { success: false, description: 'Token or coin not found.' };
        }
        return { success: false, description: 'Wallet not found.' };
    }

    @ApiBody({ type: Object })
    @Post('import-token')
    @ApiOperation({ summary: 'Import token to a wallet.' })
    async importToken(@Body() body: any) {
        let wallet = this.walletStorageService.getWallet(body.type, body.address);
        if (wallet != undefined) {
            if (wallet.tokens === undefined) {
                wallet.tokens = [];
            }

            const tokenSymbol = await this.walletsService.getTokenSymbol(body.contractAddress, wallet.type);

            if (tokenSymbol === undefined || tokenSymbol === '') {
                return { success: false, description: 'Invalid Token Address.' };
            }
            if (wallet.tokens.find(x => x.contractAddress.toUpperCase() === body.contractAddress.toUpperCase())) {
                return { success: false, description: 'Already Present.' };
            }
            let token = {
                name: tokenSymbol,
                contractAddress: body.contractAddress
            };
            wallet.tokens.push(token);
            this.walletStorageService.save();
            await this.walletsService.getBalanceOfToken(wallet, token, true);
            return { success: true, description: 'Added' };
        }
        return { success: false, description: 'Wallet not found.' };
    }

    @ApiBody({ type: Object })
    @Post('delete')
    @ApiOperation({ summary: 'Delete a wallet (Not really removed).' })
    async delete(@Body() body: any) {

        if (body.address == undefined) {
            return {
                success: false,
                description: 'No Address Specified.'
            };
        }
        if (body.type == undefined) {
            return {
                success: false,
                description: 'No Type Specified.'
            };
        }

        let targetWallet = this.walletStorageService.removeWallet(body.type, body.address);
        if (targetWallet == undefined) {
            return {
                success: false,
                description: 'Wallet address not found.'
            };
        }
        return {
            success: true,
            description: `Wallet ${body.address} moved on "${this.walletStorageService.removedWalletFilePath}".`
        };
    }
}
