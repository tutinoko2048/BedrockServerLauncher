import * as fs from 'fs';
import * as path from 'path';
import * as pc from 'picocolors';
import { CacheManager } from './CacheManager';
import { Installer } from './Installer';
import type { VersionList, ServerBuildInfo, VersionInfo } from './types';
import { askSwitchVersion, askUpgradeVersion, askLicense, askVersion, parseCliArgs, createSpinner, formatSuccess, formatError, formatInfo, UpgradeChoice, SwitchChoice } from './cli';
import { exit } from './utils/util';

enum SwitchVersionReason {
  Update = 'updated',
  Switch = 'switched'
}

class ServerUpdater {
  cacheManager!: CacheManager;
  private readonly cwd: string;

  versionList: VersionList | undefined;
  
  constructor(cwd: string) {
    this.cwd = cwd;
    console.log(pc.dim(`- Working directory: ${cwd}`));
  }

  private init() {
    if (!this.cacheManager) {
      this.cacheManager = new CacheManager(this.cwd);
      this.cacheManager.init();
    }
  }

  async run(): Promise<void> {
    this.init();
    this.cacheManager.load();

    console.log('');
    const spinner = createSpinner('Checking for updates...');
    spinner.start();
    
    const { shouldUpdate, latestVersion } = await this.checkUpdate();
    spinner.stop();
    
    if (shouldUpdate) {
      console.log(formatInfo(`New version available: ${pc.bold(latestVersion)}`));
      console.log();

      const choice = await askUpgradeVersion();
      
      switch (choice) {
        case UpgradeChoice.Update:
          await this.switchVersion({ version: latestVersion }, SwitchVersionReason.Update);
          break;
        case UpgradeChoice.Switch:
          const versionInfo = await askVersion(this.versionList!);
          console.log(formatInfo(`Selected: ${versionInfo.version}${versionInfo.isPreview ? ' (preview)' : ''}`));
          await this.switchVersion(versionInfo, SwitchVersionReason.Switch);
          break;
        case UpgradeChoice.Nothing:
          console.log(formatInfo('No changes made.'));
          break;
      }
    } else {
      console.log(`${formatSuccess('Bedrock server is up to date!')} ${pc.dim(`(${this.cacheManager.getVersion()})`)}`);
      console.log();
      const choice = await askSwitchVersion();
      
      switch (choice) {
        case SwitchChoice.Switch:
          const versionInfo = await askVersion(this.versionList!);
          console.log(formatInfo(`Selected: ${versionInfo.version}${versionInfo.isPreview ? ' (preview)' : ''}`));
          await this.switchVersion(versionInfo, SwitchVersionReason.Switch);
          break;
        case SwitchChoice.Nothing:
          console.log(formatInfo('No changes made.'));
          break;
      }
    }
  }

  async checkUpdate() {
    this.init();
    const buildInfo = await this.fetchBuildInfo();
    const os = process.platform === 'win32' ? 'windows' : 'linux';
    this.versionList = buildInfo[os];
    const latestVersion = this.versionList.stable;
    return {
      shouldUpdate: this.cacheManager.shouldUpdate(latestVersion),
      latestVersion
    }
  }

  async switchVersion(versionInfo: VersionInfo, reason: SwitchVersionReason) {
    this.init();
    await this.checkLicense();
    
    console.log('');
    console.log(formatInfo(`Installing ${versionInfo.version}${versionInfo.isPreview ? ' (preview)' : ''}...`));
    
    await Installer.install(versionInfo, this.cacheManager);
    
    const oldVersion = this.cacheManager.getVersion();
    this.cacheManager.setVersion(versionInfo.version);
    
    console.log('');
    console.log(formatSuccess(`Successfully ${reason}: ${pc.dim(oldVersion)} → ${pc.bold(versionInfo.version)}${versionInfo.isPreview ? pc.yellow(' (preview)') : ''}`));
  }

  async checkLicense(): Promise<void> {
    this.init();
    if (this.cacheManager.getLicense()) return;
    const result = await askLicense();
    if (!result) throw new Error('\nYou must agree to the Minecraft EULA to use the server');
    this.cacheManager.setLicense(true);
  }

  async fetchBuildInfo(): Promise<ServerBuildInfo> {
    const res = await fetch('https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json');
    if (!res.ok) {
      throw new Error(`Failed to fetch version information: ${res.status} ${res.statusText}`);
    }
    return await res.json() as ServerBuildInfo;
  }
}

const options = parseCliArgs();

// Set the working directory
const resolvedCwd = path.resolve(options.cwd);
let hasError = false;

console.log(pc.bold(pc.cyan('🚀 Bedrock Server Updater')));
console.log('');

if (!fs.existsSync(resolvedCwd)) {
  console.error(formatError(`Directory does not exist: ${resolvedCwd}`));
  hasError = true;
  exit(1);
} else {
  const updater = new ServerUpdater(resolvedCwd);
  try {
    await updater.run();
    console.log('');
    console.log(pc.green('🎉 All done!'));
    exit();
  } catch(err: any) {
    console.error('');
    console.error(formatError(err.message));
    if (options.debug) {
      console.error(pc.dim('\nStack trace:'));
      console.error(pc.dim(err?.stack));
    }
    exit(1);
  }
}
