import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { jsonc } from 'jsonc';

export interface MergeInfo {
  onFile?: (newPath: string, serverFolder: string) => Promise<string>;
  //onDirectory?: (path: string) => Promise<boolean>;
}

export const serverPropertiesMerger: MergeInfo = {
  async onFile(newPath, serverFolder) {
    const newPropertiesFile = await fs.readFile(newPath, 'utf-8');
    let oldPropertiesFile = await fs.readFile(path.join(serverFolder, 'server.properties'), 'utf-8').catch(() => undefined);
    if (!oldPropertiesFile) return newPropertiesFile;

    const newProperties = ServerProperties.parse(newPropertiesFile);
    const oldProperties = ServerProperties.parse(oldPropertiesFile);

    for (const [key, value] of Object.entries(newProperties)) {
      if (key in oldProperties) continue;
      oldPropertiesFile += `\n${key}=${value}\n`; // add missing properties
    }

    return oldPropertiesFile;
  }
}

namespace ServerProperties {
  export function parse(str: string) {
    const properties: Record<string, string> = {};
    for (const line of str.split('\n')) {
      const result = line.match(/^\s*(?!#)(?<key>[^=]+)=(?<value>[^\#]*)/)
      if (!result?.groups) continue;
      const { key, value } = result.groups;
      if (!key || !value) continue;
      properties[key.trim()] = value.trim();
    }
    return properties;
  }
}

type PermissionsJson = {
  allowed_modules: string[];
}

export const permissionsJsonMerger: MergeInfo = {
  async onFile(newPath, serverFolder) {
    const newPermissionsFile = await fs.readFile(newPath, 'utf-8');
    let oldPermissionsFile = await fs.readFile(path.join(serverFolder, 'config/default/permissions.json'), 'utf-8').catch(() => undefined);
    if (!oldPermissionsFile) return newPermissionsFile;
    const newPermissions: PermissionsJson = jsonc.parse(newPermissionsFile);
    const oldPermissions: PermissionsJson = jsonc.parse(oldPermissionsFile);
    const allowed_modules = [...new Set([...oldPermissions.allowed_modules, ...newPermissions.allowed_modules])];
    return jsonc.stringify({ allowed_modules }, { space: 2 });
  }
}