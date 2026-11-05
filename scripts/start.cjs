const { spawn } = require('node:child_process');
const path = require('node:path');
const api = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.cjs')], {
  stdio: 'inherit',
  windowsHide: true,
});
const expo = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'start', '--go', ...process.argv.slice(2)],
  { stdio: 'inherit', windowsHide: true }
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  expo.kill();
  process.exitCode = code;
}
api.on('exit', code => stop(code || 0));
expo.on('exit', code => stop(code || 0));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
