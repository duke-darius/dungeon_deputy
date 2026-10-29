import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('E2E harness uses isolated roots and never shows windows as a screenshot fallback', async()=>{
  const [fixture,main]=await Promise.all([readFile(new URL('./fixtures.mjs',import.meta.url),'utf8'),readFile(new URL('../../src/main.ts',import.meta.url),'utf8')]);
  assert.match(fixture,/check-ignore/);assert.match(fixture,/strictPort/);assert.match(fixture,/DUNGEON_DEPUTY_DATA_DIR/);assert.match(fixture,/Reusing validated external project dashboard Vite/);
  assert.match(main,/DUNGEON_DEPUTY_E2E/);assert.match(main,/if \(!e2e\) dm\.once\('ready-to-show'/);assert.match(main,/fullscreen: !e2e && !!external/);
  assert.doesNotMatch(fixture,/\.show\(|\.focus\(|\.activate\(/);
});
