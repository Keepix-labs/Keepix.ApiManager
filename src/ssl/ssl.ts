import path from "path";
import * as fs from 'fs';
import { environment } from "src/environment";

export const httpsOptions = async () => {
    const sslDirPath = path.join(environment.appDirectory[environment.platform], 'ssl');
    const keyPath = path.join(sslDirPath, 'privkey.pem');
    const certPath = path.join(sslDirPath, 'cert.pem');

    const defaultCerts = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    const Downloader = require("nodejs-file-downloader");
    const downloaderKey = new Downloader({
        url: environment.security.keyUrl,
        directory: sslDirPath, //This folder will be created, if it doesn't exist.   
    });
    const downloaderCert = new Downloader({
      url: environment.security.certUrl,
      directory: sslDirPath, //This folder will be created, if it doesn't exist.   
    });
    
    try {
        await downloaderKey.download();
        await downloaderCert.download();
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
    } catch (error) {
        console.log("Download failed", error);
        return defaultCerts;
    }
};