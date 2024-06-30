import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { compare } from 'compare-versions';

export const serverFolder = path.join(__dirname, '../bedrock_server');
export const cacheFolder = path.join(__dirname, '../../.launcher-cache');
export const cacheFile = path.join(cacheFolder, 'cache.json');
export const serverArchive = path.join(cacheFolder, './bedrock-server.zip');


const logger = new Logger('CacheManager', 'yellow');

export class CacheManager {
  public cache!: LauncherCache;

  constructor() {
    if (!fs.existsSync(cacheFolder)) {
      fs.mkdirSync(cacheFolder);
      logger.info('Created cache folder');
    }

    this.load();
  }

  private save() {
    fs.writeFileSync(cacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  private load(): void {
    if (!fs.existsSync(cacheFile)) {
      this.cache = {
        license: false,
        version: '0.0.0',
      };
      this.save();
    } else {
      this.cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
  }

  public getLicense(): boolean {
    return this.cache.license;
  }

  public setLicense(license: boolean): void {
    this.cache.license = license;
    this.save();
  }

  public getVersion(): string | undefined {
    return this.cache.version;
  }

  public setVersion(version: string): void {
    this.cache.version = version;
    this.save();
  }

  public shouldUpdate(newVersion: string): boolean {
    return compare(newVersion, this.cache.version, '>');
  }
}

export interface LauncherCache {
  license: boolean;
  version: string;
}
