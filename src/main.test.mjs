import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const main = await readFile(new URL('./main.ts', import.meta.url), 'utf8');
const preload = await readFile(new URL('./preload.ts', import.meta.url), 'utf8');
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
