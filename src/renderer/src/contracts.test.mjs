import test from 'node:test';
import assert from 'node:assert/strict';
import { publicView, sceneById } from './contracts.mjs';

test('public output accepts only the public scene projection', () => {
  assert.deepEqual(publicView({ mode: 'scene', sceneId: 'moonlit-fen', title: 'Moonlit Fen', description: 'Water and reeds.' }), {
    mode: 'scene', sceneId: 'moonlit-fen', title: 'Moonlit Fen', description: 'Water and reeds.',
  });
});

test('private dashboard data cannot leak through the public projection', () => {
  const output = publicView({ mode: 'scene', sceneId: 'moonlit-fen', title: 'Moonlit Fen', description: 'Water and reeds.', dmNotes: 'hidden' });
  assert.equal(Object.hasOwn(output, 'dmNotes'), false);
});

test('unknown public scenes fail closed and scene IDs are allowlisted', () => {
  assert.equal(publicView({ mode: 'scene', sceneId: '../../private' }).mode, 'black');
  assert.equal(sceneById('../../private'), undefined);
});
