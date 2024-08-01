import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'readline/promises';
import { spawn } from 'node:child_process';
import { Logger } from '../utils/Logger';
import { BedrockDedicatedServer } from './BedrockDedicatedServer';

const logger = new Logger('Launcher', 'yellow');

logger.info('Starting launcher...');

if (!fs.existsSync(path.join(process.cwd(), './bedrock_server'))) {
  fs.mkdirSync(path.join(process.cwd(), './bedrock_server'));
}

class VanillaBedrockDedicatedServer extends BedrockDedicatedServer {
  executable = path.join(process.cwd(), './bedrock_server/bedrock_server.exe');
}

const server = new VanillaBedrockDedicatedServer();
server.start();
setTimeout(() => {
  server.stop()
}, 3_000)