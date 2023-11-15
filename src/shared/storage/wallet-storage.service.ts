import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import { LoggerService } from "../logger.service";
import { PropertiesStorage } from "./abstract/propertiesStorage";
import { environment } from "src/environment";

/**
 * Wallet Storage Service
 * 
 * Service used for getting/saving props on the base path.
 * 
 * Exposed Functions:
 * 
 * getProperty(key: string): any;
 * setProperty(key: string, value: any);
 * load();
 */
@Injectable()
export class WalletStorageService extends PropertiesStorage {
    protected readonly propertiesFilePath = environment.walletsFilePath[environment.platform];
    protected propertiesMap: any = undefined;

    constructor(
        private loggerService: LoggerService
    ) {
        super();
    }

    public getWallets(types: string[] = undefined) {
        let selectedTypes = types; 
        if (selectedTypes === undefined) { // select all
            selectedTypes = Object.keys(this.propertiesMap);
        }
        let wallets = [];
        for (let type of selectedTypes) {
            wallets.push(... this.propertiesMap[type]);
        }
        return wallets;
    }

    public getWalletByAddress(address: string) {
        const selectedTypes = Object.keys(this.propertiesMap);
        
        for (let type of selectedTypes) {
            let wallet = this.propertiesMap[type].find(x => x.address === address);
            if (wallet != undefined) {
                return wallet;
            }
        }
        return undefined;
    }

    public existsWallet(type: string, address: string) {
        return this.getWallet(type, address) !== undefined;
    }

    public getWallet(type: string, address: string) {
        if (this.propertiesMap[type] === undefined
            || !Array.isArray(this.propertiesMap[type])) {
            return undefined;
        }
        return this.propertiesMap[type].find(x => x.address == address);
    }

    public addWallet(type: string, data: any) {
        if (data.address === undefined) {
            return false;
        }
        if (this.propertiesMap[type] === undefined) {
            this.propertiesMap[type] = [];
        }
        this.propertiesMap[type].push(data);
        return true;
    }

    public load() {
        this.loadProperties();
        this.loggerService.log(`(${Object.keys(this.propertiesMap).length}) Wallets Loaded`);
    }

    public save() {
        this.saveProperties();
    }
}