import { Logger } from '../utils/Logger';
import { CacheManager } from './CacheManager';
import { Installer } from './Installer';
import type { VersionList, ServerBuildInfo, VersionInfo } from './types';
import { askSwitchVersion, askLicense, askVersion } from './cli';

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
    this.cacheManager.setVersion(versionInfo.version);
    this.logger.info(`Successfully ${reason}: ${this.cacheManager.getVersion()} -> ${versionInfo.version}${versionInfo.isPreview?' (preview)':''}`);
  }

  async checkLicense() {
    if (this.cacheManager.getLicense()) return;
    const result = await askLicense();
    if (!result) {
      this.logger.error('You must agree to the Minecraft EULA to use the server');
      process.exit(1);
    }
    this.cacheManager.setLicense(true);
  }

  async fetchBuildInfo(): Promise<ServerBuildInfo> {
    const res = await fetch('https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json');
    return await res.json() as ServerBuildInfo;
  }
}

const updater = new ServerUpdater();
try {
  await updater.run();
} catch(err: any) {
  updater.logger.error(`Failed to update server: ${err}`);
  console.error(err?.stack)
  process.exit(1);
}
