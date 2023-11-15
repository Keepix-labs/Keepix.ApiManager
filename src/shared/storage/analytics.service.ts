import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import { LoggerService } from "../logger.service";
import { PropertiesStorage } from "./abstract/propertiesStorage";
import { environment } from "src/environment";

/**
 * Analytics Service
 * 
 * Service used for getting/saving Analytics on the base path.
 * 
 * Exposed Functions:
 * 
 * getProperty(key: string): any;
 * setProperty(key: string, value: any);
 * getCollections();
 * load();
 */
@Injectable()
export class AnalyticsService extends PropertiesStorage {
    protected readonly propertiesFilePath = environment.analyticsFilePath[environment.platform];
    protected propertiesMap: any = undefined;

    constructor(
        private loggerService: LoggerService
    ) {
        super();
    }

    public getCollections(): any {
        return this.propertiesMap;
    }

    public putAnalytic(key: string, data: any) {
        if (this.propertiesMap[key] === undefined) {
            this.propertiesMap[key] = [];
        }
        this.propertiesMap[key].push(data);
    }

    public putAnalyticWithLimitOfLength(key: string, data: any, limit: number) {
        if (this.propertiesMap[key] === undefined) {
            this.propertiesMap[key] = [];
        }
        this.propertiesMap[key] = this.propertiesMap[key].slice(-(limit));
        this.propertiesMap[key].push(data);
    }

    public getAnalytic(key: string) {
        return this.propertiesMap[key] ?? [];
    }

    public load() {
        this.loadProperties();
        this.loggerService.log(`(${Object.keys(this.propertiesMap).length}) Analytics Loaded`);
    }

    public save() {
        this.saveProperties();
    }
}