import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioPlayer } from './playback.mjs';

function harness({ duration = 1, length = 100, channels = 1, failDecode = false } = {}) {
  const events = [];
  class Context {
    constructor() { this.state = 'suspended'; this.destination = {}; events.push('construct'); }
    resume() { events.push('resume'); this.state = 'running'; return Promise.resolve(); }
    createGain() { return { gain: {}, connect() {}, disconnect() { events.push('gain-disconnect'); } }; }
    createBufferSource() { return { loop: false, connect() {}, disconnect() { events.push('disconnect'); }, start() { events.push('start'); }, stop() { events.push('stop'); this.onended?.(); } }; }
    decodeAudioData() { events.push('decode'); if (failDecode) return Promise.reject(Error('decode')); return Promise.resolve({ duration, length, numberOfChannels: channels }); }
    close() { events.push('close'); this.state = 'closed'; return Promise.resolve(); }
  }
  const player = createAudioPlayer({ audioBytes: async () => new Uint8Array([1]) }, Context);
  return { player, events };
}

test('gesture creates/resumes one context and each trigger gets a fresh source; decode failures leave no voices', async () => {
  const { player, events } = harness();
  const first = await player.play({ id: 'one' });
  const second = await player.play({ id: 'one' });
  assert.notEqual(first, second);
  assert.equal(events.filter(e => e === 'construct').length, 1);
  assert.equal(events[1], 'resume');
  first.onended(); assert.equal(player.activeCount, 1);
  await player.close();
  const broken = harness({ failDecode: true }).player;
  await assert.rejects(broken.play({ id: 'bad' }));
  assert.equal(broken.activeCount, 0);
});

test('volumes, loop and one-shot limits, stop and repeated stop-all are bounded', async () => {
  const { player, events } = harness();
  const loop = await player.play({ id: 'a' }, 25, 50, true);
  assert.equal(loop.loop, true);
  await assert.rejects(player.play({ id: 'a' }, 100, 100, true), /loop/);
  for (let i = 0; i < 8; i++) await player.play({ id: 'a' });
  await assert.rejects(player.play({ id: 'a' }), /limit/);
  player.stop(loop); player.stopAll(); player.stopAll();
  assert.equal(player.activeCount, 0);
  assert.equal(events.filter(e => e === 'stop').length, 9);
});

test('duration and decoded-buffer bounds reject; stop-all and teardown release resources', async () => {
  const long = harness({ duration: 601 }).player;
  await assert.rejects(long.play({ id: 'long' }), /ten minutes/);
  const huge = harness({ length: 60_000_000, channels: 1 }).player;
  await assert.rejects(huge.play({ id: 'huge' }), /memory/);
  const { player, events } = harness();
  await player.play({ id: 'a' }); player.stopAll(); await player.close();
  assert.equal(player.activeCount, 0); assert.ok(events.includes('close'));
  await assert.rejects(player.play({ id: 'a' }), /closed/);
});
