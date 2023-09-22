import { Injectable } from "@nestjs/common";
import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import { BehaviorSubject, Subject } from "rxjs";
import { dirname } from 'path';

@Injectable()
export class BashService {

    private programDir: string = undefined;

    constructor() {
        this.programDir = dirname(require.main.filename);
    }

    async execWrapper(commandLine: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(commandLine, (error, stdout, stderr) => {
                if (error) {
                    console.warn(error);
                }
                resolve(stdout? stdout : stderr);
            });
        });
    }

    async spawn(executableAbsolutePath: string, flags: string[]) {
        let childProcessObject = {
            logs: [],
            checkIsAlive: async () => { return '0'; },
            status: '0',
            stop: () => {},
            event: new BehaviorSubject<{ key: string, value: any }>(undefined)
        };

        try {
            const childProcess = spawn
            (
                executableAbsolutePath,
                flags,
                { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync('./error.log', 'w')]},
            );

            childProcess.stdout.on('data', (data) => {
                childProcessObject.logs.push(... data.toString().split('\n'));
                childProcessObject.logs = childProcessObject.logs.slice(-1000);
                childProcessObject.event.next({ key: 'data', value: data.toString() });
            });
            childProcess.stderr.on('data', (data) => {
                childProcessObject.logs.push(... data.toString().split('\n'));
                childProcessObject.logs = childProcessObject.logs.slice(-1000);
                childProcessObject.event.next({ key: 'data', value: data.toString() });
            });
            childProcess.on('error', (error) => {
                childProcessObject.logs.push(`${error.name}: ${error.message}`);
                childProcessObject.logs.push(`[STACKTRACE] ${error.stack}`);
                childProcessObject.event.next({ key: 'error', value: error });
            });
            childProcess.on('exit', (code, signal) => {
                childProcessObject.logs.push(`[EXIT] ${code}`);
                childProcessObject.event.next({ key: 'exit', value: code });
            });
            childProcessObject.checkIsAlive = async () => {
                childProcessObject.status = childProcess.exitCode == undefined ? '1' : '0';
                return childProcessObject.status;
            };
            childProcessObject.stop = () => {
                childProcess.kill('SIGTERM');
            };
        } catch (e) {
            console.log(e);
            childProcessObject.event.next({ key: 'error', value: e });
            childProcessObject.event.next({ key: 'exit', value: -1 });
        }
        return childProcessObject;
    }
}