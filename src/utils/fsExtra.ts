import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function safeRename(src: string, dst: string): Promise<void> {
  try {
    const parentDir = path.dirname(dst);
    await fs.mkdir(parentDir, { recursive: true });

    const stats = await fs.stat(dst);
    if (stats.isDirectory()) {
      await fs.rm(dst, { recursive: true, force: true });
    } else {
      await fs.unlink(dst);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  await fs.rename(src, dst);
}
