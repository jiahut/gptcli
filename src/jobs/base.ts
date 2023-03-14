import { spawn } from 'child_process';
import chalk from 'chalk';
import logUpdate from 'log-update';
import { replaceEnvVariables } from '../utils/replaceEnvVariables.js';

export interface IConfigBase {
	name: string;
	with?: {
		[key: string]: any;
	}
	if?: string;
	script?: string | string[];
	export?: {
		[key: string]: any;
	}
	uses?: string;
	pipeline: {
		env: {
			[key: string]: any;
		}
	}
}

export abstract class Base {
	public name;
	public with;
	public if?;
	public script;
	public export;
	public pipeline;
	public uses;

	constructor(args: IConfigBase) {
		this.name = args.name;
		this.with = args.with;
		this.if = args.if;
		this.script = args.script;
		this.export = args.export;
		this.uses = args.uses;
		this.pipeline = args.pipeline;
	}

	public execScript = async (
		script: string,
	): Promise<{ code: number; stdout: string; stderr: string }> => {
		const scriptWithEnv = replaceEnvVariables(script, {
			...process.env,
			...this.pipeline.env,
		});

		return new Promise((resolve, reject) => {
			const process = spawn(scriptWithEnv, {
				shell: true,
				stdio: 'pipe',
			});

			let stdout = '';
			let stderr = '';
			process.stdout.on('data', (data) => {
				stdout += data;
				logUpdate(data);
			});
			process.stderr.on('data', (data) => {
				stderr += data;
				logUpdate(data);
			});
			process.on('close', (code) => {
				if (code !== 0) {
					reject(stderr);
				}
				resolve({ code: 0, stdout, stderr });
			});
		});
	}

	private execIfCondition = async (condition: string) => {
		const ifWithEnv = replaceEnvVariables(condition, this.pipeline.env);

		try {
			return eval(`Boolean(${ifWithEnv})`);
		} catch (e) {
			console.error('Error occurred while running the if statement:', e);
			return false;
		}
	}

	public async run() {
		if (this.if) {
			const result = await this.execIfCondition(this.if);
			if (!result) {
				process.exit(0);
			}
		}
	}
}
