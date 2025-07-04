import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { compare } from 'compare-versions';

const logger = new Logger('CacheManager', 'yellow');

export class CacheManager {
  public cache!: LauncherCache;
  private readonly cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = path.resolve(cwd);
  }

  get serverFolder(): string {
    return this.cwd;
  }

  get cacheFolder(): string {
    return path.join(this.cwd, './.launcher-cache');
  }

  get cacheFile(): string {
    return path.join(this.cacheFolder, 'cache.json');
  }

  init(): void {
    if (!fs.existsSync(this.cacheFolder)) {
      fs.mkdirSync(this.cacheFolder);
      logger.info('Created cache folder');
    }
  }

  private save() {
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  public load(): void {
    if (!fs.existsSync(this.cacheFile)) {
      this.cache = {
        license: false,
        version: '0.0.0',
      };
      this.save();
    } else {
      try {
        this.cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      } catch (error) {
        throw new Error(`Failed to load cache file, try deleting .launcher-cache/cache.json`);
      }
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
