import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('DM Add is explicit and packaged smoke covers local offline catalog privacy', () => {
  const ui = readFileSync('src/renderer/src/compendium/Compendium.tsx', 'utf8');
  const smoke = readFileSync('scripts/package-smoke.mjs', 'utf8');
  assert.match(ui, /window\.confirm\(`Add \$\{selected\.name\} to the private encounter\?/);
  assert.match(ui, /addSrdMonsterToEncounter\(selected\.id\)/);
  assert.match(readFileSync('src/renderer/src/api.ts', 'utf8'), /\/api\/encounter\/monsters/);
  assert.match(smoke, /assets', 'srd', '2024'/);
  assert.match(smoke, /\/api\/srd\/search\?category=monster/);
  assert.match(smoke, /\/api\/encounter\/monsters/);
  assert.match(smoke, /Monster Add changed map tokens/);
  assert.match(smoke, /Monster Add changed public presentation/);
});
