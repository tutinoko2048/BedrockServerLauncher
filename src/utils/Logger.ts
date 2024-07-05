import chalk from 'chalk';
import dayjs from 'dayjs';

export enum LogLevel {
  Log = 'LOG',
  Info = 'INFO',
  Error = 'ERROR',
  Warn = 'WARN',
  Debug = 'DEBUG'
}

const colors = {
  black: chalk.black,
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blueBright: chalk.blueBright,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  white: chalk.white,
} as const;

const logLevelColors = {
  [LogLevel.Log]: colors.white,
  [LogLevel.Info]: colors.white,
  [LogLevel.Error]: colors.red,
  [LogLevel.Warn]: colors.yellow,
  [LogLevel.Debug]: colors.magenta
}

export class Logger {
  constructor(
    private readonly prefix: string,
    private readonly color: keyof typeof colors = 'white'
  ) {}

  log(...message: unknown[]) {
    console.log(this.createMessage(LogLevel.Log, ...message));
  }

  info(...message: unknown[]) {
    console.log(this.createMessage(LogLevel.Info, ...message));
  }

  error(...message: unknown[]) {
    console.log(this.createMessage(LogLevel.Error, ...message));
  }

  warn(...message: unknown[]) {
    console.log(this.createMessage(LogLevel.Warn, ...message));

  }

  debug(...message: unknown[]) {
    console.log(this.createMessage(LogLevel.Debug, ...message));
  }

  private createMessage(level: LogLevel, ...message: unknown[]) {
    const colorizedPrefix = colors[this.color](`[${this.prefix}]`);
    return logLevelColors[level](
      `[${dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')} ${level}] ${colorizedPrefix} ${message.map(String).join(' ')}`
    );
  }
}

export namespace Logger {
  export const Level = LogLevel;
}