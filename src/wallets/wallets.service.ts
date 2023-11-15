import { Injectable } from "@nestjs/common";
import { LoggerService } from "src/shared/logger.service";
import { PropertiesService } from "src/shared/storage/properties.service";
import { BashService } from "src/shared/bash.service";
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import * as bitcore from 'bitcore-lib';
import { WalletStorageService } from "src/shared/storage/wallet-storage.service";
import moment from "moment";
import { AnalyticsService } from "src/shared/storage/analytics.service";

@Injectable()
export class WalletsService {

    private title: string = "Keepix-Wallets-Service";

    private ETHPrice = 0;
    private BNBPrice = 0;
    private BTCPrice = 0;
    private AVAXPrice = 0;
    private lastLoadImportantPriceTime = 0;

    constructor(
        private loggerService: LoggerService,
        private walletStorageService: WalletStorageService,
        private analyticsService: AnalyticsService) {
    }

    public async run() {
        let wallets = this.walletStorageService.getWallets();

        for (let wallet of wallets) {
            this.getNativeBalance(wallet, true);
            this.getTokensBalance(wallet);
            this.analyticsService.putAnalyticWithLimitOfLength(`${wallet.type}-${wallet.address}`, {
                balance: wallet.balance,
                usd: wallet.usd,
                tokens: wallet.tokens.map(x => ({ balance: x.balance, usd: x.usd })),
                time: (new Date()).getTime()
            }, 24);
        }
        this.walletStorageService.save();
        this.analyticsService.save();
        this.loggerService.log('Wallets Analytics Saved.');
    }

    public getWalletAnalyticKey(wallet: any) {
        return `${wallet.type}-${wallet.address}`;
    }

    public async getNativeBalance(wallet: any, force: boolean = false) {
        // 10 min of caching
        if (force === false
            && wallet.lastLoadNativePriceTime !== undefined
            && moment(wallet.lastLoadNativePriceTime).isAfter(moment().subtract(10, 'minutes'))) {
            return ;
        }
        wallet.lastLoadNativePriceTime = (new Date()).getTime();

        // load important tokens Price
        await this.loadImportantTokensPrices();

        if (wallet.type == 'bitcoin') {
            const resultOfBalance = (await (await fetch(`https://blockchain.info/balance?active=${wallet.address}`)).json());
            const balance = resultOfBalance[wallet.address]?.final_balance ?? 0;
            wallet.balance = (balance / 100000000).toFixed(8);
            wallet.usd = (Number(wallet.balance) * this.BTCPrice).toFixed(2);
            return ;
        }
        if (wallet.type == 'ethereum' || wallet.type == 'arbitrum') {
            const provider = this.getProvider(wallet.type);
            const balance = await new Promise(async (resolve) => {
                provider.getBalance(wallet.address).then((balance) => {
                    const balanceInEth = ethers.utils.formatEther(balance);
                    resolve(balanceInEth);
                }).catch(() => resolve('0'));
            });
            wallet.balance = (Number(balance).toFixed(8));
            wallet.usd = (Number(wallet.balance) * this.ETHPrice).toFixed(2);
            return ;
        }
        if (wallet.type == 'bsc') {
            const provider = this.getProvider(wallet.type);
            const balance = await new Promise(async (resolve) => {
                provider.getBalance(wallet.address).then((balance) => {
                    const balanceInEth = ethers.utils.formatEther(balance);
                    resolve(balanceInEth);
                }).catch(() => resolve('0'));
            });
            wallet.balance = (Number(balance).toFixed(8));
            wallet.usd = (Number(wallet.balance) * this.BNBPrice).toFixed(2);
            return ;
        }
        if (wallet.type == 'avalanche') {
            const provider = this.getProvider(wallet.type);
            const balance = await new Promise(async (resolve) => {
                provider.getBalance(wallet.address).then((balance) => {
                    const balanceInEth = ethers.utils.formatEther(balance);
                    resolve(balanceInEth);
                }).catch(() => resolve('0'));
            });
            wallet.balance = (Number(balance).toFixed(8));
            wallet.usd = (Number(wallet.balance) * this.AVAXPrice).toFixed(2);
            return ;
        }
        wallet.balance = '0';
        return ;
    }

