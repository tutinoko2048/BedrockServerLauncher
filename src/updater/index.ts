import { Logger } from '../utils/Logger';
import { CacheManager } from './CacheManager';
import { Installer } from './Installer';
import type { VersionList } from './types';
import { askSwitchVersion, askLicense, askVersion } from './cli';

const logger = new Logger('Updater', 'yellow');
logger.info('Starting server updater...');

const cacheManager = new CacheManager();

checkUpdate().catch((err) => {
  logger.error(`Failed to update server: ${err}`);
  console.error(err?.stack)
  process.exit(1);
});

async function checkUpdate() {
  const versionList = await fetchVersionList();
  const os = process.platform === 'win32' ? 'windows' : 'linux';
  const latestVersion = versionList[os].stable;

  if (cacheManager.shouldUpdate(latestVersion)) {
    logger.info(`New version available: ${latestVersion}`);

    if (!cacheManager.getLicense()) {
      const result = await askLicense();
      if (!result) {
        logger.error('You must agree to the Minecraft EULA to use the server');
        process.exit(1);
      }
      cacheManager.setLicense(true);
    }

    await Installer.install(latestVersion);
    logger.info(`Successfully updated: ${cacheManager.getVersion()} -> ${latestVersion}`);
    cacheManager.setVersion(latestVersion);
  } else {
    logger.info('bedrock-server is up to date');

    logger.info('Would you like to switch the version?');
    if (await askSwitchVersion()) {
      const { version, isPreview } = await askVersion(versionList[os]);
      logger.info(`Selected version: ${version}, isPreview: ${isPreview}`);
      await Installer.install(version, isPreview);
      logger.info(`Successfully switched: ${cacheManager.getVersion()} -> ${version}`);
      cacheManager.setVersion(version);
    }
  }
}

async function fetchVersionList(): Promise<VersionList> {
  const res = await fetch('https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json');
  const data = await res.json() as VersionList;
  return data;
}