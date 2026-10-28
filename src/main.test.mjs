import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chooseExternalDisplay } from './display-policy.mjs';
import { mapToScreen, screenToMap, zoomAt, ZOOM_MIN, ZOOM_MAX } from './renderer/src/map/camera.mjs';
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
test('public preload exposes only public presentation retrieval', () => {
  assert.match(preload, /const api = publicWindow\s*\? Object\.freeze\(\{ getPresentation/);
  assert.match(main, /allowedSender\('public', event\)/);
  assert.doesNotMatch(preload.slice(preload.indexOf('? Object.freeze'), preload.indexOf(': Object.freeze')), /command:|preferences:|displays:/);
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
  assert.match(main, /frame: true, fullscreen: !!external/);
  assert.match(main, /filter\(d => d\.id !== primaryId\)/);
});
test('scene state changes do not toggle or recreate the fullscreen player window', () => {
  assert.match(main, /const previousDisplayId = prefs\.displayId;[\s\S]*if \(prefs\.displayId !== previousDisplayId\) safeTopology\(\)/);
  assert.match(main, /if \(displayStateInitialized && nextDisplayId === activeDisplayId\) \{[\s\S]*setBounds\(selected\.bounds\)[\s\S]*return;/);
  assert.match(main, /publicWindow\.setBounds\(selected\.bounds\);\s*if \(!publicWindow\.isFullScreen\(\)\) publicWindow\.setFullScreen\(true\)/);
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
test('map camera coordinates invert under pan and zoom', () => {
  const point={x:217,y:103}, camera={x:41,y:-17,zoom:1.75};
  assert.deepEqual(screenToMap(mapToScreen(point,camera),camera),point);
});
test('cursor anchored zoom preserves its map coordinate and clamps', () => {
  const camera={x:32,y:-11,zoom:1}, cursor={x:300,y:190};
  assert.deepEqual(screenToMap(cursor,zoomAt(camera,cursor,1.4)),screenToMap(cursor,camera));
  assert.equal(zoomAt(camera,cursor,100).zoom,ZOOM_MAX);assert.equal(zoomAt(camera,cursor,.001).zoom,ZOOM_MIN);
});
