import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const rid = process.platform === 'win32' ? 'win-x64' : process.platform === 'darwin' ? `osx-${process.arch}` : null;
if (!rid) throw new Error(`Package smoke unsupported on ${process.platform}`);
const backend = resolve('artifacts', `backend-${rid}`);
const built = spawnSync('node', ['scripts/package-backend.mjs', rid], { stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);
const made = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-forge', 'package'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (made.status !== 0) process.exit(made.status ?? 1);
const packagedResources = resolve('out', `dungeon-deputy-${process.platform}-${process.arch}`, 'resources');
const packagedBackend = resolve(packagedResources, `backend-${rid}`);
if (!existsSync(resolve(packagedBackend, process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api'))) throw new Error('Packaged backend resource is missing.');
for (const asset of ['index.html', 'public.html', 'scenes/ashen-road.svg', 'scenes/moonlit-fen.svg', 'scenes/old-bridge.svg']) if (!existsSync(resolve(packagedResources, 'dist', asset))) throw new Error(`Packaged renderer resource is missing: ${asset}`);
const token = `smoke-${randomBytes(18).toString('hex')}`;
const port = 29000 + Math.floor(Math.random() * 1000);
const userData = mkdtempSync(resolve(tmpdir(), 'dungeon-deputy-package-smoke-'));
const executable = resolve(packagedBackend, process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api');
const env = { ...process.env, DUNGEON_DEPUTY_PORT: String(port), DUNGEON_DEPUTY_TOKEN: token, DUNGEON_DEPUTY_DATA_DIR: userData };
let child;
async function stopBackend() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolveExit => child.once('exit', resolveExit));
  child.kill();
  await exited;
  child = undefined;
}
async function startBackend() {
  child = spawn(executable, [], { env, stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Published backend exited early (${child.exitCode}).`);
    try { if ((await fetch(`http://127.0.0.1:${port}/health`, { headers: { 'X-Dungeon-Token': token } })).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  if (!ready) throw new Error('Published backend readiness check failed.');
}
const api = async (path, method = 'GET', body) => fetch(`http://127.0.0.1:${port}${path}`, {
  method,
  headers: { 'X-Dungeon-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
try {
  for (const asset of ['tavern.svg', 'hero.svg', 'goblin.svg']) {
    const assetPath = asset === 'tavern.svg' ? 'maps' : 'tokens';
    if (!existsSync(resolve(packagedResources, 'dist', assetPath, asset))) throw new Error(`Packaged map resource is missing: ${asset}`);
  }
  await startBackend();
  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/map`);
  if (unauthorized.status !== 401) throw new Error('Unauthenticated map request did not return 401.');
  let response = await api('/api/map');
  if (!response.ok) throw new Error(`Could not load the packaged demo map: HTTP ${response.status} ${await response.text()}`);
  let state = await response.json();
  if (!state.draft || state.approved !== null || state.draft.image !== 'tavern.svg' || state.draft.tokens.length !== 7) throw new Error('Packaged backend did not seed the expected camelCase tavern draft.');
  if (state.draft.tokens.filter(token => token.kind === 'hero').length !== 4 || state.draft.tokens.filter(token => token.kind === 'monster').length !== 3) throw new Error('Tavern seed must contain four heroes and three goblins.');
  const original = state.draft;
  response = await api('/api/map/draft', 'PUT', original);
  if (!response.ok) throw new Error('Authenticated draft save failed.');
  response = await api('/api/map/show', 'POST');
  if (!response.ok) throw new Error('Explicit Show failed.');
  const approved = (await response.json()).approved;
  if (!approved || approved.image !== 'tavern.svg' || approved.tokens.length !== 7) throw new Error('Show did not create the approved snapshot.');
  let publicPresentation = await (await api('/api/presentation')).json();
  if (publicPresentation.mode !== 'map' || publicPresentation.image !== approved.image || JSON.stringify(publicPresentation.tokens) !== JSON.stringify(approved.tokens)) throw new Error('Show did not update the active public map projection.');

  const editedDraft = {
    ...original,
    gridVisible: !original.gridVisible,
    scale: original.scale + 8,
    tokens: original.tokens.map((token, index) => ({ ...token, x: token.x + 17 + index, y: token.y - 13 - index })),
  };
  response = await api('/api/map/draft', 'PUT', editedDraft);
  if (!response.ok) throw new Error('Edited draft save failed.');
  publicPresentation = await (await api('/api/presentation')).json();
  if (publicPresentation.mode !== 'map' || JSON.stringify(publicPresentation.tokens) !== JSON.stringify(approved.tokens)) throw new Error('Draft edits leaked into the public map before Show.');
  await stopBackend();
  await startBackend();
  response = await api('/api/map');
  if (!response.ok) throw new Error('Could not reload saved state after packaged backend restart.');
  state = await response.json();
  if (JSON.stringify(state.draft) !== JSON.stringify(editedDraft)) throw new Error('Edited camelCase draft, grid, scale, seven tokens, or positions did not survive restart.');
  if (JSON.stringify(state.approved) !== JSON.stringify(approved)) throw new Error('Approved snapshot changed or failed to survive restart independently.');
  response = await api('/api/map/show', 'POST');
  if (!response.ok) throw new Error('Explicit re-Show after restart failed.');
  const republished = (await response.json()).approved;
  if (JSON.stringify(republished) !== JSON.stringify(editedDraft)) throw new Error('Explicit Show did not publish the saved edited draft.');
  publicPresentation = await (await api('/api/presentation')).json();
  if (publicPresentation.mode !== 'map' || JSON.stringify(publicPresentation.tokens) !== JSON.stringify(editedDraft.tokens)) throw new Error('Re-Show did not update the public map projection.');
  console.log(`Packaged ${rid} backend passed authenticated draft/approved restart round-trip in per-run temp user data; macOS outputs remain unverified on this host.`);
} finally {
  await stopBackend();
  rmSync(userData, { recursive: true, force: true });
}
