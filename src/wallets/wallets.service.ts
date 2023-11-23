import { Injectable } from "@nestjs/common";
import { LoggerService } from "src/shared/logger.service";
import { PropertiesService } from "src/shared/storage/properties.service";
import { BashService } from "src/shared/bash.service";
import fetch from 'node-fetch';
import { BigNumber, ethers } from 'ethers';
import * as bitcore from 'bitcore-lib';
import { WalletStorageService } from "src/shared/storage/wallet-storage.service";
import moment from "moment";
import { AnalyticsService } from "src/shared/storage/analytics.service";
import { coins, tokens } from "keepix-tokens";
import { getUniswapV3AmountOut } from "src/shared/utils/get-uniswap-v3-amount-out";
import { Sotez, cryptoUtils } from 'sotez';
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { StargateClient } from "@cosmjs/stargate";

const TEZOS_DERIVATION_PATH = "m/44'/1729'/0'/0'";

@Injectable()
export class WalletsService {

    private title: string = "Keepix-Wallets-Service";

    private importantPrices = {};
    private lastLoadImportantPriceTime = {};

    constructor(
        private loggerService: LoggerService,
        private walletStorageService: WalletStorageService,
        private analyticsService: AnalyticsService,
        private propertiesService: PropertiesService) {
    }

