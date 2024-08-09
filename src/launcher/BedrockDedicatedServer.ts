import ChildProcess from 'node:child_process';
import * as path from 'node:path';
import chalk from 'chalk';
import { Logger } from '../utils/Logger';
import { StdioHandler } from './StdioHandler';

export abstract class BedrockDedicatedServer {
  abstract executable: string;

  public stdioHandler = new StdioHandler(this);
  
  public logger: Logger = new Logger('Server');

  /** Server process */
  public process: ChildProcess.ChildProcessWithoutNullStreams | undefined;

  private stopExpires = Date.now();

  constructor() {
    setInterval(() => {
      if (!this.process) return;
      if (this.stopExpires > Date.now()) return
      if (!this.alive) {
        this.logger.warn('Server is dead, exit code is', this.process.exitCode, 'restarting...')
        this.restart()
      }
    }, 3000);
  }

  get alive() {
    return this.process?.exitCode === null;
  }

  async start(): Promise<void> {
    this.logger.log('Starting server at', chalk.blackBright(this.executable))
    this.process = ChildProcess.spawn(this.executable, {
      cwd: path.join(process.cwd(), './'),
      stdio: 'pipe',
    });

    this.stdioHandler.listen(this.process.stdout);
  }

  async stop(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.process) return resolve();
      if (this.process.exitCode !== null) return resolve();
      this.stopExpires = Date.now() + 1000 * 5;
      this.process.stdin.write('stop\n');
      this.process.on('close', resolve);
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
}