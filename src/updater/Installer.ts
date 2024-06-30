import * as fs from 'fs';
import * as path from 'path';
import ProgressBar from 'progress';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import * as unzip from 'unzip-stream';
import { cacheFolder, serverArchive } from './CacheManager';

export class Installer {
  public static async install(version: string, isPreview: boolean = false): Promise<void> {
    const installer = new Installer();
    if (fs.existsSync(serverArchive)) {
      fs.unlinkSync(serverArchive);
    }
    await installer.downloadAndExtractServer(version, isPreview);
  }

  async downloadAndExtractServer(version: string, isPreview: boolean): Promise<void> {
    const platform = process.platform === 'win32' ? 'win' : 'linux';
    const url = `https://minecraft.azureedge.net/bin-${platform}${isPreview?'-preview':''}/bedrock-server-${version}.zip`;
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
    const unzipStream = unzip.Extract({ path: path.join(cacheFolder, './_bedrock_server') });
    await pipeline(
      res.body!,
      progressStream,
      unzipStream,
    );
  }
}