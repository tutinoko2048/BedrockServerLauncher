import { Logger } from '../utils/Logger';
import { CacheManager } from './CacheManager';
import { Installer } from './Installer';
import type { VersionList, ServerBuildInfo, VersionInfo } from './types';
import { askSwitchVersion, askLicense, askVersion } from './cli';
import { exit } from '../utils/util';

enum SwitchVersionReason {
  Update = 'updated',
  Switch = 'switched'
}

class ServerUpdater {
  readonly cacheManager = new CacheManager();
  readonly logger = new Logger('Updater', 'yellow');

  versionList: VersionList | undefined;
  
  constructor() {
    this.logger.info('Starting server updater...');    
  }

  async run(): Promise<void> {
    this.cacheManager.load();

    const { shouldUpdate, latestVersion } = await this.checkUpdate();
    if (shouldUpdate) {
      this.logger.info(`New version available: ${latestVersion}`);
      await this.switchVersion({ version: latestVersion }, SwitchVersionReason.Update);

    } else {
      this.logger.info('bedrock-server is up to date');
      this.logger.info('Would you like to switch the version?');
      if (await askSwitchVersion()) {
        const versionInfo = await askVersion(this.versionList!);
        this.logger.info(`Selected version: ${versionInfo.version}, isPreview: ${versionInfo.isPreview}`);
        await this.switchVersion(versionInfo, SwitchVersionReason.Switch);
      }
    }
  }

  async checkUpdate() {
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
    await this.checkLicense();
    await Installer.install(versionInfo);
    this.logger.info(`Successfully ${reason}: ${this.cacheManager.getVersion()} -> ${versionInfo.version}${versionInfo.isPreview?' (preview)':''}`);
    this.cacheManager.setVersion(versionInfo.version);
  }

  async checkLicense(): Promise<void> {
    if (this.cacheManager.getLicense()) return;
    const result = await askLicense();
    if (!result) throw new Error('\nYou must agree to the Minecraft EULA to use the server');
    this.cacheManager.setLicense(true);
  }

  async fetchBuildInfo(): Promise<ServerBuildInfo> {
    const res = await fetch('https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json');
    return await res.json() as ServerBuildInfo;
  }
}

const isDebug = process.argv.includes('--debug');

const updater = new ServerUpdater();
try {
  await updater.run();
  exit();
} catch(err: any) {
  updater.logger.error(`Error: ${err.message}`);
  if (isDebug) console.error(err?.stack);
  exit(1);
}
