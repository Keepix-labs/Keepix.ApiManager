import path from "path";
import * as fs from 'fs';
import { environment } from "src/environment";

export const httpsOptions = async () => {
    const sslDirPath = __dirname;
    const keyPath = path.join(sslDirPath, 'privkey.pem');
    const certPath = path.join(sslDirPath, 'cert.pem');

    const keyPathOld = path.join(sslDirPath, 'privkey_old.pem');
    const certPathOld = path.join(sslDirPath, 'cert_old.pem');

    try {
        // si une erreur est presente au demarrage rechercher les anciens certificats.
        if ((!fs.existsSync(keyPath) || !fs.existsSync(certPath)) && fs.existsSync(keyPathOld) && fs.existsSync(certPathOld)) {
            if (fs.existsSync(certPath)) {
                fs.rmSync(certPath);
            }
            if (fs.existsSync(keyPath)) {
                fs.rmSync(keyPath);
            }
            if (fs.existsSync(keyPathOld)) {
                fs.renameSync(keyPathOld, keyPath);
            }
            if (fs.existsSync(certPathOld)) {
                fs.renameSync(certPathOld, certPath);
            }
        }

        fs.renameSync(keyPath, keyPathOld);
        fs.renameSync(certPath, certPathOld);

        const Downloader = require("nodejs-file-downloader");
        const downloaderKey = new Downloader({
            url: environment.security.keyUrl,
            directory: sslDirPath, //This folder will be created, if it doesn't exist.   
        });
        const downloaderCert = new Downloader({
            url: environment.security.certUrl,
            directory: sslDirPath, //This folder will be created, if it doesn't exist.   
        });

        // Download of the new key/cert
        await downloaderKey.download();
        await downloaderCert.download();

        if (fs.existsSync(keyPathOld)) {
            fs.rmSync(keyPathOld);
        }
        if (fs.existsSync(certPathOld)) {
            fs.rmSync(certPathOld);
        }

        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
    } catch (error) {
        if (fs.existsSync(keyPathOld)) {
            fs.renameSync(keyPathOld, keyPath);
        }
        if (fs.existsSync(certPathOld)) {
            fs.renameSync(certPathOld, certPath);
        }
        console.log("Download failed", error);

        const defaultCerts = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
        
        return defaultCerts;
    }
};