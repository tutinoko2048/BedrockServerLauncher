import color from 'colors-cli/safe';
import dayjs from 'dayjs';

const colors = {
  black: color.black,
  red: color.red,
  green: color.green,
  yellow: color.yellow,
  blue: color.blue,
  magenta: color.magenta,
  cyan: color.cyan,
  white: color.white,
} as const;

export class Logger {
  constructor(
    private readonly prefix: string,
    private readonly color: keyof typeof colors = 'white'
  ) {}

  info(message: string) {
    const colorizedPrefix = colors[this.color](`[${this.prefix}]`);
    const body = `[${dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')} INFO] ${colorizedPrefix} ${message}`;
    console.log(color.white(body));
  }

  error(message: string) {
    const colorizedPrefix = colors[this.color](`[${this.prefix}]`);
    const body = `[${dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')} ERROR] ${colorizedPrefix} ${message}`;
    console.error(color.red(body));
  }

  warn(message: string) {
    const colorizedPrefix = colors[this.color](`[${this.prefix}]`);
    const body = `[${dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')} WARN] ${colorizedPrefix} ${message}`;
    console.warn(color.yellow(body));
  }

  debug(message: string) {
    const colorizedPrefix = colors[this.color](`[${this.prefix}]`);
    const body = `[${dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')} DEBUG] ${colorizedPrefix} ${message}`;
    console.log(color.cyan(body));
  }
}