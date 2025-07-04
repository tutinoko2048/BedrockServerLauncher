import * as path from 'path';
import ProgressBar from 'progress';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import * as unzip from 'unzip-stream';
import * as fs from 'fs/promises';
import type { CacheManager } from './CacheManager';
import { permissionsJsonMerger, serverPropertiesMerger, type MergeInfo } from './Merge';
import type { VersionInfo } from './types';
import { safeCopy } from '../utils/fsExtra';

const KEEP_ITEMS: [string, MergeInfo][] = [
  ['allowlist.json', {}],
  ['permissions.json', {}],
  ['whitelist.json', {}],
  ['server.properties', serverPropertiesMerger],
  ['config/default/permissions.json', permissionsJsonMerger]
];
// normalize file paths
KEEP_ITEMS.forEach(item => item[0] = path.normalize(item[0]));

export class Installer {
  constructor(private cacheManager: CacheManager) {}

  private get newServerFolder(): string {
    return this.cacheManager.cachedServerFolder;
  }

  public static async install(version: VersionInfo, cacheManager: CacheManager): Promise<void> {
    const installer = new Installer(cacheManager);
    
    // Check if version is already cached
    if (cacheManager.isVersionCached(version.version)) {
      console.log(`Version ${version.version} is cached, skipping download`);
    } else {
      await installer.downloadAndExtractServer(version);
      console.log('Downloading bedrock server: Done');
      // Mark version as downloaded
      cacheManager.markVersionDownloaded(version.version);
    }
    
    await installer.updateFiles();
    console.log('Updating files: Done');

    if (process.platform !== 'win32') {
      const bedrockServer = path.join(cacheManager.serverFolder, 'bedrock_server');
      const currentMode = (await fs.stat(bedrockServer)).mode;
      await fs.chmod(bedrockServer, currentMode | fs.constants.S_IXUSR);
      console.log('Added execute permission to bedrock_server');
    }
    
    // Clear cache after successful installation
    cacheManager.clearCache();
  }

  async downloadAndExtractServer(version: VersionInfo): Promise<void> {
    const platform = process.platform === 'win32' ? 'win' : 'linux';
    const url = `https://www.minecraft.net/bedrockdedicatedserver/bin-${platform}${version.isPreview?'-preview':''}/bedrock-server-${version.version}.zip`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch bedrock server: ${res.status} ${res.statusText}\n${url}`);
    }
  
    const totalBytes = Number(res.headers.get('content-length'));
    const bar = new ProgressBar('Downloading bedrock server [:bar] :percent :etas', {
      total: totalBytes,
      width: 40,
      incomplete: ' ',
      complete: '#',
    });

    const progressStream = new Transform({
      transform(chunk, _encoding, callback) {
        bar.tick(chunk.length);
        callback(null, chunk);
      }
    });
    const unzipStream = unzip.Extract({ path: this.newServerFolder });
    await pipeline(
      res.body!,
      progressStream,
      unzipStream,
    );
  }

  async updateFiles() {
    console.log('Updating files...');
    await this.scanDir(this.newServerFolder);
  }

  async scanDir(base: string, paths: string = '') {
    const basePath = path.join(base, paths);
    const promises: Promise<void>[] = [];
    const errors: string[] = [];
    
    for (const item of await fs.readdir(basePath, { withFileTypes: true })) {
      const relPath = path.join(paths, item.name);
      const newPath = path.join(base, relPath)
      
      // Skip .VERSION file (used for cache management)
      if (item.name === '.VERSION') {
        continue;
      }
      
      const ITEM = KEEP_ITEMS.find(([p]) => p.startsWith(relPath));
      // true: keep
      let result: true | undefined | Promise<string>;
      if (ITEM) {
        result = true;
        const info = ITEM[1];
        if (item.isDirectory()) {
          this.scanDir(base, relPath);
          continue;
        } else {
          if (info.onFile) result = info.onFile(newPath, this.cacheManager.serverFolder);
        }
      }
      const oldPath = path.join(this.cacheManager.serverFolder, paths, item.name);
      
      const exists = await fs.exists(oldPath);
  
      if (result === undefined || !exists) { // replace
        promises.push(
          safeCopy(newPath, oldPath)
            .then(() => console.log('  REPLACE:', item.name))
            .catch((err: any) => {
              const errorMsg = `Failed to replace ${item.name}: ${err.message}`;
              console.error(` ERROR: ${errorMsg}`);
              errors.push(errorMsg);
            })
        );
  
      } else if (result === true) { // keep
        console.log('  KEEP:', ITEM![0]);
  
      } else { // merge
        promises.push(
          result
            .then(value => fs.writeFile(oldPath, value))
            .then(() => console.log('  MERGE:', ITEM![0]))
            .catch((err: any) => {
              const errorMsg = `Failed to merge ${item.name}: ${err.message}`;
              console.error(` ERROR: ${errorMsg}`);
              errors.push(errorMsg);
            })
        );
      }
    }

    await Promise.all(promises);
    
    if (errors.length > 0) {
      throw new Error(`Failed to update files:\n${errors.join('\n')}`);
    }
  }
}
