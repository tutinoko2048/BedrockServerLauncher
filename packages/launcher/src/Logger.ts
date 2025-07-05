import chalk from 'chalk';
import dayjs from 'dayjs';

const c = {
  black: chalk.black,
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blueBright: chalk.blueBright,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  white: chalk.white,
  gray: chalk.gray,
} as const;

export class Logger {
  constructor(
    private readonly prefix: string,
    private readonly color: keyof typeof c = 'white'
  ) {}

  log(...message: unknown[]) {
    console.log(
      c.white(`[${this.date()} LOG]`),
      c[this.color](`[${this.prefix}]`),
      c.gray(message.map(String).join(' '))
    );
  }

  info(...message: unknown[]) {
    console.info(
      c.white(`[${this.date()} INFO]`),
      c[this.color](`[${this.prefix}]`),
      c.white(message.map(String).join(' '))
    );
  }

  error(...message: unknown[]) {
    console.error(
      c.red(`[${this.date()} ERROR]`),
      c[this.color](`[${this.prefix}]`),
      c.red(message.map(String).join(' '))
    );
  }

  warn(...message: unknown[]) {
    console.warn(
      c.yellow(`[${this.date()} WARN]`),
      c[this.color](`[${this.prefix}]`),
      c.yellow(message.map(String).join(' '))
    );
  }

  debug(...message: unknown[]) {
    console.debug(
      c.magenta(`[${this.date()} DEBUG]`),
      c[this.color](`[${this.prefix}]`),
      c.gray(message.map(String).join(' '))
    );
  }

  private date() {
    return dayjs().format('YYYY-MM-DD HH:mm:ss:SSS');
  }
}
