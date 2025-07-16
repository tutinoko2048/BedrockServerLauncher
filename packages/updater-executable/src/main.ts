import { main } from '@bds-utils/updater'
import pc from 'picocolors';

function exit(code: number = 0) {
  console.log(pc.italic(pc.dim('\nPress any key to exit...')));
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, code));
}

const status = await main();

exit(status);
