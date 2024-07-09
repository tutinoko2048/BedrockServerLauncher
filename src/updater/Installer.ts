import * as path from 'path';
import ProgressBar from 'progress';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import * as unzip from 'unzip-stream';
import * as fs from 'fs/promises';
import { cacheFolder, serverFolder } from './CacheManager';
import { serverPropertiesMerger, type MergeInfo } from './Merge';
import type { VersionInfo } from './types';
import { safeRename } from '../utils/fsExtra';

const KEEP_ITEMS: [string, MergeInfo][] = [
  ['allowlist.json', {}],
  ['permissions.json', {}],
  ['whitelist.json', {}],
  ['server.properties', serverPropertiesMerger],
  ['config/default/permissions.json', {}] // TODO: merge array
];
// normalize file paths
KEEP_ITEMS.forEach(item => item[0] = path.normalize(item[0]));

const newServerFolder = path.join(cacheFolder, './_bedrock_server');

export class Installer {
  public static async install(version: VersionInfo): Promise<void> {
    const installer = new Installer();
    await installer.downloadAndExtractServer(version);
    console.log('Downloading bedrock server: Done');
    await installer.updateFiles();
    console.log('Updating files: Done');
  }

  async downloadAndExtractServer(version: VersionInfo): Promise<void> {
    const platform = process.platform === 'win32' ? 'win' : 'linux';
    const url = `https://minecraft.azureedge.net/bin-${platform}${version.isPreview?'-preview':''}/bedrock-server-${version.version}.zip`;
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
    const unzipStream = unzip.Extract({ path: newServerFolder });
    await pipeline(
      res.body!,
      progressStream,
      unzipStream,
    );
  }

  async updateFiles() {
    console.log('Updating files...');
    await this.scanDir(newServerFolder);
  }

  async scanDir(base: string, paths: string = '') {
    const basePath = path.join(base, paths);
    for (const item of await fs.readdir(basePath, { withFileTypes: true })) {
      const relPath = path.join(paths, item.name);
      const newPath = path.join(base, relPath)
      const ITEM = KEEP_ITEMS.find(([p]) => p.startsWith(relPath));
      // true: keep
      let result: string | Buffer | true | undefined;
      if (ITEM) {
        result = true;
        const info = ITEM[1];
        if (item.isDirectory()) {
          this.scanDir(base, relPath);
          continue;
        } else {
          if (info.onFile) result = await info.onFile(newPath)
        }
      }
      const oldPath = path.join(serverFolder, paths, item.name);
      
      const exists = await fs.exists(oldPath);
  
      if (result === undefined || !exists) { // replace
        console.log('  REPLACE:', item.name);
        await safeRename(newPath, oldPath);
  
      } else if (result === true) { // keep
        console.log('  KEEP:', ITEM![0]);
  
      } else { // merge
        console.log('  MERGE:', ITEM![0]);
        await fs.writeFile(oldPath, result);
      }
    }
  }
}