    public async getTokensBalance(wallet: any, force: boolean = false) {
        // 10 min of caching
        if (force === false
            && wallet.lastLoadTokenPriceTime !== undefined
            && moment(wallet.lastLoadTokenPriceTime).isAfter(moment().subtract(10, 'minutes'))) {
            return ;
        }
        wallet.lastLoadTokenPriceTime = (new Date()).getTime();

        // load important tokens Price
        await this.loadImportantTokensPrices();
        // setup tokens
        if (wallet.tokens === undefined) {
            wallet.tokens = [];
        }
        if (wallet.type == 'ethereum' || wallet.type == 'arbitrum') {
            const whiteListTokens = [
                {
                    name: 'RPL',
                    contractAddress: '0xd33526068d116ce69f19a9ee46f0bd304f21a51f',
                    pair: '0xe42318ea3b998e8355a3da364eb9d48ec725eb45',
                    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2943.png'
                }
            ];
            for (let token of whiteListTokens) {
                const balanceOfTheWallet = await this.getTokenBalanceOfAndFormatToUnit(token.contractAddress, wallet.address, wallet.type);
                const tokenPriceInETH = await this.getTokenPriceOutFromPoolBalance(token.contractAddress, 18, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, token.pair, wallet.type);
                const tokenPriceInUsd = tokenPriceInETH * this.ETHPrice;
                const balance = (Number(balanceOfTheWallet).toFixed(8));
                const balanceInUsd = (Number(balance) * tokenPriceInUsd).toFixed(2);

                let tokenDataFromWalletArray = wallet.tokens.find(x => x.contractAddress === token.contractAddress);
                if (tokenDataFromWalletArray !== undefined) {
                    tokenDataFromWalletArray.balance = balance;
                    tokenDataFromWalletArray.usd = balanceInUsd;
                    tokenDataFromWalletArray.icon = token.icon;
                } else {
                    wallet.tokens.push({
                        ... token,
                        balance: balance,
                        usd: balanceInUsd,
                    });
                }
            }
            return ;
        }
        if (wallet.type == 'bsc') {
            return ;
        }
        if (wallet.type == 'bitcoin') {
            return ;
        }
        if (wallet.type == 'avalanche') {
            return ;
        }
        return ;
    }

    public async generateNewWallet(walletType: string, data: any) {
        const generateEvmWallet = (options) => {
            const hdnode = require('@ethersproject/hdnode');  
            const mnemonic = hdnode.entropyToMnemonic(ethers.utils.randomBytes(32));
            const wallet = ethers.Wallet.fromMnemonic(mnemonic);
            const walletData = {
                type: options.type,
                subType: 'evm',
                mnemonic: wallet.mnemonic.phrase,
                address: wallet.address,
                privateKey: wallet.privateKey
            };
            this.walletStorageService.addWallet(walletData.type, walletData);
            this.walletStorageService.save();
            return true;
        };

        const generativeWalletFunctions = {
            'ethereum': (options) => generateEvmWallet({ ... options, type: 'ethereum' }),
            'bsc': (options) => generateEvmWallet({ ... options, type: 'bsc' }),
            'avalanche': (options) => generateEvmWallet({ ... options, type: 'avalanche' }),
            'arbitrum': (options) => generateEvmWallet({ ... options, type: 'arbitrum' }),
            'bitcoin': (options) => {
                const privateKey = new bitcore.PrivateKey();
                const walletData = {
                    type: 'bitcoin',
                    address: privateKey.toAddress().toString(),
                    privateKey: privateKey.toObject()
                };
                this.walletStorageService.addWallet(walletData.type, walletData);
                this.walletStorageService.save();
                return true;
            }
        };

        if (generativeWalletFunctions[walletType] == undefined) {
            return {
                success: false,
                description: 'Type not found.'
            };
        }

        return generativeWalletFunctions[walletType](data);
    }

    public async importExistingWallet(walletType: string, data: any) {

        const importEvmWalletFromPrivateKey = (options) => {
            let wallet = undefined;
            
            try {
                console.log(options);
                wallet = new ethers.Wallet(options.privateKey);
                console.log(wallet);
            } catch (e) {
                this.loggerService.log('Wallet Import failed Missmatch privateKey.');
            }
            if (wallet == undefined
                || this.walletStorageService.existsWallet(options.type, wallet.address)) {
                return false;
            }
            const walletData = {
                type: options.type,
                subType: 'evm',
                address: wallet.address,
                privateKey: wallet.privateKey
            };
            this.walletStorageService.addWallet(walletData.type, walletData);
            this.walletStorageService.save();
            return true;
        };

        if (data.privateKey != undefined) {
            const importWalletViaPrivateKeyFunctions = {
                'ethereum': (options) => importEvmWalletFromPrivateKey({ ... options, type: 'ethereum' }),
                'bsc': (options) => importEvmWalletFromPrivateKey({ ... options, type: 'bsc' }),
                'avalanche': (options) => importEvmWalletFromPrivateKey({ ... options, type: 'avalanche' }),
                'arbitrum': (options) => importEvmWalletFromPrivateKey({ ... options, type: 'arbitrum' })
            };

            if (importWalletViaPrivateKeyFunctions[walletType] == undefined) {
                return {
                    success: false,
                    description: 'Type not found.'
                };
            }
            return importWalletViaPrivateKeyFunctions[walletType](data);
        }
        return false;
    }

    private async getTokenPriceOutFromPoolBalance(_in, _in_units, _out, _out_units, _pair, type) {
        let balanceIN = await this.getTokenBalanceOf(
            _in,//'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
            _pair,//'0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11', // DAI/WETH uniswap v2 Pair
            type
        );
        let integerBalanceIN = ethers.utils.formatUnits(balanceIN, _in_units);
        let balanceOUT = await this.getTokenBalanceOf(
            _out,//'0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
            _pair,//'0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11', // DAI/WETH uniswap v2 Pair
            type
        );
        let integerBalanceOUT = ethers.utils.formatUnits(balanceOUT, _out_units);
        return Number(integerBalanceOUT) / Number(integerBalanceIN);
    };

