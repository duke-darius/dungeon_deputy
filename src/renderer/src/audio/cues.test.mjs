import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChord, validateCueBindings, shouldIgnoreCueEvent, isCueWindowActive, dispatchCue } from './cues.mjs';
import { defaultAudioConfig, validateAudioConfig } from './model.mjs';

test('requires Ctrl/Cmd plus another modifier and normalizes matching chords', () => {
  assert.equal(normalizeChord({ ctrlKey: true, shiftKey: true, key: 'a' }), 'Ctrl+Shift+A');
  assert.equal(normalizeChord({ metaKey: true, altKey: true, key: 'F2' }), 'Cmd+Alt+F2');
  assert.equal(normalizeChord({ key: 'a' }), null);
  assert.equal(normalizeChord({ ctrlKey: true, key: 'Control' }), null);
  assert.equal(normalizeChord({ ctrlKey: true, shiftKey: true, key: 'Process' }), null);
});

test('validates allowlisted cue targets and rejects duplicate persisted chords', () => {
  const bindings = [{ chord: 'Ctrl+Shift+1', target: { kind: 'pad', bankId: 'bank-default', slotId: 'pad-1' } }];
  assert.equal(validateCueBindings(bindings, ['bank-default']).length, 1);
  assert.equal(validateCueBindings([...bindings, ...bindings], ['bank-default']).length, 0);
  assert.equal(validateCueBindings([{ chord: 'Ctrl+Shift+1', target: { kind: 'scene', sceneId: '../' } }], ['bank-default']).length, 0);
  assert.equal(validateCueBindings([{ chord: 'Ctrl+Shift+1', target: { kind: 'pad', bankId: 'missing', slotId: 'pad-1' } }], ['bank-default']).length, 0);
  const config=defaultAudioConfig();
  config.cues=bindings;
  assert.deepEqual(validateAudioConfig(JSON.parse(JSON.stringify(config))).cues,bindings,'validated bindings survive settings reload');
  assert.deepEqual(validateAudioConfig({...config,cues:[...bindings,...bindings]}).cues,[],'ambiguous persisted bindings are disabled instead of choosing a winner');
});

test('filters editable/composing/repeated/consumed events but allows canvas chords', () => {
  for (const event of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true }, { role: 'textbox' }])
    assert.equal(shouldIgnoreCueEvent({ target: event }), true);
  assert.equal(shouldIgnoreCueEvent({ isComposing: true }), true);
  assert.equal(shouldIgnoreCueEvent({ repeat: true }), true);
  assert.equal(shouldIgnoreCueEvent({ defaultPrevented: true }), true);
  assert.equal(shouldIgnoreCueEvent({ target: { tagName: 'CANVAS' } }), false);
});

test('cue window must be visible and focused before dispatch', () => {
  assert.equal(isCueWindowActive({ visibilityState: 'visible', hasFocus: () => true }), true);
  assert.equal(isCueWindowActive({ visibilityState: 'visible', hasFocus: () => false }), false);
  assert.equal(isCueWindowActive({ visibilityState: 'hidden', hasFocus: () => true }), false);
  assert.equal(isCueWindowActive(null), false);
});

test('dispatcher routes only explicit target actions and propagates command failure', async () => {
  const seen = [];
  const actions = { playPad: (...args) => seen.push(['pad', ...args]), showScene: id => seen.push(['scene', id]), showCurrent: () => seen.push(['current']), blackout: () => Promise.reject(Error('offline')) };
  await dispatchCue({ kind: 'pad', bankId: 'bank-default', slotId: 'pad-1' }, actions);
  await dispatchCue({ kind: 'scene', sceneId: 'moonlit-fen' }, actions);
  await dispatchCue({ kind: 'current' }, actions);
  assert.deepEqual(seen, [['pad', 'bank-default', 'pad-1'], ['scene', 'moonlit-fen'], ['current']]);
  await assert.rejects(dispatchCue({ kind: 'blackout' }, actions), /offline/);
});
