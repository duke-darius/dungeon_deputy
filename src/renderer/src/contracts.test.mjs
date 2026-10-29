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

test('black state and malformed DTOs produce a clean black projection', () => {
  assert.deepEqual(publicView({ mode: 'black', sceneId: null, title: null, description: null }), {
    mode: 'black', sceneId: null, title: null, description: null,
  });
  assert.equal(publicView({ mode: 'scene', sceneId: 'ashen-road', title: 1, description: 'x' }).mode, 'black');
});

test('public map projection preserves allowlisted camelCase visual fields only', () => {
  const output=publicView({mode:'map',id:'tavern',image:'tavern.svg',gridVisible:true,scale:48,tokens:[{id:'hero-1',name:'Mira',kind:'hero',color:'#b89255',x:10,y:20,artwork:'hero.svg',notes:'private'}],campaignId:'secret'});
  assert.deepEqual(output,{mode:'map',id:'tavern',image:'tavern.svg',gridVisible:true,scale:48,tokens:[{id:'hero-1',name:'Mira',kind:'hero',color:'#b89255',x:10,y:20,artwork:'hero.svg'}]});
  assert.equal(publicView({...output,tokens:[{...output.tokens[0],artwork:'../../secret.svg'}]}).mode,'black');
});

test('public map fog projection contains revealed geometry only and omits hidden tokens and private fields', () => {
  const output = publicView({
    mode: 'map', id: 'tavern', image: 'tavern.svg', gridVisible: true, scale: 48,
    revealedTerrain: [{ mode: 'reveal', stamps: [{ x: 25, y: 40, radius: 10 }] }],
    tokens: [{ id: 'hero-1', name: 'Mira', kind: 'hero', color: '#b89255', x: 10, y: 20, artwork: 'hero.svg' }],
    fogEnabled: true, hp: 3, initiative: 12,
  });
  assert.deepEqual(output, {
    mode: 'map', id: 'tavern', image: 'tavern.svg', gridVisible: true, scale: 48,
    revealedTerrain: [{ mode: 'reveal', stamps: [{ x: 25, y: 40, radius: 10 }] }],
    tokens: [{ id: 'hero-1', name: 'Mira', kind: 'hero', color: '#b89255', x: 10, y: 20, artwork: 'hero.svg' }],
  });
  assert.equal(Object.hasOwn(output, 'hp'), false);
  assert.equal(Object.hasOwn(output, 'fogEnabled'), false);
  assert.equal(publicView({ mode: 'map', id: 't', image: 'tavern.svg', gridVisible: true, scale: 48, revealedTerrain: [], tokens: [{ id: 'hidden', visible: false }] }).mode, 'black');
});
