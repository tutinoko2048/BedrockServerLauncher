import * as fs from 'fs';
import * as path from 'path';
import * as pc from 'picocolors';
import { CacheManager } from './CacheManager';
import { Installer } from './Installer';
import type { VersionList, ServerBuildInfo, VersionInfo } from './types';
import {
  askAction,
  askLicense,
  askVersion,
  parseCliArgs,
  createSpinner,
  formatSuccess,
  formatError,
  formatInfo,
  Action,
} from './cli';

enum SwitchVersionReason {
  Update = 'updated',
  Switch = 'switched',
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
    const { updateAvailable, latestVersion } = await this.checkUpdate();
    spinner.stop();

    if (updateAvailable) {
      console.log(formatInfo(`New version available: ${pc.bold(latestVersion)}`));
    } else {
      console.log(
        formatSuccess(`Bedrock server is up to date! ${pc.dim(`(${this.cacheManager.getVersion()})`)}`)
      );
    }
    console.log();

    const action = await askAction(updateAvailable);
    switch (action) {
      case Action.Update:
        await this.switchVersion({ version: latestVersion }, SwitchVersionReason.Update);
        break;
      case Action.Switch:
        const versionInfo = await askVersion(this.versionList!);
        console.log(
          formatInfo(`Selected: ${versionInfo.version}${versionInfo.isPreview ? ' (preview)' : ''}`)
        );
        await this.switchVersion(versionInfo, SwitchVersionReason.Switch);
        break;
      case Action.Nothing:
        console.log(formatInfo('No changes made.'));
        break;
    }
  }

  async checkUpdate() {
    this.init();
    const buildInfo = await this.fetchBuildInfo();
    const os = process.platform === 'win32' ? 'windows' : 'linux';
    this.versionList = buildInfo[os];
    const latestVersion = this.versionList.stable;
    return {
      updateAvailable: this.cacheManager.updateAvailable(latestVersion),
      latestVersion,
    };
  }

  async switchVersion(versionInfo: VersionInfo, reason: SwitchVersionReason) {
    this.init();
    await this.checkLicense();

    console.log('');
    console.log(
      formatInfo(`Installing ${versionInfo.version}${versionInfo.isPreview ? ' (preview)' : ''}...`)
    );

    await Installer.install(versionInfo, this.cacheManager);

    const oldVersion = this.cacheManager.getVersion();
    this.cacheManager.setVersion(versionInfo.version);

    console.log('');
    console.log(
      formatSuccess(
        `Successfully ${reason}: ${pc.dim(oldVersion)} → ${pc.bold(versionInfo.version)}${
          versionInfo.isPreview ? pc.yellow(' (preview)') : ''
        }`
      )
    );
  }

  async checkLicense(): Promise<void> {
    this.init();
    if (this.cacheManager.getLicense()) return;
    const result = await askLicense();
    if (!result) throw new Error('\nYou must agree to the EULA and Privacy Statement to use the server');
    this.cacheManager.setLicense(true);
  }

  async fetchBuildInfo(): Promise<ServerBuildInfo> {
    const res = await fetch('https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json');
    if (!res.ok) {
      throw new Error(`Failed to fetch version information: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as ServerBuildInfo;
  }
}

export async function main(): Promise<number> {
  const options = parseCliArgs();
  const resolvedCwd = path.resolve(options.cwd);

  console.log(pc.bold(pc.cyan('🚀 Bedrock Server Updater')));
  console.log('');

  if (!fs.existsSync(resolvedCwd)) {
    console.error(formatError(`Directory does not exist: ${resolvedCwd}`));
    return 1;
  }

  const updater = new ServerUpdater(resolvedCwd);
  try {
    await updater.run();
    console.log('');
    console.log(pc.green('🎉 All done!'));
    return 0;

  } catch (err: any) {
    console.error('');
    console.error(formatError(err.message));
    if (options.debug) {
      console.error(pc.dim('\nStack trace:'));
      console.error(pc.dim(err.stack));
    }
    return 1;
  }
}
