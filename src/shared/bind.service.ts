import { Injectable } from "@nestjs/common";

/**
 * Logger Service
 * 
 * Service used for log with dating
 */
@Injectable()
export class BindService {

    public expressServers = []; 
    public httpServers = [];
    public httpsServers = [];
    public schedulers = [];
    public intervalIds = [];

    public addExpressServer(server: any) {
        this.expressServers.push(server);
    }

    public addHttpServer(server: any) {
        this.httpServers.push(server);
    }

    public addHttpsServer(server: any) {
        this.httpsServers.push(server);
    }

    public addScheduler(scheduler: any) {
        this.schedulers.push(scheduler);
    }

    public addInterval(intervalId: any) {
        this.intervalIds.push(intervalId);
    }

    public async clean() {
        this.expressServers.forEach(x => {
            x.removeAllListeners();
        });
        this.httpServers.forEach(x => {
            x.close(() => {
                console.log('Http Server Closed.');
            });
        });
        this.httpsServers.forEach(x => {
            x.close(() => {
                console.log('Https Server Closed.');
            });
        });
        this.schedulers.forEach(x => {
            x.cancel();
        });
        this.intervalIds.forEach(x => {
            clearInterval(x);
        });

        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }
}