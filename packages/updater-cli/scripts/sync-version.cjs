#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// updater-coreのバージョンを取得
const corePackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../updater-core/package.json'), 'utf8')
);

// 現在のpackage.jsonを読み込み
const currentPackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

// バージョンを更新
currentPackageJson.version = corePackageJson.version;

// ファイルに書き戻し
fs.writeFileSync(
  path.join(__dirname, '../package.json'),
  JSON.stringify(currentPackageJson, null, 2) + '\n'
);

console.log(`Version updated to ${corePackageJson.version}`);
