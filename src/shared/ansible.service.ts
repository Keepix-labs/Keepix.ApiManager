import { Injectable } from "@nestjs/common";
import { BashService } from "./bash.service";
import { Subscription } from "rxjs";

class AnsibleResult {
    ok: number;
    changed: number;
    unreachable: number;
    failed: number;
    skipped: number;
    rescued: number;
    ignored: number;
    exitCode: number;
}

@Injectable()
export class AnsibleService {

    private verbose: boolean = true;

    constructor(private bashService: BashService) {}

    async run(ansibleScriptName: string, ansibleExtraArgs: { [name: string]: string } = {}): Promise<AnsibleResult> {
        const process = await this.bashService.spawn(
            `/usr/bin/ansible-playbook`,
            [
                `"${__dirname}/../Keepix.AutomationScripts/${ansibleScriptName}.yml"`,
                Object.keys(ansibleExtraArgs).length > 0 ? `--extra-vars` : undefined,
                Object.keys(ansibleExtraArgs).length > 0 ? Object.entries(ansibleExtraArgs).map(x => `${x[0]}=${x[1]}`).join(' ') : undefined
            ].filter(x => x != undefined));
    
        let subscriptionEvent: Subscription = undefined;
        const result: any = new Promise((resolve) => {
            let resultOfAnsible: AnsibleResult = new AnsibleResult();
            subscriptionEvent = process.event.subscribe((event: { key: string, value: any}) => {
                if (event.key == 'data' && typeof event.value === 'string') {
                    let regexResult = /(ok|changed|unreachable|failed|skipped|rescued|ignored)\=(\d)/gm.exec(event.value);
                    if (regexResult.length >= 3) {
                        resultOfAnsible[regexResult[1]] = regexResult[2];
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