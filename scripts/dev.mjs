import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const build = spawnSync(npm, ['run', 'build:electron'], { stdio: 'inherit', shell: isWindows });
if (build.status !== 0) process.exit(build.status ?? 1);

const vite = spawn(process.execPath, [
  resolve('node_modules/vite/bin/vite.js'),
  '--host', '127.0.0.1', '--port', '5173', '--strictPort',
], { stdio: 'inherit' });
const children = [vite];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (isWindows && child.pid) {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = code;
}

async function waitForRenderer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (vite.exitCode !== null) throw new Error(`Vite exited before becoming ready (${vite.exitCode}).`);
    try {
      const response = await fetch('http://127.0.0.1:5173/index.html');
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200));
  }
  throw new Error('Vite did not serve the DM dashboard on port 5173 within 15 seconds.');
}

vite.once('error', error => {
  console.error('Could not start the Vite development server:', error);
  shutdown(1);
});

try {
  await waitForRenderer();
} catch (error) {
  console.error(error);
  shutdown(1);
  process.exit(1);
}

const electronBinary = isWindows
  ? resolve('node_modules/electron/dist/electron.exe')
  : process.platform === 'darwin'
    ? resolve('node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
    : resolve('node_modules/electron/dist/electron');
const electron = spawn(electronBinary, ['.'], { stdio: 'inherit' });
children.push(electron);
electron.once('error', error => {
  console.error('Could not start the Electron desktop host:', error);
  shutdown(1);
});
vite.once('exit', code => {
  if (!shuttingDown) shutdown(code === 0 ? 1 : code ?? 1);
});
electron.once('exit', code => shutdown(code ?? 0));
process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
