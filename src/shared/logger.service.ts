import { Injectable } from "@nestjs/common";

/**
 * Logger Service
 * 
 * Service used for log with dating
 */
@Injectable()
export class LoggerService {

    public verbose: boolean = true;

    public log(... params: any) {
        if (!this.verbose) return ;
        const time = (new Date());

        console.log(`[${time.toISOString()}]:`, ... params);
    }
}