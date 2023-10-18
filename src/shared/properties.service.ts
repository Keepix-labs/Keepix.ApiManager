import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import { LoggerService } from "./logger.service";

/**
 * Properties Service
 * 
 * Service used for getting/saving props on the base path.
 * 
 * Exposed Functions:
 * 
 * getProperty(key: string): any;
 * setProperty(key: string, value: any);
 * reload();
 */
@Injectable()
export class PropertiesService {
    private readonly propertiesFilePath = './properties.json';

    private propertiesMap: any = undefined;

    constructor(
        private loggerService: LoggerService
    ) {
    }

    public getProperty(key: string): any {
        return this.propertiesMap[key];
    }

    public setProperty(key: string, value: any): void {
        this.propertiesMap[key] = value;
        this.saveProperties();
    }

    public reload() {
        this.loadProperties();
    }

    public load() {
        this.loadProperties();
        this.loggerService.log(`(${Object.keys(this.propertiesMap).length}) Properties Loaded`);
    }

    private loadProperties() {
        if (!fs.existsSync(this.propertiesFilePath)) {
            fs.writeFileSync(this.propertiesFilePath, '{}');
        }
        const stringFileData = fs.readFileSync(this.propertiesFilePath).toString();
        const jsonData = JSON.parse(stringFileData);

        this.propertiesMap = jsonData;
    }

    private saveProperties() {
        const stringFileData = JSON.stringify(this.propertiesMap);

        fs.writeFileSync(this.propertiesFilePath, stringFileData);
    }
}