    private async loadImportantTokensPrices() {
        if (moment(this.lastLoadImportantPriceTime).isAfter(moment().subtract(1, 'hour'))) {
            // keep current values for an hour
            return ;
        }

        this.ETHPrice = await this.getTokenPriceOutFromPoolBalance(
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, // in (WETH)
            '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, // out (DAI) Important Only 18 decimals!
            '0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11', // DAI/WETH uniswap v2 Pair
            'ethereum' // ethereum Chain
        );
        this.BNBPrice = await this.getTokenPriceOutFromPoolBalance(
            '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, // in (WBNB)
            '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 18, // out (BUSD) Important Only 18 decimals!
            '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', // Pair
            'bsc' // bsc Chain
        );
        this.BTCPrice = (await this.getTokenPriceOutFromPoolBalance(
            '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 8, // in (WBTC)
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, // out (WETH) Important Only 18 decimals!
            '0xceff51756c56ceffca006cd410b03ffc46dd3a58', // WBTC/WETH uniswap v2 Pair
            'ethereum' // ethereum Chain
        )) * this.ETHPrice;
        this.AVAXPrice = (await this.getTokenPriceOutFromPoolBalance(
            '0x1ce0c2827e2ef14d5c4f29a091d735a204794041', 18, // in (AVAX)
            '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, // out (WBNB) Important Only 18 decimals!
            '0x151268db1579ebc5306d4aaa5dcc627646e6986f', // WBNB/AVAX uniswap v2 Pair
            'bsc' // bsc Chain
        )) * this.BNBPrice;
        this.lastLoadImportantPriceTime = (new Date()).getTime();
        this.loggerService.log(`ETH=${this.ETHPrice}, BNB=${this.BNBPrice}, BTC=${this.BTCPrice}, AVAX=${this.AVAXPrice}`);
    }

    private getTokenContract(tokenAddress, type) {
        const contratToken = new ethers.Contract(
            tokenAddress,// 2040
            [
                { "inputs": [], "name": "name", "outputs": [ { "internalType": "string", "name": "", "type": "string" } as any ], "stateMutability": "view", "type": "function", "constant": true },
                { "inputs": [], "name": "symbol", "outputs": [ { "internalType": "string", "name": "", "type": "string" } as any  ], "stateMutability": "view", "type": "function", "constant": true },
                { "inputs": [], "name": "totalSupply", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } as any  ], "stateMutability": "view", "type": "function", "constant": true },
                { "inputs": [], "name": "decimals", "outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } as any  ], "stateMutability": "view", "type": "function", "constant": true },
                { "inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}], "stateMutability": "view", "type": "function", "constant": true}
            ],
            this.getRandomAccount(type)
        );
        return contratToken;
    }

    private async getTokenBalanceOf(tokenAddress, ofBalance, type) {
        try {
            return await this.getTokenContract(tokenAddress, type).balanceOf(ofBalance);
        } catch (e) { }
        return '0';
    }

    private async getTokenBalanceOfAndFormatToUnit(tokenAddress, ofBalance, type, units: number = undefined) {
        try {
            let balanceOUT = await this.getTokenBalanceOf(
                tokenAddress,//'0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
                ofBalance,//'0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11', // DAI/WETH uniswap v2 Pair
                type
            );
            let unitsOfTheToken = units ?? await this.getTokenContract(tokenAddress, type).decimals();
            return ethers.utils.formatUnits(balanceOUT, unitsOfTheToken);
        } catch (e) { }
        return '0';
    }

    private async getTokenDecimals(tokenAddress, type) {
        try {
            return await this.getTokenContract(tokenAddress, type).decimals();
        } catch (e) { }
        return '0';
    }

    private getProvider(type: string) {
        if (type === 'ethereum') {
            const provider = new ethers.providers.JsonRpcProvider({
                url: 'https://mainnet.infura.io/v3/00e69497300347a38e75c3287621cb16',
                name: 'Ethereum',
                chainId: 1
            } as any);
            return provider;
        }
        if (type === 'bsc') {
            const provider = new ethers.providers.JsonRpcProvider({
                url: 'https://bsc-dataseed1.ninicoin.io',
                name: 'Binance Smart Chain',
                chainId: 56
            } as any);
            return provider;
        }
        if (type === 'avalanche') {
            const provider = new ethers.providers.JsonRpcProvider({
                url: 'https://avalanche-mainnet.infura.io/v3/00e69497300347a38e75c3287621cb16',
                name: 'Avalanche',
                chainId: 43114
            } as any);
            return provider;
        }
        if (type === 'arbitrum') {
            const provider = new ethers.providers.JsonRpcProvider({
                url: 'https://arbitrum-mainnet.infura.io/v3/00e69497300347a38e75c3287621cb16',
                name: 'Arbitrum',
                chainId: 42161
            } as any);
            return provider;
        }
        return undefined;
    }

    private getRandomAccount(type: string) {
        const wallet = ethers.Wallet.createRandom();
        const account = wallet.connect(this.getProvider(type));
        return account;
    }
}