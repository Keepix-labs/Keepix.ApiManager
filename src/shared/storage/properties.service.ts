import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import { LoggerService } from "../logger.service";
import { PropertiesStorage } from "./abstract/propertiesStorage";
import { environment } from "src/environment";

/**
 * Properties Service
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
export class PropertiesService extends PropertiesStorage {
    protected readonly propertiesFilePath = environment.propertiesFilePath[environment.platform];
    protected propertiesMap: any = undefined;

    constructor(
        private loggerService: LoggerService
    ) {
        super();
    }

    public load() {
        this.loadProperties();
        this.loggerService.log(`(${Object.keys(this.propertiesMap).length}) Properties Loaded`);
    }

    public save() {
        this.saveProperties();
    }
}