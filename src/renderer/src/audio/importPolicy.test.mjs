import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { copyBounded, createSerialLock, isManagedAudioFilename, reconcileManagedFiles, stageWithinAudioQuota, commitStagedAudioConfig } from './importPolicy.mjs';

test('bounded stream copy allows exact budget and removes temp when actual bytes exceed it', async () => {
  let removed = 0;
  const opts = chunks => ({ createReadStreamFn: () => Readable.from(chunks), createWriteStreamFn: () => new Writable({ write(_c,_e,cb){cb();} }), remove: async () => { removed++; } });
  assert.equal(await copyBounded('source','target',4,opts([Buffer.from('1234')])),4);
  await assert.rejects(copyBounded('source','target',4,opts([Buffer.from('12345')])),/limit/);
  assert.equal(removed,1);
});

test('serialized audio store lock holds through staging and reservations count against later work', async () => {
  const lock=createSerialLock(); const events=[];
  await Promise.all([1,2].map(id=>lock(async()=>{events.push(`start${id}`);await new Promise(r=>setTimeout(r,5));events.push(`end${id}`);} )));
  assert.deepEqual(events,['start1','end1','start2','end2']);
});

test('managed cleanup only removes generated names and preserves unknown files', async () => {
  const removed=[];
  await reconcileManagedFiles('/audio',['a_'+'1'.repeat(32)],{readdir:async()=>[`a_${'1'.repeat(32)}.wav`,`a_${'2'.repeat(32)}.ogg`,`a_${'3'.repeat(32)}.pending`,'notes.wav','a_invalid.wav'],remove:async name=>removed.push(name)});
  assert.deepEqual(removed,[`a_${'2'.repeat(32)}.ogg`,`a_${'3'.repeat(32)}.pending`]);
  assert.equal(isManagedAudioFilename('notes.wav'),false);
});

test('concurrent staging shares remaining aggregate quota and removes the rejected temp', async () => {
  const lock = createSerialLock();
  const reserved = new Map();
  const files = new Set();
  let committedBytes = 0;
  const budgets = [];
  const stage = (id, bytes) => stageWithinAudioQuota({
    lock,
    committedBytes: () => 0,
    reservedBytes: () => [...reserved.values()].reduce((sum, size) => sum + size, 0),
    maxFileBytes: 10,
    maxTotalBytes: 10,
    tempPath: id,
    copy: async limit => {
      await new Promise(resolve => setTimeout(resolve, 5));
      budgets.push(limit);
      assert.ok(limit >= 0);
      if (bytes.length > limit) throw new Error('Audio file exceeds the available import limit.');
      files.add(id);
      return bytes.length;
    },
    reserve: size => reserved.set(id, size),
    remove: path => files.delete(path),
  });
  const results = await Promise.allSettled([stage('first.pending', Buffer.alloc(6)), stage('second.pending', Buffer.alloc(6))]);
  assert.equal(results[0].status, 'fulfilled');
  assert.deepEqual(budgets, [10, 4]);
  assert.equal(reserved.get('first.pending'), 6);
  assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /limit/);
  assert.equal(files.has('second.pending'), false);
  assert.equal(committedBytes + [...reserved.values()].reduce((sum, size) => sum + size, 0), 6);
  assert.ok(committedBytes + [...reserved.values()].reduce((sum, size) => sum + size, 0) <= 10);
});

test('failed settings replacement rolls promotion back and retains retryable reservation', async () => {
  const state = { config: { old: true }, files: new Set(['asset.pending']), reserved: true };
  await assert.rejects(commitStagedAudioConfig({
    config: { next: true },
    tempPath: 'config.tmp',
    writePrepared: async path => state.files.add(path),
    promote: async () => { state.files.delete('asset.pending'); state.files.add('asset.wav'); },
    replace: async () => { throw new Error('settings unavailable'); },
    rollbackPromotion: async () => { state.files.delete('asset.wav'); state.files.add('asset.pending'); },
    remove: async path => state.files.delete(path),
    releaseReservation: () => { state.reserved = false; },
    setConfig: value => { state.config = value; },
  }), /settings unavailable/);
  assert.deepEqual(state.config, { old: true });
  assert.deepEqual([...state.files].sort(), ['asset.pending']);
  assert.equal(state.reserved, true);
});

test('successful staged commit releases its reservation after config replacement', async () => {
  const state = { config: { old: true }, files: new Set(['asset.pending']), reserved: true, replacementSawReservation: false };
  await commitStagedAudioConfig({
    config: { next: true },
    tempPath: 'config.tmp',
    writePrepared: async path => state.files.add(path),
    promote: async () => { state.files.delete('asset.pending'); state.files.add('asset.wav'); },
    replace: async path => { state.replacementSawReservation = state.reserved; state.files.delete(path); },
    rollbackPromotion: async () => { state.files.delete('asset.wav'); state.files.add('asset.pending'); },
    remove: async path => state.files.delete(path),
    releaseReservation: () => { state.reserved = false; },
    setConfig: value => { state.config = value; },
  });
  assert.equal(state.replacementSawReservation, true);
  assert.equal(state.reserved, false);
  assert.deepEqual(state.config, { next: true });
  assert.deepEqual([...state.files], ['asset.wav']);
});
