import { PropertiesStorageInterface } from "../interfaces/propertiesStorageInterface";
import * as fs from 'fs';

export class PropertiesStorage implements PropertiesStorageInterface {

    protected propertiesMap: any = undefined;
    protected propertiesFilePath: any;

    public getProperty(key: string, defaultValue: any = undefined): any {
        return this.propertiesMap[key] ?? defaultValue;
    }

    public setProperty(key: string, value: any): void {
        this.propertiesMap[key] = value;
        this.saveProperties();
    }

    protected loadProperties() {
        if (!fs.existsSync(this.propertiesFilePath)) {
            fs.writeFileSync(this.propertiesFilePath, '{}');
        }
        const stringFileData = fs.readFileSync(this.propertiesFilePath).toString();
        const jsonData = JSON.parse(stringFileData);

        this.propertiesMap = jsonData;
    }

    protected saveProperties() {
        const stringFileData = JSON.stringify(this.propertiesMap, null, 4);

        fs.writeFileSync(this.propertiesFilePath, stringFileData);
    }
}