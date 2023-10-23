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
    protected readonly propertiesFilePath = environment.analyticsFilePath[environment.plateform];
    protected propertiesMap: any = undefined;

    constructor(
        private loggerService: LoggerService
    ) {
        super();
    }

    public getCollections(): any {
        return this.propertiesMap;
    }

    public load() {
        this.loadProperties();
        this.loggerService.log(`(${Object.keys(this.propertiesMap).length}) Analytics Loaded`);
    }
}