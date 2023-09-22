import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { Subscription, filter } from "rxjs";

class AnsibleResult {
    ok: number = 0;
    changed: number = 0;
    unreachable: number = 0;
    failed: number = 0;
    skipped: number = 0;
    rescued: number = 0;
    ignored: number = 0;
    exitCode: number;
}

@Injectable()
export class AnsibleService {

    private verbose: boolean = true;

    constructor(private bashService: BashService) {}

    async run(ansibleScriptName: string, ansibleExtraArgs: { [name: string]: string } = {}): Promise<AnsibleResult> {
        const spawnProcess = await this.bashService.spawn(
            `ansible-playbook`,
            [
                `${__dirname}/../scripts/${ansibleScriptName}.yml`,
                Object.keys(ansibleExtraArgs).length > 0 ? `--extra-vars` : undefined,
                Object.keys(ansibleExtraArgs).length > 0 ? Object.entries(ansibleExtraArgs).map(x => `${x[0]}=${x[1]}`).join(' ') : undefined
            ].filter(x => x != undefined));
    
        let subscriptionEvent: Subscription = undefined;
        const result: any = await new Promise((resolve) => {
            let resultOfAnsible: AnsibleResult = new AnsibleResult();
            subscriptionEvent = spawnProcess.event
                .pipe(filter(x => x != undefined))
                .subscribe((event: { key: string, value: any}) => {

                    if (event.key == 'data' && typeof event.value === 'string') {
                        let regexResult = /(ok|changed|unreachable|failed|skipped|rescued|ignored)\=(\d)/gm.exec(event.value);
                        if (regexResult != undefined && regexResult.length >= 3 && !isNaN(+regexResult[2])) {
                            resultOfAnsible[regexResult[1]] = +regexResult[2];
                        }
                    }

                    if (event.key == 'error' && this.verbose) {
                        console.log(`Ansible Service [${ansibleScriptName}.yml] Error`, event);
                    }

                    if (event.key == 'exit') {
                        resultOfAnsible.exitCode = event.value;
                        resolve(resultOfAnsible);
                    }
            });
        });
        if (subscriptionEvent != undefined) {
            subscriptionEvent.unsubscribe();
        }
        return result;
    }
}