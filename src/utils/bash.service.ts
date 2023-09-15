import { Injectable } from "@nestjs/common";
import { exec, spawn } from 'child_process';
import fs from 'fs';

@Injectable()
export class BashService {

    async execWrapper(commandLine: string) {
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
            stop: () => {}
        };

        const childProcess = spawn
        (
            executableAbsolutePath,
            flags,
            { stdio: ['pipe', 'pipe', 'pipe', 'pipe', fs.openSync('./error.log', 'w')]}
        );

        childProcess.stdout.on('data', (data) => {
            childProcessObject.logs.push(... data.toString().split('\n'));
            childProcessObject.logs = childProcessObject.logs.slice(-1000);
        });
        childProcess.stderr.on('data', (data) => {
            childProcessObject.logs.push(... data.toString().split('\n'));
            childProcessObject.logs = childProcessObject.logs.slice(-1000);
        });
        childProcess.on('error', (error) => {
            childProcessObject.logs.push(`${error.name}: ${error.message}`);
            childProcessObject.logs.push(`[STACKTRACE] ${error.stack}`);
        });
        childProcess.on('exit', (code, signal) => {
            childProcessObject.logs.push(`[EXIT] ${code}`);
        });
        childProcessObject.checkIsAlive = async () => {
            childProcessObject.status = childProcess.exitCode == undefined ? '1' : '0';
            return childProcessObject.status;
        };
        childProcessObject.stop = () => {
            childProcess.kill('SIGTERM');
        };

        return childProcessObject;
    }
}