export function exit(code: number = 0) {
  console.log('\x1b[3m\nPress any key to exit...\x1b[0m');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, code));
}
