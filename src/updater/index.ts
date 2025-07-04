import { Logger } from '../utils/Logger';
import { CacheManager } from './CacheManager';
import { Installer } from './Installer';
import type { VersionList, ServerBuildInfo, VersionInfo } from './types';
import { askSwitchVersion, askLicense, askVersion, parseCliArgs, printHelp } from './cli';
import { exit } from '../utils/util';
import * as fs from 'fs';
import * as path from 'path';

enum SwitchVersionReason {
  Update = 'updated',
  Switch = 'switched'
}

class ServerUpdater {
  readonly logger = new Logger('Updater', 'yellow');
  cacheManager!: CacheManager;
  private readonly cwd: string;

  versionList: VersionList | undefined;
  
  constructor(cwd: string) {
    this.cwd = cwd;
    this.logger.info('Starting server updater...');    
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
    await Installer.install(versionInfo, this.cacheManager);
    this.logger.info(`Successfully ${reason}: ${this.cacheManager.getVersion()} -> ${versionInfo.version}${versionInfo.isPreview?' (preview)':''}`);
    this.cacheManager.setVersion(versionInfo.version);
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
    return await res.json() as ServerBuildInfo;
  }
}

const options = parseCliArgs();

// Show help and exit if requested
if (options.help) {
  printHelp();
  process.exit(0);
}

// Set the working directory
const resolvedCwd = path.resolve(options.cwd);
if (!fs.existsSync(resolvedCwd)) {
  console.error(`Error: Directory does not exist: ${resolvedCwd}`);
  exit(1);
}

const updater = new ServerUpdater(resolvedCwd);
updater.logger.info(`Working directory: ${resolvedCwd}`);
try {
  await updater.run();
  exit();
} catch(err: any) {
  updater.logger.error(`Error: ${err.message}`);
  if (options.debug) console.error(err?.stack);
  exit(1);
}