    public async run() {
        let wallets = this.walletStorageService.getWallets();

        for (let wallet of wallets) {
            this.getNativeBalance(wallet, true);
            this.getBalanceOfTokens(wallet);
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

    public getListOfTypes() {
        return Object.keys(coins);
    }

    public async getNativeBalance(wallet: any, force: boolean = false) {
        // 10 min of caching
        if (force === false
            && wallet.lastLoadNativePriceTime !== undefined
            && moment(wallet.lastLoadNativePriceTime).isAfter(moment().subtract(10, 'minutes'))) {
            return ;
        }
        wallet.lastLoadNativePriceTime = (new Date()).getTime();

        const coin = coins[wallet.type];

        if (coin === undefined) {
            wallet.balance = '0';
            return ;
        }

        if (coin.getBalanceByQuery !== undefined) {
            try {
                if (coin.getBalanceByQuery.method === 'GET') {
                    const resultOfBalance = (await (await fetch(coin.getBalanceByQuery.url.replace(/\$address/gm, wallet.address))).json());
                    const balance = eval(new Function("v", `with (v) { return (${coin.getBalanceByQuery.resultEval.replace(/\$address/gm, wallet.address)})}`)({ result: resultOfBalance })) ?? 0;

                    wallet.balance = (balance / 100000000).toFixed(8);
                } else if (coin.getBalanceByQuery.method === 'POST') {
                    const resultOfBalance = (await (await fetch(coin.getBalanceByQuery.url.replace(/\$address/gm, wallet.address), {
                        method: 'POST',
                        body: typeof coin.getBalanceByQuery.body === 'string' ? coin.getBalanceByQuery.body : JSON.stringify(coin.getBalanceByQuery.body).replace(/\$address/gm, wallet.address)
                    })).json());
                    const balance = eval(new Function("v", `with (v) { return (${coin.getBalanceByQuery.resultEval.replace(/\$address/gm, wallet.address)})}`)({ result: resultOfBalance })) ?? 0;

                    wallet.balance = (balance / 100000000).toFixed(8);
                }
            } catch (e) {
                console.error(e);
                wallet.balance = '0';
            }
        } else if (coin.type === 'evm') {
            const provider = this.getProvider(wallet.type);

            if (provider !== undefined) {
                const balance = await new Promise(async (resolve) => {
                    provider.getBalance(wallet.address).then((balance) => {
                        const balanceInEth = ethers.utils.formatEther(balance);
                        resolve(balanceInEth);
                    }).catch(() => resolve('0'));
                });
                wallet.balance = (Number(balance).toFixed(8));
            } else {
                wallet.balance = '0';
            }
        } else if (coin.type === 'tezos') {
            const tezos = this.getProvider(wallet.type);
            const balanceInWei = await tezos.getBalance(wallet.address);
            const balance = ethers.utils.formatUnits(BigNumber.from(`${balanceInWei}`), 6);
            wallet.balance = (Number(balance).toFixed(8));
        } else if (coin.type === 'cosmos') {
            const cosmosClient: StargateClient = await this.getProvider(wallet.type);
            const balanceInformation = await cosmosClient.getBalance(wallet.address, 'uatom');
            const balance = ethers.utils.formatUnits(BigNumber.from(`${balanceInformation.amount}`), 6);
            wallet.balance = (Number(balance).toFixed(8));
        }

        // todo only if wallet have positive balance
        if (Number(wallet.balance) !== 0) {
            const price = await this.getTokenOrCoinPrice(coin);
            wallet.usd = (Number(wallet.balance) * price).toFixed(2);
        } else {
            wallet.usd = '0';
        }
        return ;
    }

    public async getBalanceOfTokens(wallet: any, force: boolean = false) {
        // setup tokens if empty
        if (wallet.tokens === undefined) {
            wallet.tokens = [];
        }
        for (let token of wallet.tokens) {
            await this.getBalanceOfToken(wallet, token, force);
        }
        return ;
    }

    public async getBalanceOfToken(wallet, token, force: boolean = false) {
        ///////////////////// CACHING 10min
        if (force === false
            && token.lastPriceLoad !== undefined
            && moment(token.lastPriceLoad).isAfter(moment().subtract(10, 'minutes'))) {
            return ;
        }
        token.lastPriceLoad = (new Date()).getTime();
        /////////////////////

        const tokenData = tokens.find((x: any) => x.type === wallet.type && x.contractAddress === token.contractAddress);
        const coin = coins[wallet.type];

        if (coin.type == 'evm') {
            const balanceOfTheWallet = await this.getTokenBalanceOfAndFormatToUnit(token.contractAddress, wallet.address, wallet.type);
            let balanceInUsd = '0';
            const balance = (Number(balanceOfTheWallet).toFixed(8));

            if (Number(balance) !== 0 && tokenData != undefined) { // get the price
                const price = await this.getTokenOrCoinPrice(tokenData);
                balanceInUsd = (Number(balance) * price).toFixed(2);
            }
            token.balance = balance;
            token.usd = balanceInUsd;
        } else {
            console.log(`Token SubType ${tokenData.subType} not managed.`);
            token.balance = '0';
        }
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
            return { success: true, description: 'Wallet Generated Succesfully.' };
        };

        const evmWallets = Object.entries(coins).map((entry: any) => {
            const id = entry[0];
            const coin = entry[1];
            if (coin.type === 'evm') {
                return { key: id, value: async (options) => generateEvmWallet({ ... options, type: id }) };
            }
            return undefined;
        })
        .filter(x => x !== undefined)
        .reduce((acc: any, w) => { acc[w.key] = w.value; return acc; }, {});

        const generativeWalletFunctions = {
            'bitcoin': async (options) => {
                const privateKey = new bitcore.PrivateKey();
                const walletData = {
                    type: 'bitcoin',
                    subType: 'bitcoin',
                    address: privateKey.toAddress().toString(),
                    privateKey: privateKey.toObject()
                };
                this.walletStorageService.addWallet(walletData.type, walletData);
                this.walletStorageService.save();
                return { success: true, description: 'Wallet Generated Succesfully.' };
            },
            'bitcoin-cash': async (options) => {
                const privateKey = new bitcore.PrivateKey();
                const walletData = {
                    type: 'bitcoin-cash',
                    subType: 'bitcoin',
                    address: privateKey.toAddress().toString(),
                    privateKey: privateKey.toObject()
                };
                this.walletStorageService.addWallet(walletData.type, walletData);
                this.walletStorageService.save();
                return { success: true, description: 'Wallet Generated Succesfully.' };
            },
            'tezos': async (options) => {
                const mnemonic = cryptoUtils.generateMnemonic();
                const { sk: privateKey } = await cryptoUtils.generateKeys(mnemonic, undefined, TEZOS_DERIVATION_PATH);
                const { pkh: address } = await cryptoUtils.extractKeys(privateKey);
                //{ address, privateKey, mnemonic } as TezosWallet
                const walletData = {
                    type: 'tezos',
                    subType: 'tezos',
                    address: address,
                    privateKey: privateKey,
                    mnemonic: mnemonic
                };
                this.walletStorageService.addWallet(walletData.type, walletData);
                this.walletStorageService.save();
                return { success: true, description: 'Wallet Generated Succesfully.' };
            },
            'cosmos': async (options) => {
                const wallet: DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.generate(24);
                const accounts = await wallet.getAccounts();

                const walletData = {
                    type: 'cosmos',
                    subType: 'cosmos',
                    address: accounts[0].address,
                    privateKey: wallet.serialize(""),
                    mnemonic: wallet.mnemonic
                };
                this.walletStorageService.addWallet(walletData.type, walletData);
                this.walletStorageService.save();
                return { success: true, description: 'Cosmos Wallet Generated Succesfully.' };
            },
            ... evmWallets
        };

        if (generativeWalletFunctions[walletType] == undefined) {
            return {
                success: false,
                description: 'Type not found.'
            };
        }

        return await generativeWalletFunctions[walletType](data);
    }

    public async importExistingWallet(walletType: string, data: any) {

        const importEvmWalletFromPrivateKey = (options) => {
            let wallet = undefined;
            
            try {
                if (options.mnemonic !== undefined) {
                    wallet = ethers.Wallet.fromMnemonic(options.mnemonic);
                } else {
                    wallet = new ethers.Wallet(options.privateKey);
                }
            } catch (e) {
                this.loggerService.log('Wallet Import failed Missmatch privateKey or mnemonic.');
            }
            if (wallet == undefined) {
                return { success: false, description: 'Wallet Import failed Missmatch privateKey or mnemonic.' };
            }
            if (this.walletStorageService.existsWallet(options.type, wallet.address)) {
                return { success: false, description: 'Wallet Already Exists.' };
            }
            const walletData = {
                type: options.type,
                subType: 'evm',
                mnemonic: wallet?.mnemonic?.phrase,
                address: wallet.address,
                privateKey: wallet.privateKey,
            };
            this.walletStorageService.addWallet(walletData.type, walletData);
            this.walletStorageService.save();
            return { success: true, description: 'Wallet Imported Succesfully.' };
        };

        if (data.privateKey != undefined || data.mnemonic != undefined) {

            const evmWallets = Object.entries(coins).map((entry: any) => {
                const id = entry[0];
                const coin = entry[1];
                if (coin.type === 'evm') {
                    return { key: id, value: async (options) => importEvmWalletFromPrivateKey({ ... options, type: id }) };
                }
                return undefined;
            })
            .filter(x => x !== undefined)
            .reduce((acc: any, w) => { acc[w.key] = w.value; return acc; }, {});;

            const importWalletViaPrivateKeyFunctions = {
                'tezos': async (options) => {
                    let wallet = undefined;
                    try {
                        if (options.mnemonic !== undefined) {
                            const { sk: privateKey } = await cryptoUtils.generateKeys(options.mnemonic, undefined, TEZOS_DERIVATION_PATH);
                            const { pkh: address } = await cryptoUtils.extractKeys(privateKey);
                            wallet = {
                                mnemonic: options.mnemonic,
                                privateKey: privateKey,
                                address: address
                            };
                        } else {
                            const { pkh: address } = await cryptoUtils.extractKeys(options.privateKey);
                            wallet = {
                                privateKey: options.privateKey,
                                address: address
                            };
                        }
                    } catch (e) {
                        this.loggerService.log('Wallet Import failed Missmatch privateKey or mnemonic.');
                    }
                    if (wallet == undefined) {
                        return { success: false, description: 'Wallet Import failed Missmatch privateKey or mnemonic.' };
                    }
                    if (this.walletStorageService.existsWallet(options.type, wallet.address)) {
                        return { success: false, description: 'Wallet Already Exists.' };
                    }
                    const walletData = {
                        type: 'tezos',
                        address: wallet.address,
                        privateKey: wallet.privateKey,
                        mnemonic: wallet.mnemonic
                    };
                    this.walletStorageService.addWallet(walletData.type, walletData);
                    this.walletStorageService.save();
                    return { success: true, description: 'Wallet Imported Succesfully.' };
                },
                'cosmos': async (options) => {
                    let wallet = undefined;
                    try {
                        if (options.mnemonic !== undefined) {
                            const walletRetrieved: DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.fromMnemonic(options.mnemonic);
                            wallet = {
                                mnemonic: options.mnemonic,
                                privateKey: walletRetrieved.serialize(""),
                                address: (await walletRetrieved.getAccounts())[0].address
                            };
                        } else {
                            const walletRetrieved: DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.deserialize(options.privateKey, "");
                            wallet = {
                                mnemonic: options.mnemonic,
                                privateKey: walletRetrieved.serialize(""),
                                address: (await walletRetrieved.getAccounts())[0].address
                            };
                        }
                    } catch (e) {
                        this.loggerService.log('Wallet Import failed Missmatch privateKey or mnemonic.');
                    }

                    if (wallet == undefined) {
                        return { success: false, description: 'Wallet Import Cosmos failed Missmatch privateKey or mnemonic.' };
                    }
                    if (this.walletStorageService.existsWallet(options.type, wallet.address)) {
                        return { success: false, description: 'Wallet Cosmos Already Exists.' };
                    }
                    const walletData = {
                        type: 'cosmos',
                        address: wallet.address,
                        privateKey: wallet.privateKey,
                        mnemonic: wallet.mnemonic
                    };
                    this.walletStorageService.addWallet(walletData.type, walletData);
                    this.walletStorageService.save();
                    return { success: true, description: 'Cosmos Wallet Imported Succesfully.' };
                },
                ... evmWallets
            };

            if (importWalletViaPrivateKeyFunctions[walletType] == undefined) {
                return {
                    success: false,
                    description: 'Type of Wallet not Managed.'
                };
            }
            return await importWalletViaPrivateKeyFunctions[walletType](data);
        }
        return {
            success: false,
            description: 'Invalid Args'
        };
    }

    public async sendCoinTo(wallet, receiverAddress, amountInEther) {
        if (wallet.type === 'bitcoin') {
            return { success: false, description: 'Transfer Not Managed.' };
        }
        if (coins[wallet.type].type === 'tezos') {
            try {
                const tezos: Sotez = this.getProvider(wallet.type);
                await tezos.importKey(
                    wallet.privateKey,
                );
                const amount = ethers.utils.parseUnits(amountInEther, 6).toString();
                const tx = await tezos.transfer({
                    to: receiverAddress,
                    amount: Number(amount),
                    storageLimit: 10000 // important for enable storage of the tx
                });
                this.loggerService.log(`[Tezos] Tranfer (amount:${amountInEther}) (to:${receiverAddress}) Waiting for operation ${tx.hash}`);
                const blockHash = await tezos.awaitOperation(tx.hash);
                this.loggerService.log(`[Tezos] Operation found in block ${blockHash}`);
                return { success: true, description: `${tx.hash}` };
            } catch (e) {
                console.log(e);
                return { success: false, description: e.message };
            }
        }
        if (coins[wallet.type].type === 'evm') {
            const provider = this.getProvider(wallet.type);
            const walletObj = new ethers.Wallet(wallet.privateKey, provider);

            let tx = {
                to: receiverAddress,
                // Convert currency unit from ether to wei
                value: ethers.utils.parseEther(amountInEther)
            }

            const transactionRequest: any = await new Promise((resolve) => {
                walletObj.sendTransaction(tx).then((txObj) => {
                    console.log('txHash', txObj.hash)
                    resolve({ tx: txObj });
                }).catch((e) => {
                    resolve({ tx: undefined, error: e.message });
                });
            });

            if (transactionRequest.tx !== undefined) {
                return { success: true, description: `${transactionRequest.tx.hash}` };
            } else {
                return { success: false, description: transactionRequest.error };
            }
        }
        return { success: false, description: 'Transfer Not Managed.' };
    }

    public async isValidToken(tokenAddress, type) {
        try {
            return (await this.getTokenContract(tokenAddress, type).totalSupply()) > 0;
        } catch (e) { }
        return false;
    }

    public async getTokenSymbol(tokenAddress, type) {
        try {
            return (await this.getTokenContract(tokenAddress, type).symbol());
        } catch (e) { }
        return undefined;
    }

    private async getTokenOrCoinPrice(coinOrToken) {
        //////////////////// CACHING 1h
        let lastLoadPriceTime = 0;
        let lastPrice = 0;
        
        if (coinOrToken.nativeCoinName !== undefined && this.lastLoadImportantPriceTime[coinOrToken.nativeCoinName] !== undefined) {
            lastPrice = this.importantPrices[coinOrToken.nativeCoinName];
        }
        if (coinOrToken.symbol !== undefined && this.lastLoadImportantPriceTime[coinOrToken.symbol] !== undefined) {
            lastPrice = this.importantPrices[coinOrToken.symbol];
        }
        if (moment(lastLoadPriceTime).isAfter(moment().subtract(1, 'hour'))) {
            return lastPrice;
        }
        ///////////////////
        let tokenPrice = 0;
        if (coinOrToken.getPriceByPoolBalance !== undefined) {
            tokenPrice = await this.getTokenPriceByPoolBalance(coinOrToken);
        } else if (coinOrToken.getPriceByPoolUniswapV3 !== undefined) {
            tokenPrice = await this.getTokenPriceByUniswapV3Pool(coinOrToken);
        }
        // todo by URL

        this.lastLoadImportantPriceTime[coinOrToken.symbol] = (new Date()).getTime();
        this.importantPrices[coinOrToken.symbol] = tokenPrice;
        return tokenPrice;
    }

    private async getTokenOrCoinPriceBySymbol(symbol) {
        const coin = Object.values(coins).find((x: any) => x.nativeCoinName === symbol);
        if (coin !== undefined) {
            return await this.getTokenOrCoinPrice(coin);
        } else {
            const token = tokens.find((x: any) => x.symbol === symbol);
            if (token !== undefined) {
                return await this.getTokenOrCoinPrice(token);
            }
        }
        console.log(`${symbol} not found.`);
        return 0;
    }

    public async getTokenPriceByUniswapV3Pool(coinOrToken) {
        let byPrice = undefined;

        if (coinOrToken.getPriceByPoolUniswapV3.using !== undefined) {
            return await this.getTokenOrCoinPriceBySymbol(coinOrToken.getPriceByPoolUniswapV3.mulBy);
        }

        if (coinOrToken.getPriceByPoolUniswapV3.mulBy !== undefined) {
            byPrice = await this.getTokenOrCoinPriceBySymbol(coinOrToken.getPriceByPoolUniswapV3.mulBy);
            if (byPrice === 0) {
                return 0;
            }
        }
        let amountInWeiOfOneTokenA = '1';
        for (let i = 0; i < coinOrToken.getPriceByPoolUniswapV3.tokenADecimals; i++) {
            amountInWeiOfOneTokenA = `${amountInWeiOfOneTokenA}0`;
        }
        const amountIn = ethers.utils.parseUnits(amountInWeiOfOneTokenA, 'wei');
        const priceOut = await getUniswapV3AmountOut(
            coinOrToken.getPriceByPoolUniswapV3.tokenA, coinOrToken.getPriceByPoolUniswapV3.tokenADecimals, // in token
            coinOrToken.getPriceByPoolUniswapV3.tokenB, coinOrToken.getPriceByPoolUniswapV3.tokenBDecimals, // out token
            coinOrToken.getPriceByPoolUniswapV3.poolAddress, // Pair
            amountIn, // One tokenA
            this.getProvider(coinOrToken.getPriceByPoolUniswapV3.blockchain) // Chain
        );
        console.log('GET getPriceByPoolUniswapV3 ', priceOut);
        return coinOrToken.getPriceByPoolUniswapV3.mulBy ? Number(priceOut) * byPrice : Number(priceOut);
    }

    private async getTokenPriceByPoolBalance(coinOrToken) {
        let byPrice = undefined;

        if (coinOrToken.getPriceByPoolBalance.using !== undefined) {
            return await this.getTokenOrCoinPriceBySymbol(coinOrToken.getPriceByPoolBalance.mulBy);
        }

        if (coinOrToken.getPriceByPoolBalance.mulBy !== undefined) {
            byPrice = await this.getTokenOrCoinPriceBySymbol(coinOrToken.getPriceByPoolBalance.mulBy);
            if (byPrice === 0) {
                return 0;
            }
        }
        const priceOut = await this.getTokenPriceOutFromPoolBalance(
            coinOrToken.getPriceByPoolBalance.tokenA, coinOrToken.getPriceByPoolBalance.tokenADecimals, // in token
            coinOrToken.getPriceByPoolBalance.tokenB, coinOrToken.getPriceByPoolBalance.tokenBDecimals, // out token
            coinOrToken.getPriceByPoolBalance.poolAddress, // Pair
            coinOrToken.getPriceByPoolBalance.blockchain // Chain
        );
        return coinOrToken.getPriceByPoolBalance.mulBy ? priceOut * byPrice : priceOut;
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

    private getProvider(type: string): any {
        let overridedRpc: any = undefined;
        // override rpc by config
        if (this.propertiesService.getProperty("rpcs") !== undefined) {
            const rpcs = this.propertiesService.getProperty("rpcs");
            const foundRpc = rpcs.find(x => x.type === type);
            if (foundRpc !== undefined && typeof foundRpc === 'object') {
                overridedRpc = foundRpc;
            }
        }
        if (coins[type] === undefined) {
            return undefined;
        }
        if (coins[type].rpcs === undefined || !Array.isArray(coins[type].rpcs)) {
            return undefined;
        }
        if (coins[type].rpcs.length === 0) {
            return undefined;
        }
        let rpc = coins[type].rpcs[Math.floor(Math.random()*coins[type].rpcs.length)];

        if (coins[type].type === 'evm') {
            if (overridedRpc !== undefined
                && overridedRpc.chainId !== undefined
                && overridedRpc.url !== undefined && overridedRpc.url !== '') {
                rpc = overridedRpc;
            }
            const provider = new ethers.providers.JsonRpcProvider(rpc as any);
            return provider;
        }
        if (coins[type].type === 'tezos') { // tezos provider
            if (overridedRpc !== undefined
                && overridedRpc.url !== undefined && overridedRpc.url !== '') {
                rpc = overridedRpc;
            }
            const tezos = new Sotez(rpc.url, {
                defaultFee: 1420,
                useMutez: true,
                useLimitEstimator: true,
                chainId: 'main',
                debugMode: false,
                localForge: true,
                validateLocalForge: false,
            });
            return tezos;
        }
        if (coins[type].type === 'cosmos') { // cosmos provider
            if (overridedRpc !== undefined
                && overridedRpc.url !== undefined && overridedRpc.url !== '') {
                rpc = overridedRpc;
            }
            const client = StargateClient.connect(rpc.url);
            return client;
        }
        return undefined;
    }

    private getRandomAccount(type: string) {
        const wallet = ethers.Wallet.createRandom();
        const account = wallet.connect(this.getProvider(type));
        return account;
    }
}