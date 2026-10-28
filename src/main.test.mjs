import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chooseExternalDisplay } from './display-policy.mjs';
const main = await readFile(new URL('./main.ts', import.meta.url), 'utf8');
const preload = await readFile(new URL('./preload.cts', import.meta.url), 'utf8');
test('main owns Electron display and backend lifecycle securely', () => {
  assert.match(main, /screen\.getAllDisplays\(\)/);
  assert.match(main, /display-added/); assert.match(main, /display-removed/); assert.match(main, /display-metrics-changed/);
  assert.match(main, /contextIsolation: true/); assert.match(main, /sandbox: true/); assert.match(main, /nodeIntegration: false/);
  assert.match(main, /waitForBackend/); assert.match(main, /backend\.kill\(\)/);
  assert.match(main, /validPreferences/); assert.match(main, /document\.body\.style\.background='black'/);
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
