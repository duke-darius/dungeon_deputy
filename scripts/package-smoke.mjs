import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const rid = process.platform === 'win32' ? 'win-x64' : process.platform === 'darwin' ? `osx-${process.arch}` : null;
if (!rid) throw new Error(`Package smoke unsupported on ${process.platform}`);
mkdirSync('artifacts', { recursive: true });
const buildRoot = mkdtempSync(resolve('artifacts', 'package-smoke-build-'));
const buildEnv = { ...process.env, DUNGEON_DEPUTY_BACKEND_ROOT: buildRoot };
const built = spawnSync('node', ['scripts/package-backend.mjs', rid], { stdio: 'inherit', env: buildEnv });
if (built.status !== 0) { rmSync(buildRoot, { recursive: true, force: true }); process.exit(built.status ?? 1); }
const made = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-forge', 'package'], { stdio: 'inherit', shell: process.platform === 'win32', env: buildEnv });
if (made.status !== 0) { rmSync(buildRoot, { recursive: true, force: true }); process.exit(made.status ?? 1); }
const packagedResources = resolve('out', `dungeon-deputy-${process.platform}-${process.arch}`, 'resources');
const packagedBackend = resolve(packagedResources, `backend-${rid}`);
if (!existsSync(resolve(packagedBackend, process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api'))) throw new Error('Packaged backend resource is missing.');
const srdDir = resolve(packagedBackend, 'assets', 'srd', '2024');
for (const file of ['records.json', 'manifest.json', 'coverage.json', 'attribution.md']) if (!existsSync(resolve(srdDir, file))) throw new Error(`Packaged SRD catalog resource is missing: ${file}`);
const manifest = JSON.parse(readFileSync(resolve(srdDir, 'manifest.json'), 'utf8'));
const packagedRecords = JSON.parse(readFileSync(resolve(srdDir, 'records.json'), 'utf8'));
if (manifest.release !== '5.2.1' || !packagedRecords.some(record => record.category === 'monster' && record.name === 'Bandit')) throw new Error('Packaged SRD catalog manifest/records are invalid.');
const bundledDefaults = [
  ['book-open.wav', '6254CBE36FBBEED7A23273634B5EC16FA0C31B0DF112ADCCA477AE896CE7B4EF'],
  ['door-opens.wav', 'A8546AC2AA488EE411C2641E5F860689133BBCDF91E8FB018C6AAEAC1A4329F2'],
  ['coins-handled.wav', '9EF4D312AB28D3E305B854635DB0E0B4126C795A056CB95DC5C36CA1C5ABDBFE'],
];
for (const [name, expectedHash] of bundledDefaults) {
  const file = resolve(packagedResources, 'audio-defaults', name);
  if (!existsSync(file)) throw new Error(`Packaged audio default is missing: ${name}`);
  const bytes = readFileSync(file);
  let format;
  let dataBytes = 0;
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Packaged audio default is not WAV: ${name}`);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > bytes.length) throw new Error(`Packaged audio WAV chunk exceeds file bounds: ${name}`);
    const type = bytes.toString('ascii', offset, offset + 4);
    if (type === 'fmt ') format = bytes.subarray(start, start + size);
    if (type === 'data') dataBytes += size;
    offset = start + size + (size & 1);
  }
  if (bytes.length > 2 * 1024 * 1024 || !format || format.length < 16 || format.readUInt16LE(0) !== 1 || format.readUInt16LE(14) !== 16 || dataBytes === 0 || !format.readUInt32LE(8)) throw new Error(`Packaged audio default is not compact PCM WAV: ${name}`);
  if (createHash('sha256').update(bytes).digest('hex').toUpperCase() !== expectedHash.toUpperCase()) throw new Error(`Packaged audio default hash differs from provenance: ${name}`);
}
if (!existsSync(resolve(packagedResources, 'audio-defaults', 'README.md')) || !existsSync(resolve(packagedResources, 'audio-defaults', 'License.txt'))) throw new Error('Packaged audio default provenance/license is missing.');
const publicHtml = readFileSync(resolve('src/renderer/dist/public.html'),'utf8');
if (!/img-src data:/.test(publicHtml) || /img-src[^;]*'self'/.test(publicHtml) || !/connect-src ws:\/\/127\.0\.0\.1:5173/.test(publicHtml) || !/frame-src 'none'/.test(publicHtml) || !/object-src 'none'/.test(publicHtml)) throw new Error('Public CSP must deny same-origin/network images, same-origin fetch, frames, and objects while allowing only the Vite HMR websocket.');
for (const asset of ['index.html', 'public.html', 'player.html', 'scenes/ashen-road.svg', 'scenes/moonlit-fen.svg', 'scenes/old-bridge.svg']) if (!existsSync(resolve(packagedResources, 'dist', asset))) throw new Error(`Packaged renderer resource is missing: ${asset}`);
const playerHtml = readFileSync(resolve(packagedResources, 'dist', 'player.html'), 'utf8');
const playerEntry = playerHtml.match(/src="\/assets\/(player-[A-Za-z0-9_-]+\.js)"/)?.[1];
if (!playerEntry) throw new Error('Packaged player HTML has no isolated hashed browser entry.');
const playerBundlePath = resolve(packagedResources, 'dist', 'assets', playerEntry);
if (!existsSync(playerBundlePath)) throw new Error('Packaged player entry bundle is missing.');
const playerBundle = readFileSync(playerBundlePath, 'utf8');
const signalRChunk = playerBundle.match(/HubConnectionBuilder-[A-Za-z0-9_-]+\.js/)?.[0];
if (signalRChunk ? !existsSync(resolve(packagedResources, 'dist', 'assets', signalRChunk)) : !(playerBundle.includes('HubConnectionBuilder') && playerBundle.includes('WebSocket') && playerBundle.includes('/api/player/hub'))) throw new Error('Packaged player SignalR runtime or Hub connection is missing.');
if (/DUNGEON_DEPUTY_TOKEN|X-Dungeon-Token|\/api\/(?:characters|encounter|map)/i.test(playerBundle) || /e2e-player-|player-api-test-token|desktop-shared-test-token/.test(playerBundle)) throw new Error('Packaged player entry contains a desktop credential, private DM route, or test secret.');
const listenerSource = readFileSync(resolve('src/backend/PlayerSessions/PlayerListenerService.cs'), 'utf8');
if (!/ContentSecurityPolicy = \$"default-src 'none'/.test(listenerSource) || !/connect-src 'self' \{websocketOrigin\}/.test(listenerSource)) throw new Error('Player LAN host must set restrictive CSP with only its bound WebSocket origin.');
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
const publicTokens = tokens => tokens.map(({ id, name, kind, color, x, y, artwork }) => ({ id, name, kind, color, x, y, artwork }));
const crc32 = bytes => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320); } return (crc ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const name = Buffer.from(type); const size = Buffer.alloc(4); size.writeUInt32BE(data.length); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([size, name, data, sum]); };
const pngData = () => { const header = Buffer.alloc(13); header.writeUInt32BE(1200,0); header.writeUInt32BE(760,4); header[8]=8; header[9]=6; const rows=Buffer.alloc(760*(1+1200*4)); for(let y=0;y<760;y++){ const row=y*(1+1200*4); rows[row]=0; for(let x=0;x<1200;x++) rows.fill(0, row+1+x*4, row+1+x*4+4); } const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]); return `data:image/png;base64,${bytes.toString('base64')}`; };
const imageData = pngData();
try {
  for (const asset of ['tavern.svg', 'hero.svg', 'goblin.svg']) {
    const assetPath = asset === 'tavern.svg' ? 'maps' : 'tokens';
    if (!existsSync(resolve(packagedResources, 'dist', assetPath, asset))) throw new Error(`Packaged map resource is missing: ${asset}`);
  }
  await startBackend();
  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/map`);
  if (unauthorized.status !== 401) throw new Error('Unauthenticated map request did not return 401.');
  let response = await api('/api/srd/search?category=monster');
  if (!response.ok) throw new Error(`Packaged bundled SRD search failed: HTTP ${response.status}`);
  const catalog = await response.json();
  const bandit = catalog.records.find(record => record.name === 'Bandit');
  if (!bandit || bandit.provenance.sourceHash !== `sha256:${manifest.source.sha256}`) throw new Error('Bundled catalog search failed or source hash differs from manifest.');
  response = await api('/api/map');
  if (!response.ok) throw new Error(`Could not load the packaged demo map: HTTP ${response.status} ${await response.text()}`);
  let state = await response.json();
  if (!state.draft || state.approved !== null || state.draft.image !== 'tavern.svg' || state.draft.tokens.length !== 7) throw new Error('Packaged backend did not seed the expected camelCase tavern draft.');
  if (state.draft.tokens.filter(token => token.kind === 'hero').length !== 4 || state.draft.tokens.filter(token => token.kind === 'monster').length !== 3) throw new Error('Tavern seed must contain four heroes and three goblins.');
  const mapBeforeMonster = JSON.stringify(state.draft);
  const publicBeforeMonster = await (await api('/api/presentation')).text();
  response = await api('/api/encounter/monsters', 'POST', { monsterId: bandit.id });
  if (!response.ok) throw new Error(`Explicit packaged monster Add failed: HTTP ${response.status}`);
  const encounter = await response.json();
  const actor = encounter.actors.find(item => item.sourceMonsterId === bandit.id);
  if (!actor || actor.maximumHp !== bandit.stats.hitPoints || actor.sourceRulesetVersion !== manifest.release) throw new Error('Added actor is missing source version or stat snapshot.');
  if (JSON.stringify((await (await api('/api/map')).json()).draft) !== mapBeforeMonster) throw new Error('Monster Add changed map tokens.');
  if (await (await api('/api/presentation')).text() !== publicBeforeMonster) throw new Error('Monster Add changed public presentation.');
  const original = state.draft;
  response = await api('/api/map/draft', 'PUT', original);
  if (!response.ok) throw new Error('Authenticated draft save failed.');
  response = await api('/api/map/show', 'POST', { imageData });
  if (!response.ok) throw new Error('Explicit Show failed.');
  const approved = (await response.json()).approved;
  if (!approved || approved.imageData !== imageData || approved.image !== 'tavern.svg' || approved.tokens.length !== 7) throw new Error('Show did not persist the sanitized PNG with the approved snapshot.');
  let publicPresentation = await (await api('/api/presentation')).json();
  const expectedPublicTokens = publicTokens(approved.tokens);
  const firstShowTokensMatch = JSON.stringify(publicPresentation.tokens) === JSON.stringify(expectedPublicTokens);
  const exactPublicKeys = JSON.stringify(Object.keys(publicPresentation).sort()) === JSON.stringify(['id','imageData','mode','tokens']);
  if (publicPresentation.mode !== 'map' || publicPresentation.imageData !== imageData || !firstShowTokensMatch || !exactPublicKeys) throw new Error(`Show did not update the exact sanitized public projection (mode=${publicPresentation.mode}, imageData=${publicPresentation.imageData?.slice(0,40)}, tokensMatch=${firstShowTokensMatch}, keys=${Object.keys(publicPresentation)}).`);
  if (publicPresentation.tokens.some(token => JSON.stringify(Object.keys(token).sort()) !== JSON.stringify(['artwork','color','id','kind','name','x','y']))) throw new Error('Public map projection exposed forbidden token fields.');

  const editedDraft = {
    ...original,
    imageData,
    gridVisible: !original.gridVisible,
    scale: original.scale + 8,
    tokens: original.tokens.map((token, index) => ({ ...token, x: token.x + 17 + index, y: token.y - 13 - index })),
  };
  response = await api('/api/map/draft', 'PUT', editedDraft);
  if (!response.ok) throw new Error('Edited draft save failed.');
  publicPresentation = await (await api('/api/presentation')).json();
  if (publicPresentation.mode !== 'map' || JSON.stringify(publicPresentation.tokens) !== JSON.stringify(expectedPublicTokens)) throw new Error('Draft edits leaked into the public map before Show.');
  await stopBackend();
  await startBackend();
  const reopenedEncounter = await (await api('/api/encounter')).json();
  if (!reopenedEncounter.actors.some(item => item.sourceMonsterId === bandit.id && item.maximumHp === bandit.stats.hitPoints)) throw new Error('Private monster actor did not survive packaged backend restart.');
  publicPresentation = await (await api('/api/presentation')).json();
  if (publicPresentation.mode !== 'black') throw new Error('Packaged backend restart must leave public output black until explicit Show encounter.');
  response = await api('/api/map');
  if (!response.ok) throw new Error('Could not reload saved state after packaged backend restart.');
  state = await response.json();
  if (JSON.stringify(state.draft) !== JSON.stringify(editedDraft)) throw new Error('Edited camelCase draft, grid, scale, seven tokens, or positions did not survive restart.');
  if (JSON.stringify(state.approved) !== JSON.stringify(approved)) throw new Error('Approved snapshot changed or failed to survive restart independently.');
  response = await api('/api/map/show', 'POST', { imageData });
  if (!response.ok) throw new Error('Explicit re-Show after restart failed.');
  const republished = (await response.json()).approved;
  if (JSON.stringify(republished) !== JSON.stringify(editedDraft)) throw new Error('Explicit Show did not publish the saved edited draft.');
  publicPresentation = await (await api('/api/presentation')).json();
  const editedPublicTokens = publicTokens(editedDraft.tokens);
  const reShowTokensMatch = JSON.stringify(publicPresentation.tokens) === JSON.stringify(editedPublicTokens);
  if (publicPresentation.mode !== 'map' || !reShowTokensMatch || publicPresentation.imageData !== imageData) throw new Error(`Re-Show did not update the sanitized public projection (mode=${publicPresentation.mode}, tokensMatch=${reShowTokensMatch}).`);
  console.log(`Packaged ${rid} backend passed bundled SRD search/Add, actor restart persistence, map/public isolation, authenticated draft/approved restart round-trip, and black-until-Show behavior; macOS outputs remain unverified on this host.`);
} finally {
  await stopBackend();
  rmSync(userData, { recursive: true, force: true });
  rmSync(buildRoot, { recursive: true, force: true });
}
