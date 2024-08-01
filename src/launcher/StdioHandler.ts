import chalk from 'chalk';
import { EventEmitter } from 'node:events';
import * as Stream from 'node:stream';
import readline from 'node:readline';
import tty from 'node:tty';
import type { BedrockDedicatedServer } from './BedrockDedicatedServer';

interface StdioEventMap {}

const lineRegex = /(?:NO LOG FILE! - )*\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3}) (?<level>\w+)\] (?<body>.*)/;

export class StdioHandler extends EventEmitter<StdioEventMap> {
  private incompleteLine = '';
  private  readonly waiters = new Set<Promise<void>>();
  /** Previous line saved to not spam to the console */
  private readonly previous = { message: '', count: 0 };

  private readonly readline: readline.Interface;

  constructor(private readonly server: BedrockDedicatedServer) {
    super();
    readline.emitKeypressEvents(process.stdin);
    // process.stdin.setRawMode(true);
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.readline.on('line', input => {
      // console.log('input', input)
      this.server.process?.stdin.write(input)
    });
  }

  listen(std: Stream.Readable) {
    std.setEncoding('utf-8');
    std.on('data', async (rawChunk) => {
      if (this.waiters.size) await new Promise(r => setTimeout(r, 1000));
      for (const waiter of this.waiters) await waiter;

      const promise = this.processIncomingChunk(rawChunk.toString());
      this.waiters.add(promise);
      promise.then(() => this.waiters.delete(promise));
    });
  }

  async processIncomingChunk(chunk: string) {
    for (const raw of this.splitLines(chunk)) {
      const match = raw.match(/^[^\s]+\s(?<time>[\d:]+)\s(?<level>\w+)\]\s?(?:\[(?<type>\w+)\])?\s?(?<message>[\s\S]+)/);

      if (!match || !match.groups) {
        
        this.readline.write(raw)
        // this.monitoring.request('log', {
        //   source: 'mc',
        //   type: 'Unknown',
        //   message: raw,
        //   time: this.logger.write.formatDate(),
        // })
      } else {
        const { time, level, type, message } = match.groups;
        const log = {
          time,
          level,
          message,
          type: type ?? 'Server',
          color: chalk.white//LogLevelColors[level] ?? LogLevelColors.INFO,
        }

        await this.writeLogLine(log as LogLine)
      }
    }
  }

  async writeLogLine(log: LogLine) {
    let message = `${log.color(log.type)} ${log.message}\n`;
    if (message !== this.previous.message) {
      // Common, unique message
      this.previous.message = message;
      this.previous.count = 1;
    } else {
      // Multiple same messages
      const lines = this.previous.message.replace(/[^\n]/g, '').length;
      readline.moveCursor(process.stdout, 0, -lines);
      message = `${chalk.bgCyanBright.black(this.previous.count++)} ${this.previous.message}`;
    }
    this.readline?.write(`${log.time} ${message}`);
  }

  splitLines(chunk: string) {
    const lines = chunk
      .split(/\n\[/g) // Every actual log line starts with [timestamp]
      .map(l => l.replace(/\r/g, '')) // Consistent line ending
      .map((line, index, array) => {
        const n = line.replace(/\n+$/, '') // Trim line

        // Check if last line in chunk
        if (index + 1 === array.length) {
          if (n === line) {
            // No line ending = incopmlete line, chunk can separate them sometimes
            // Save to use later
            this.incompleteLine += n
            return ''
          }
        }

        // First line, check if preserved incomplete prev line exists
        if (index === 0 && this.incompleteLine) {
          // Use preserved
          const result = this.incompleteLine + n
          this.incompleteLine = ''

          return result
        }

        return n
      })
      // Exclude empty lines
      .filter(e => e)
    return lines
  }
}

interface LogLine {
  time: string;
  level: string;
  type: string;
  message: string;
  color: import('chalk').ChalkInstance;
}