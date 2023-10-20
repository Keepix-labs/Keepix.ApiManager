export interface PropertiesStorageInterface {
    getProperty(key: string, defaultValue?: any);
    setProperty(key: string, value: any);
}