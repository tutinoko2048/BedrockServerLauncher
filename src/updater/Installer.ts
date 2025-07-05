import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import * as unzip from 'unzip-stream';
import * as fs from 'fs/promises';
import type { CacheManager } from './CacheManager';
import { permissionsJsonMerger, serverPropertiesMerger, type MergeInfo } from './Merge';
import type { VersionInfo } from './types';
import { safeCopy } from '../utils/fsExtra';
import { createDownloadProgress } from './progress';
import { FileProgressTracker } from './file-progress';
import * as pc from 'picocolors';

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
      console.log(pc.yellow(`📦 Using cached version: ${version.version}`));
    } else {
      await installer.downloadAndExtractServer(version);
      console.log(pc.green('✅ Download completed'));
      // Mark version as downloaded
      cacheManager.markVersionDownloaded(version.version);
    }
    
    console.log(pc.cyan('🔄 Updating server files...'));
    await installer.updateFiles();
    console.log(pc.green('✅ All files updated'));

    if (process.platform !== 'win32') {
      const bedrockServer = path.join(cacheManager.serverFolder, 'bedrock_server');
      const currentMode = (await fs.stat(bedrockServer)).mode;
      await fs.chmod(bedrockServer, currentMode | fs.constants.S_IXUSR);
      console.log(pc.blue('🔧 Added execute permission to bedrock_server'));
    }
    
    // Clear cache after successful installation
    cacheManager.clearCache();
  }

  async downloadAndExtractServer(version: VersionInfo): Promise<void> {
    const platform = process.platform === 'win32' ? 'win' : 'linux';
    const url = `https://www.minecraft.net/bedrockdedicatedserver/bin-${platform}${version.isPreview?'-preview':''}/bedrock-server-${version.version}.zip`;

    console.log(pc.gray(`URL: ${url}`));
    console.log();

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch bedrock server: ${res.status} ${res.statusText}\n${url}`);
    }
  
    const totalBytes = Number(res.headers.get('content-length'));
    const progressBar = createDownloadProgress(totalBytes);
    
    let downloadedBytes = 0;
    const progressStream = new Transform({
      transform(chunk, _encoding, callback) {
        downloadedBytes += chunk.length;
        progressBar.update(downloadedBytes);
        callback(null, chunk);
      }
    });

    try {
      const unzipStream = unzip.Extract({ path: this.newServerFolder });
      await pipeline(
        res.body!,
        progressStream,
        unzipStream,
      );
    } finally {
      progressBar.stop();
    }
  }

  async updateFiles() {
    const tracker = new FileProgressTracker();
    await this.scanDir(this.newServerFolder, '', tracker);
    tracker.finish();
  }

  async scanDir(base: string, paths: string = '', tracker: FileProgressTracker) {
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
          this.scanDir(base, relPath, tracker);
          continue;
        } else {
          if (info.onFile) result = info.onFile(newPath, this.cacheManager.serverFolder);
        }
      }
      const oldPath = path.join(this.cacheManager.serverFolder, paths, item.name);
      
      const exists = await fs.exists(oldPath);

      if (result === undefined || !exists) { // replace
        tracker.addItem(item.name, 'REPLACE');
        promises.push(
          (async () => {
            tracker.startProcessing(item.name);
            try {
              await safeCopy(newPath, oldPath);
              tracker.completeItem(item.name, 'REPLACE');
            } catch (err: any) {
              const errorMsg = `Failed to replace ${item.name}: ${err.message}`;
              tracker.errorItem(item.name, errorMsg);
              errors.push(errorMsg);
            }
          })()
        );

      } else if (result === true) { // keep
        tracker.addItem(ITEM![0], 'KEEP');
        // KEEPは即座に完了
        tracker.completeItem(ITEM![0], 'KEEP');

      } else { // merge
        tracker.addItem(ITEM![0], 'MERGE');
        promises.push(
          (async () => {
            tracker.startProcessing(ITEM![0]);
            try {
              const value = await result;
              await fs.writeFile(oldPath, value);
              tracker.completeItem(ITEM![0], 'MERGE');
            } catch (err: any) {
              const errorMsg = `Failed to merge ${item.name}: ${err.message}`;
              tracker.errorItem(ITEM![0], errorMsg);
              errors.push(errorMsg);
            }
          })()
        );
      }
    }

    await Promise.all(promises);
    
    if (errors.length > 0) {
      throw new Error(`Failed to update files:\n${errors.join('\n')}`);
    }
  }
}
