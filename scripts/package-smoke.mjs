import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const rid = process.platform === 'win32' ? 'win-x64' : process.platform === 'darwin' ? `osx-${process.arch}` : null;
if (!rid) throw new Error(`Package smoke unsupported on ${process.platform}`);
const backend = resolve('artifacts', `backend-${rid}`);
if (!existsSync(resolve(backend, process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api'))) {
  const built = spawnSync('node', ['scripts/package-backend.mjs', rid], { stdio: 'inherit' });
  if (built.status !== 0) process.exit(built.status ?? 1);
}
const made = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-forge', 'package'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (made.status !== 0) process.exit(made.status ?? 1);
const packagedResources = resolve('out', `dungeon-deputy-${process.platform}-${process.arch}`, 'resources');
const packagedBackend = resolve(packagedResources, `backend-${rid}`);
if (!existsSync(resolve(packagedBackend, process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api'))) throw new Error('Packaged backend resource is missing.');
for (const asset of ['index.html', 'public.html', 'scenes/ashen-road.svg', 'scenes/moonlit-fen.svg', 'scenes/old-bridge.svg']) if (!existsSync(resolve(packagedResources, 'dist', asset))) throw new Error(`Packaged renderer resource is missing: ${asset}`);
const token = 'smoke-' + Math.random().toString(36).slice(2);
const port = 29000 + Math.floor(Math.random() * 1000);
const executable = resolve(packagedBackend, process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api');
const child = spawn(executable, [], { env: { ...process.env, DUNGEON_DEPUTY_PORT: String(port), DUNGEON_DEPUTY_TOKEN: token }, stdio: 'ignore' });
try {
  let ready = false;
  for (let i = 0; i < 75; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/health`, { headers: { 'X-Dungeon-Token': token } })).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 200)); }
  if (!ready) throw new Error('Published backend readiness check failed.');
  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/presentation`);
  const authorized = await fetch(`http://127.0.0.1:${port}/api/presentation`, { headers: { 'X-Dungeon-Token': token } });
  if (unauthorized.status !== 401 || !authorized.ok) throw new Error('Backend token boundary smoke check failed.');
  for (const asset of ['ashen-road.svg', 'moonlit-fen.svg', 'old-bridge.svg']) if (!existsSync(resolve('src/renderer/dist/scenes', asset))) throw new Error(`Missing scene resource ${asset}`);
  console.log(`Package/resource smoke passed for ${rid}; macOS outputs remain unverified on this host.`);
} finally { child.kill(); }
