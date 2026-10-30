import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('E2E harness uses isolated roots and never shows windows as a screenshot fallback', async()=>{
  const [fixture,main]=await Promise.all([readFile(new URL('./fixtures.mjs',import.meta.url),'utf8'),readFile(new URL('../../src/main.ts',import.meta.url),'utf8')]);
  assert.match(fixture,/check-ignore/);assert.match(fixture,/strictPort/);assert.match(fixture,/DUNGEON_DEPUTY_DATA_DIR/);assert.match(fixture,/Reusing validated external project dashboard Vite/);
  assert.match(main,/DUNGEON_DEPUTY_E2E/);assert.match(main,/if \(!e2e\) dm\.once\('ready-to-show'/);assert.match(main,/fullscreen: !e2e && !!external/);
  assert.doesNotMatch(fixture,/\.show\(|\.focus\(|\.activate\(/);
});

test('audio save injections are passed only to Electron, never publisher or Vite', async()=>{
  const fixture=await readFile(new URL('./fixtures.mjs',import.meta.url),'utf8');
  assert.match(fixture,/DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS: _ignoredDelay/);
  assert.match(fixture,/DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST: _ignoredFailure/);
  assert.match(fixture,/env:\{\.\.\.childEnvironment,[\s\S]*DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS:'700',[\s\S]*DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST:'1'/);
  assert.match(fixture,/injectFirstFailure\?\{DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST:'1'\}:\{\}/);
  assert.doesNotMatch(fixture,/DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS:[^,}]*,[^}]*spawn\(/);
  const main=await readFile(new URL('../../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS: _audioDelaySetting/);
  assert.match(main,/env: \{ \.\.\.backendEnvironment,[\s\S]*DUNGEON_DEPUTY_PORT/);
});

test('open-source audio fixture paths are forwarded only to the E2E Electron process',async()=>{
  const fixture=await readFile(new URL('./fixtures.mjs',import.meta.url),'utf8');
  const main=await readFile(new URL('../../src/main.ts',import.meta.url),'utf8');
  assert.match(fixture,/DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES: _audioFixtures/);
  assert.match(fixture,/DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES\?\{DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES:process\.env\.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES\}:\{\}/);
  assert.doesNotMatch(fixture,/DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES[^\n]*spawn\(/);
  assert.match(main,/DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES: _audioFixtures/);
  assert.match(main,/if \(!e2e \|\| app\.isPackaged \|\| !process\.env\.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES\) return \[\]/);
});
