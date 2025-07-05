import * as pc from 'picocolors';

export function log(prefix: string, ...message: unknown[]) {
  console.log(
    pc.white(`[LOG]`),
    pc.white(`[${prefix}]`),
    pc.gray(message.map(String).join(' '))
  );
}

export function info(prefix: string, ...message: unknown[]) {
  console.info(
    pc.white(`[INFO]`),
    pc.white(`[${prefix}]`),
    pc.white(message.map(String).join(' '))
  );
}

export function error(prefix: string, ...message: unknown[]) {
  console.error(
    pc.red(`[ERROR]`),
    pc.white(`[${prefix}]`),
    pc.red(message.map(String).join(' '))
  );
}

export function warn(prefix: string, ...message: unknown[]) {
  console.warn(
    pc.yellow(`[WARN]`),
    pc.white(`[${prefix}]`),
    pc.yellow(message.map(String).join(' '))
  );
}

export function debug(prefix: string, ...message: unknown[]) {
  console.debug(
    pc.magenta(`[DEBUG]`),
    pc.white(`[${prefix}]`),
    pc.gray(message.map(String).join(' '))
  );
}
