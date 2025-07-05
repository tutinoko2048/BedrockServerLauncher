import pc from 'picocolors';

export function exit(code: number = 0) {
  console.log(pc.italic(pc.dim('\nPress any key to exit...')));
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, code));
}
