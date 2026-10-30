import test from 'node:test';
import assert from 'node:assert/strict';
import { assignAsset, defaultAudioConfig, validateAudioConfig, SLOT_COUNT, MAX_BANKS, DEFAULT_AUDIO_SAMPLES, isPristineAudioConfig, seedDefaultAudioConfig } from './model.mjs';

test('default audio seed is only for pristine empty banks and assigns the three stable samples to pads 1–3', () => {
  const empty = defaultAudioConfig();
  assert.equal(isPristineAudioConfig(empty), true);
  const seeded = seedDefaultAudioConfig(empty, DEFAULT_AUDIO_SAMPLES.map(sample => ({ ...sample, size: 128, duration: 0.5 })));
  assert.deepEqual(seeded.banks[0].slots.slice(0, 3).map(slot => slot.asset), DEFAULT_AUDIO_SAMPLES.map(sample => sample.id));
  assert.ok(seeded.banks[0].slots.slice(3).every(slot => slot.asset === null));
  assert.equal(seeded.assets.length, 3);
  assert.deepEqual(seedDefaultAudioConfig(seeded), seeded);
  assert.equal(isPristineAudioConfig({ ...empty, assets: [{ id: 'custom' }] }), false);
  assert.equal(isPristineAudioConfig({ ...empty, banks: [{ ...empty.banks[0], slots: empty.banks[0].slots.map((slot, i) => i ? slot : { ...slot, asset: 'custom' }) }] }), false);
});

test('default and persisted banks contain exactly twelve stable numbered slots', () => {
  const config = defaultAudioConfig();
  assert.equal(config.banks.length, 1);
  assert.deepEqual(config.banks[0].slots.map(s => s.id), Array.from({ length: SLOT_COUNT }, (_, i) => `pad-${i + 1}`));
  assert.equal(validateAudioConfig(config).banks[0].slots.length, 12);
});

test('invalid persisted IDs, paths, slot shapes, bounds and oversized bank arrays safely recover', () => {
  const original = defaultAudioConfig();
  for (const damaged of [
    { ...original, masterVolume: 101 },
    { ...original, banks: [{ ...original.banks[0], slots: [] }] },
    { ...original, banks: [{ ...original.banks[0], slots: original.banks[0].slots.map((s, i) => i ? s : { ...s, asset: 'C:\\secret.wav' }) }] },
    { ...original, banks: Array.from({ length: MAX_BANKS + 1 }, (_, i) => ({ ...original.banks[0], id: `bank-${i}` })) },
  ]) assert.deepEqual(validateAudioConfig(damaged), original);
});

test('failed replacement preserves prior pad assignment and missing files retain references', () => {
  const asset = { id: `a_${'a'.repeat(32)}`, name: 'Fixture', format: 'wav', size: 44, duration: 0.01 };
  const assigned = assignAsset(defaultAudioConfig(), 'bank-default', 'pad-1', asset);
  assert.equal(assigned.banks[0].slots[0].asset, asset.id);
  assert.equal(assignAsset(assigned, 'bank-default', 'pad-1', { ...asset, id: 'path' }).banks[0].slots[0].asset, asset.id);
  assert.equal(validateAudioConfig(assigned).banks[0].slots[0].asset, asset.id);
});
