import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('initiative tie movement posts one full ordering and uses authoritative actors', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const ordered = await reorderInitiative\(actorIds\)/);
  assert.match(editor, /setEncounter\(\(current: any\) => \(\{ \.\.\.current, actors: ordered\.actors \}\)\)/);
  assert.doesNotMatch(editor, /tie-break/);
});

test('blank HP fields independently serialize as null', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /current\.trim\(\) === '' \? null : Number\(current\)/);
  assert.match(editor, /maximum\.trim\(\) === '' \? null : Number\(maximum\)/);
});
