import { spawn } from 'node:child_process';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
function start(cmd, args) { const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' }); children.push(child); child.on('exit', code => { if (code && code !== 0) shutdown(code); }); }
function shutdown(code = 0) { for (const child of children) if (!child.killed) child.kill(); process.exit(code); }
start(npm, ['run', 'build:electron']);
await new Promise(r => setTimeout(r, 1200));
start(npm, ['run', 'dev:renderer']);
await new Promise(r => setTimeout(r, 2000));
start(npm, ['run', 'dev:electron']);
process.on('SIGINT', () => shutdown()); process.on('SIGTERM', () => shutdown());
