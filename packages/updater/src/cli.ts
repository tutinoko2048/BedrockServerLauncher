import { select, confirm, search } from '@inquirer/prompts';
import { Command } from 'commander';
import ora from 'ora';
import * as pc from 'picocolors';
import type { VersionInfo, VersionList } from './types';
import packageJson from '../package.json';

export interface UpdaterOptions {
  cwd: string;
  debug: boolean;
}

export function createProgram(): Command {
  const program = new Command();
  
  program
    .name('bds-updater')
    .description(`🏗️   ${pc.bold(pc.cyan('Bedrock Server Updater'))} - Update and manage Minecraft Bedrock Dedicated Server`)
    .version(packageJson.version, '-v --version')
    .option('-c, --cwd <path>', 'Set the working directory', process.cwd())
    .option('--debug', 'Enable debug mode', false)
    .helpOption('-h, --help', 'Show this help message')
    .addHelpText('after', [
      `${pc.bold('Examples:')}`,
      `  bds-updater`,
      `  bds-updater --cwd /path/to/server`,
      `  bds-updater -c "C:\\MinecraftServer" --debug`
    ].join('\n'));

  return program;
}

export function parseCliArgs(): UpdaterOptions {
  const program = createProgram();
  program.parse();
  const options = program.opts();
  
  return {
    cwd: options.cwd,
    debug: options.debug
  };
}

export async function askLicense(): Promise<boolean> {
  console.log('');
  console.log(pc.yellow('📜 Minecraft End User License Agreement'));
  console.log('By using Minecraft Bedrock Server, you agree to the EULA:');
  console.log(pc.underline('https://minecraft.net/eula'));
  console.log('');

  return await confirm({
    message: 'Do you agree to the Minecraft EULA?',
    default: false,
  });
}

export enum UpgradeChoice {
  Update = 'update',
  Switch = 'switch',
  Nothing = 'nothing',
}

export enum SwitchChoice {
  Switch = 'switch',
  Nothing = 'nothing',
}

export async function askUpgradeVersion(): Promise<UpgradeChoice> {
  const choices = [
    {
      name: '🔄 Update to latest version',
      value: UpgradeChoice.Update,
      description: 'Download and install the latest version',
    },
    {
      name: '🔁 Switch to different version',
      value: UpgradeChoice.Switch,
      description: 'Choose a specific version to install',
    },
    {
      name: '❌ Do nothing',
      value: UpgradeChoice.Nothing,
      description: 'Keep current version and exit',
    },
  ];

  return await select({
    message: 'What would you like to do?',
    choices,
  });
}

export async function askSwitchVersion(): Promise<SwitchChoice> {
  const choices = [
    {
      name: '🔁 Switch to different version',
      value: SwitchChoice.Switch,
      description: 'Choose a specific version to install',
    },
    {
      name: '❌ Do nothing',
      value: SwitchChoice.Nothing,
      description: 'Keep current version and exit',
    },
  ];

  return await select({
    message: 'What would you like to do?',
    choices,
  });
}

export async function askVersion(versionEntry: VersionList): Promise<VersionInfo> {
  console.log('');
  console.log(pc.cyan('🎯 Version Selection'));

  const selected = await select({
    message: 'Choose installation option:',
    choices: [
      {
        name: `📦 Latest Stable  ${pc.dim(`(${versionEntry.stable})`)}`,
        value: 'stable',
        description: 'Install the latest stable release',
      },
      {
        name: `🧪 Latest Preview ${pc.dim(`(${versionEntry.preview})`)}`,
        value: 'preview',
        description: 'Install the latest preview/beta release',
      },
      {
        name: '📋 Select Stable Version',
        value: 'stable-select',
        description: 'Choose from available stable versions',
      },
      {
        name: '🔬 Select Preview Version',
        value: 'preview-select',
        description: 'Choose from available preview versions',
      },
    ],
  });

  let version: string;
  let isPreview: boolean;

  if (selected === 'stable' || selected === 'preview') {
    version = versionEntry[selected];
    isPreview = selected === 'preview';

    console.log(pc.green(`✓ Selected: ${version}${isPreview ? ' (preview)' : ''}`));
  } else {
    const versions = versionEntry.versions;
    const previewVersions = versionEntry.preview_versions;
    const allVersions = selected === 'stable-select' ? versions : previewVersions;

    version = await selectVersionWithAutocomplete(allVersions);
    isPreview = selected === 'preview-select';
  }

  return { version, isPreview };
}

const MANUAL = '__manual__';

async function selectVersionWithAutocomplete(versions: string[]): Promise<string> {
  const reversedVersions = versions.toReversed();
  const recentVersions = reversedVersions.slice(0, 8);

  // Create choices with recent versions + option to enter manually
  const choices = [
    {
      name: pc.dim('💡 Enter version manually...'),
      value: MANUAL,
    },
    ...recentVersions.map((version) => ({
      name: `${version} ${reversedVersions.indexOf(version) === 0 ? pc.green('(latest)') : ''}`,
      value: version,
    })),
  ];

  const selectedVersion = await select({
    message: 'Select version:',
    choices,
    pageSize: choices.length,
    default: recentVersions[0],
  });

  if (selectedVersion !== MANUAL) return selectedVersion;

  const manualVersion = await search({
    message: 'Enter version manually:',
    source(msg) {
      if (!msg?.trim()) return recentVersions;

      const filtered = reversedVersions.filter((v) => v.toLowerCase().includes(msg.toLowerCase()));
      return filtered;
    },
    validate(value: string) {
      if (!value.trim()) return 'Please enter a version.';
      if (!versions.includes(value.trim())) return `Version "${value.trim()}" not found.`;
      return true;
    },
    pageSize: 8,
  });

  return manualVersion.trim();
}

export function createSpinner(text: string) {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan',
  });
}

export function formatSuccess(message: string): string {
  return pc.green(`✅ ${message}`);
}

export function formatError(message: string): string {
  return pc.red(`❌ ${message}`);
}

export function formatInfo(message: string): string {
  return pc.blue(`ℹ️  ${message}`);
}

export function formatWarning(message: string): string {
  return pc.yellow(`⚠️  ${message}`);
}
