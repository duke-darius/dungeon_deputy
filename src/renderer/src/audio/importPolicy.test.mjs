import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { copyBounded, createSerialLock, isManagedAudioFilename, reconcileManagedFiles } from './importPolicy.mjs';

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
