import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import { LoggerService } from "../logger.service";
import { PropertiesStorage } from "./abstract/propertiesStorage";
import { environment } from "src/environment";
import path from "path";

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
    public removedWalletFilePath = path.join(environment.appDirectory[environment.platform], '.removed-wallets.json');
    
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

    /**
     * Deletion of target wallet by removing it from the main wallet list
     * And saving it on the removedWalletFile.
     * This function will save the deletion.
     * This function will return an copy of the wallet deleted.
     * If no wallet was found return undefined.
     */
    public removeWallet(type: string, address: string) {
        if (this.propertiesMap[type] === undefined
            || !Array.isArray(this.propertiesMap[type])) {
            return undefined;
        }

        const wallet = this.propertiesMap[type].find(x => x.address === address);
        
        if (wallet === undefined) {
            return undefined;
        }
        ////////////////////////
        if (!fs.existsSync(this.removedWalletFilePath)) {
            fs.writeFileSync(this.removedWalletFilePath, '{}');
        }
        let removedWallets = JSON.parse(fs.readFileSync(this.removedWalletFilePath).toString());

        if (removedWallets[type] === undefined) {
            removedWallets[type] = [];
        }
        // check if already deleted in the past.
        if (!removedWallets[type].find(x => x.address === address)) {
            removedWallets[type].push(wallet);
        }
        fs.writeFileSync(this.removedWalletFilePath, JSON.stringify(removedWallets, null, 4));
        const copy = JSON.parse(JSON.stringify(wallet));
        ////////////////////////
        
        // update
        const newListOfTheType = this.propertiesMap[type].filter(x => x.address !== address);
        this.propertiesMap[type] = newListOfTheType;
        this.save();

        return copy;
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