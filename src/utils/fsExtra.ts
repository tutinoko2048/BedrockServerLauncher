import * as fs from 'fs-extra';
import * as path from 'node:path';

export async function safeRename(src: string, dst: string): Promise<void> {
  const parentDir = path.dirname(dst);
  await fs.ensureDir(parentDir);
  
  // Remove destination if it exists
  if (await fs.pathExists(dst)) {
    await fs.remove(dst);
  }
  
  await fs.move(src, dst);
}

export async function safeCopy(src: string, dst: string): Promise<void> {
  const parentDir = path.dirname(dst);
  await fs.ensureDir(parentDir);
  
  // Remove destination if it exists
  if (await fs.pathExists(dst)) {
    await fs.remove(dst);
  }
  
  await fs.copy(src, dst);
}
