import type { VersionEntry } from './types';
import cliSelect from 'cli-select';
import color from 'colors-cli/safe';
import { askUntilValid } from '../utils/ask';

export async function askLicense(): Promise<boolean> {
  console.log('Do you agree to the Minecraft EULA? (https://minecraft.net/eula)');
  const res_ = await cliSelect({
    values: ['yes', 'no'],
    selected: '[x]',
    unselected: '[ ]',
    defaultValue: 1,
    valueRenderer: (value, selected) => selected ? color.underline(value) : value,
  });
  return res_.value === 'yes';
}

export async function askSwitchVersion() {
  const res = await cliSelect({
    values: ['yes', 'no'],
    selected: '[x]',
    unselected: '[ ]',
    valueRenderer: (value, selected) => selected ? color.underline(value) : value,
  });
  return res.value === 'yes';
}

const typeOptions = {
  "stable": "stable-latest",
  "preview": "preview-latest",
  "stable-select": "stable (select version)",
  "preview-select": "preview (select version)"
}

export async function askVersion(versionEntry: VersionEntry): Promise<{ version: string, isPreview: boolean }> {
  console.log('install options:');
  const res = await cliSelect({
    values: typeOptions,
    selected: '[x]',
    unselected: '[ ]',
    valueRenderer: (value, selected) => selected ? color.underline(value) : value,
  });
  const selected = res.id;
  console.log(`-- ${selected}`);

  let version: string;
  let isPreview: boolean;
  if (selected === 'stable' || selected === 'preview') {
    // @ts-ignore
    version = versionEntry[selected];
    isPreview = selected === 'preview';
  } else {
    const versions = versionEntry.versions;
    const previewVersions = versionEntry.preview_versions;
    const allVersions = selected === 'stable-select' ? versions : previewVersions;
    version = await selectVersion(allVersions);
    isPreview = selected === 'preview-select';
  }
  return { version, isPreview };
}

async function selectVersion(versions: string[]) {
  const options = {
    ...Object.fromEntries(versions.toReversed().slice(0, 10).map((v) => [v, v])),
    'enter': 'Enter a version manually'
  }

  console.log('versions:');
  const res = await cliSelect({
    values: options,
    selected: '[x]',
    unselected: '[ ]',
    valueRenderer: (value, selected) => selected ? color.underline(value) : value,
  });
  if (res.id === 'enter') {
    const answer = await askUntilValid({
      question: 'Enter a version',
      validValues: (v) => versions.includes(v),
      invalidMessage: 'Invalid version, please try again\n'
    });
    return answer;
  }
  console.log(`-- ${res.id}`);
  return res.id as string;
}
