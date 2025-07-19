#!/usr/bin/env node

import { main } from '@bds-utils/updater-core';

async function run() {
  try {
    const status = await main();
    process.exit(status);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
