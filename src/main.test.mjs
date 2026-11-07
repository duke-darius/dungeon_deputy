import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chooseExternalDisplay } from './display-policy.mjs';
import { mapToScreen, screenToMap, zoomAt, ZOOM_MIN, ZOOM_MAX } from './renderer/src/map/camera.mjs';
import './renderer/src/audio/model.test.mjs';
const main = await readFile(new URL('./main.ts', import.meta.url), 'utf8');
const preload = await readFile(new URL('./preload.cts', import.meta.url), 'utf8');
test('main owns Electron display and backend lifecycle securely', () => {
  assert.match(main, /screen\.getAllDisplays\(\)/);
  assert.match(main, /display-added/); assert.match(main, /display-removed/); assert.match(main, /display-metrics-changed/);
  assert.match(main, /contextIsolation: true/); assert.match(main, /sandbox: true/); assert.match(main, /nodeIntegration: false/);
  assert.match(main, /waitForBackend/); assert.match(main, /backend\.kill\(\)/);
  assert.match(main, /validPreferences/); assert.match(main, /document\.body\.style\.background='black'/);
  assert.match(main, /resolve\(app\.getPath\('userData'\), 'data'\)/);
  assert.match(main, /DUNGEON_DEPUTY_DATA_DIR: dataDirectory/);
});
test('AI provider environment is forwarded only to the backend process and never preload or renderer data', () => {
  assert.match(main, /OPENAI_API_KEY/);
  assert.match(main, /DUNGEON_DEPUTY_AI_MODEL/);
  assert.match(main, /DUNGEON_DEPUTY_AI_ENABLED/);
  assert.match(main, /'DUNGEON_DEPUTY_AI_ENABLED', 'OPENAI_API_KEY', 'DUNGEON_DEPUTY_AI_MODEL'/);
  assert.match(main, /spawn\(path, \[\], \{ env:/);
  assert.match(main, /const backendEnvironment = Object\.fromEntries/);
  assert.doesNotMatch(main, /\.\.\.process\.env/);
  assert.doesNotMatch(preload, /OPENAI_API_KEY|DUNGEON_DEPUTY_AI_MODEL/);
});
test('deterministic fake provider is restricted to unpackaged E2E and strips real credentials from test descendants', async () => {
  const fixture = await readFile(new URL('../scripts/e2e/fixtures.mjs', import.meta.url), 'utf8');
  const fake = await readFile(new URL('./backend/AiPreparation/E2eFakeAiPreparationService.cs', import.meta.url), 'utf8');
  assert.match(main, /e2e && !app\.isPackaged && process\.env\.DUNGEON_DEPUTY_E2E_AI_FAKE === '1'/);
  assert.match(main, /e2eFakeAi \? \{ DUNGEON_DEPUTY_E2E: '1', DUNGEON_DEPUTY_E2E_AI_FAKE: '1' \}/);
  assert.match(fake, /Deterministic fake provider/);
  assert.match(fixture, /OPENAI_API_KEY: _neverInE2e/);
  assert.match(fixture, /DUNGEON_DEPUTY_E2E_AI_FAKE:'1'/);
});
test('package smoke publishes to an isolated staging directory', async () => {
  const smoke = await readFile(new URL('../scripts/package-smoke.mjs', import.meta.url), 'utf8');
  const publisher = await readFile(new URL('../scripts/package-backend.mjs', import.meta.url), 'utf8');
  const forge = await readFile(new URL('../forge.config.ts', import.meta.url), 'utf8');
  assert.match(smoke, /mkdtempSync\(resolve\('artifacts', 'package-smoke-build-'\)\)/);
  assert.match(smoke, /DUNGEON_DEPUTY_BACKEND_ROOT: buildRoot/);
  assert.match(publisher, /process\.env\.DUNGEON_DEPUTY_BACKEND_ROOT \?\? 'artifacts'/);
  assert.match(forge, /process\.env\.DUNGEON_DEPUTY_BACKEND_ROOT \?\? 'artifacts'/);
});
test('development launch waits for a strict Vite origin before opening Electron', async () => {
  const dev = await readFile(new URL('../scripts/dev.mjs', import.meta.url), 'utf8');
  const vite = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
  const html = await readFile(new URL('./renderer/index.html', import.meta.url), 'utf8');
  assert.match(dev, /waitForRenderer/);
  assert.match(dev, /5173/);
  assert.match(vite, /port: 5173, strictPort: true/);
  assert.match(html, /Starting Dungeon Deputy/);
  assert.match(main, /logRendererFailures\('dm', dm\)/);
  assert.match(main, /console-message/);
});
test('public preload exposes only public presentation retrieval', () => {
  assert.match(preload, /const api = publicWindow\s*\? Object\.freeze\(\{ getPresentation/);
  assert.match(main, /allowedSender\('public', event\)/);
  assert.doesNotMatch(preload.slice(preload.indexOf('? Object.freeze'), preload.indexOf(': Object.freeze')), /command:|preferences:|displays:/);
});
test('DM IPC command allowlist permits only private AI preparation request routes and local SRD catalog', () => {
  const allowlist = main.match(/!\/(?:\\\/|[^/])+\/(?:[dgimsuvy]*)\.test\(path\)/)?.[0];
  assert.ok(allowlist, 'DM command handler must retain an explicit path allowlist');
  const patternSource = allowlist.slice(2, allowlist.lastIndexOf('/.test'));
  const policy = new RegExp(patternSource);
  for (const path of ['/api/srd/search?q=Bandit&category=monster', '/api/srd/coverage', '/api/srd/metadata', '/api/srd/records/srd521:monster:bandit', '/api/encounter/monsters', '/api/ai/status', '/api/ai/npc', '/api/ai/encounter', '/api/ai/adventure', '/api/ai/scene', '/api/ai/geometry', '/api/ai/accept', '/api/ai/accepted', '/api/ai/accepted/0123456789abcdef0123456789abcdef']) {
    assert.equal(policy.test(path), true, `${path} should be available to the private DM renderer`);
  }
  for (const path of ['/api/srd/admin', '/api/srd/records/..%2fsecret', '/api/srd/search/other']) assert.equal(policy.test(path), false, `${path} must remain denied`);
});
test('private audio import is picker-only, sender checked, opaque and E2E gated', () => {
  assert.match(main, /audio:import/);
  assert.match(main, /allowedSender\('dm', event\)/);
  assert.match(main, /showOpenDialog/);
  assert.match(main, /randomBytes\(16\)/);
  assert.match(main, /DUNGEON_DEPUTY_E2E/);
  assert.match(main, /DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES: _audioFixtures/);
  assert.match(main, /if \(!e2e \|\| app\.isPackaged \|\| !process\.env\.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES\) return \[\]/);
  assert.match(preload, /audioImport/);
  assert.doesNotMatch(preload.slice(preload.indexOf('? Object.freeze'), preload.indexOf(': Object.freeze')), /audioImport|audioConfig/);
});
test('audio-save test seam is gated by immutable packaged state and only wraps config writes', () => {
  assert.match(main, /saveTestPolicy\(\{[\s\S]*e2e,[\s\S]*isPackaged: app\.isPackaged/);
  assert.match(main, /process\.env\.DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS/);
  assert.match(main, /process\.env\.DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST === '1'/);
  assert.match(main, /async function saveAudioConfig\(value: unknown\) \{[\s\S]*audioSaveTestPolicy\.delayMs[\s\S]*failFirstAudioSave\(\)/);
  assert.match(main, /ipcMain\.handle\('audio:config',[\s\S]*if \(value !== undefined\) await saveAudioConfig\(value\)/);
});
test('audio import, bytes, and discard remain DM-only with bounded opaque pending lifecycle', () => {
  assert.match(main, /stageWithinAudioQuota\(\{[\s\S]*maxFileBytes: MAX_FILE_BYTES[\s\S]*maxTotalBytes: MAX_TOTAL_BYTES[\s\S]*copyBounded\(source, pendingPath, budget\)/);
  assert.match(main, /ipcMain\.handle\('audio:discard',[\s\S]*allowedSender\('dm', event\)[\s\S]*pendingAudioIds\.delete\(id\)/);
  assert.match(main, /pending\.size !== asset\.size \|\| pending\.format !== asset\.format/);
  assert.match(main, /commitStagedAudioConfig\(\{[\s\S]*replace: \(path: string\) => rename\(path, audioConfigPath\(\)\)[\s\S]*releaseReservation:/);
  assert.match(preload, /audioDiscard/);
  assert.doesNotMatch(preload.slice(preload.indexOf('? Object.freeze'), preload.indexOf(': Object.freeze')), /audioDiscard/);
});
test('bundled defaults resolve to packaged resources or the development app tree and seed outside the save-test seam', () => {
  assert.match(main, /join\(process\.resourcesPath, 'audio-defaults', filename\)/);
  assert.match(main, /join\(app\.getAppPath\(\), 'assets\/audio-defaults', filename\)/);
  assert.match(main, /audioSeedMarkerPath/);
  assert.match(main, /if \(!seedMarked && \(!configExists \|\| legacyPristine\)\)/);
  assert.match(main, /copyBounded\(source, temp, MAX_FILE_BYTES\)/);
  assert.match(main, /rename\(temporaryConfig, audioConfigPath\(\)\)[\s\S]*rename\(temporaryMarker, audioSeedMarkerPath\(\)\)/);
  const startupSeeder = main.slice(main.indexOf('async function seedBundledAudioDefaults'), main.indexOf('async function saveAudioConfig'));
  assert.doesNotMatch(startupSeeder, /failFirstAudioSave|audioSaveTestPolicy/);
  assert.match(startupSeeder, /if \(configCommitted\)[\s\S]*JSON\.stringify\(candidate\)[\s\S]*audioConfig = candidate/);
});
test('sandboxed preload uses CommonJS output rather than unsupported ESM imports', async () => {
  const tsconfig = await readFile(new URL('../tsconfig.electron.json', import.meta.url), 'utf8');
  const buildCheck = await readFile(new URL('../scripts/verify-electron-output.mjs', import.meta.url), 'utf8');
  assert.match(tsconfig, /src\/preload\.cts/);
  assert.match(buildCheck, /dist\/main\/preload\.cjs/);
});
test('display fallback uses only an external display and preserves an explicit preference', () => {
  const displays = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.equal(chooseExternalDisplay(displays, 1, null)?.id, 2);
  assert.equal(chooseExternalDisplay(displays, 1, 3)?.id, 3);
  assert.equal(chooseExternalDisplay(displays, 1, 9), undefined);
  assert.equal(chooseExternalDisplay([{ id: 1 }], 1, null), undefined);
});
test('topology recovery blacks out when the selected external display changes', () => {
  assert.match(main, /nextDisplayId !== activeDisplayId\) void api\('\/api\/blackout', 'POST'\)/);
  assert.match(main, /frame: true, fullscreen: !e2e && !!external/);
  assert.match(main, /filter\(d => d\.id !== primaryId\)/);
});
test('scene state changes do not toggle or recreate the fullscreen player window', () => {
  assert.match(main, /const previousDisplayId = prefs\.displayId;[\s\S]*if \(prefs\.displayId !== previousDisplayId\) safeTopology\(\)/);
  assert.match(main, /if \(displayStateInitialized && nextDisplayId === activeDisplayId\) \{[\s\S]*setBounds\(selected\.bounds\)[\s\S]*return;/);
  assert.match(main, /publicWindow\.setBounds\(selected\.bounds\);\s*if \(!e2e && !publicWindow\.isFullScreen\(\)\) publicWindow\.setFullScreen\(true\)/);
  assert.match(main, /display-metrics-changed', \(_event, display\) => safeTopology\(display\.id\)/);
  assert.doesNotMatch(main, /BrowserWindow\.getAllWindows\(\).*destroy/);
});
test('map publish and blackout update public content without changing window lifecycle', () => {
  assert.match(main, /windows\.set\('public', pub\)/);
  assert.match(main, /const pub = new BrowserWindow/);
  assert.doesNotMatch(main, /load\(pub,[\s\S]*api\('\/api\/map\/show'[\s\S]*load\(pub/);
  assert.match(main, /public:presentation[\s\S]*api\('\/api\/presentation'\)/);
  assert.match(main, /api\('\/api\/blackout', 'POST'\)/);
  assert.doesNotMatch(main, /\/api\/map\/show.*safeTopology|\/api\/map\/show.*setFullScreen/);
});
test('display SignalR capability remains in main and preload forwards only allowlisted presentation data', () => {
  assert.match(main, /new HubConnectionBuilder\(\)[\s\S]*accessTokenFactory: \(\) => grant\.token/);
  assert.match(main, /connection\.on\('Presentation'/);
  assert.match(main, /connection\.onreconnected/);
  assert.doesNotMatch(main, /return \{ hubUrl:.*token: grant\.token/);
  assert.match(preload, /onPresentationUpdated/);
  assert.match(preload, /connectRealtime: \(\) => ipcRenderer\.invoke\('public:realtime'\)/);
  assert.doesNotMatch(preload, /accessTokenFactory|token: grant\.token/);
  assert.doesNotMatch(preload, /getRealtimePresentation|onRealtimeAvailable/);
});
test('map camera coordinates invert under pan and zoom', () => {
  const point={x:217,y:103}, camera={x:41,y:-17,zoom:1.75};
  assert.deepEqual(screenToMap(mapToScreen(point,camera),camera),point);
});
test('cursor anchored zoom preserves its map coordinate and clamps', () => {
  const camera={x:32,y:-11,zoom:1}, cursor={x:300,y:190};
  assert.deepEqual(screenToMap(cursor,zoomAt(camera,cursor,1.4)),screenToMap(cursor,camera));
  assert.equal(zoomAt(camera,cursor,100).zoom,ZOOM_MAX);assert.equal(zoomAt(camera,cursor,.001).zoom,ZOOM_MIN);
});
