import * as path from 'node:path';

// updater-coreのバージョンを取得
const corePackageFile = Bun.file(path.join(__dirname, '../../updater-core/package.json'));
const corePackageJson = await corePackageFile.json();

// 現在のpackage.jsonを読み込み
const currentPackageFile = Bun.file(path.join(__dirname, '../package.json'));
const currentPackageJson = await currentPackageFile.json();

// バージョンを更新
currentPackageJson.version = corePackageJson.version;

// ファイルに書き戻し
await currentPackageFile.write(JSON.stringify(currentPackageJson, null, 2) + '\n');

console.log(`Version updated to ${corePackageJson.version}`);
