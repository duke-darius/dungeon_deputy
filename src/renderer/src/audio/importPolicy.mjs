import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { once } from 'node:events';

export const AUDIO_ID_PATTERN = /^a_[a-f0-9]{32}$/;
export const isManagedAudioFilename = name => /^a_[a-f0-9]{32}\.(?:wav|mp3|ogg|pending)$/.test(name);

export function createSerialLock() {
  let tail = Promise.resolve();
  return async operation => {
    const previous = tail;
    let release;
    tail = new Promise(resolve => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  };
}

export async function copyBounded(source, destination, limit, { createReadStreamFn, createWriteStreamFn = createWriteStream, remove = rm } = {}) {
  const read = createReadStreamFn ?? (await import('node:fs')).createReadStream;
  const input = read(source);
  const output = createWriteStreamFn(destination, { flags: 'wx', mode: 0o600 });
  let size = 0;
  try {
    for await (const chunk of input) {
      size += chunk.length;
      if (size > limit) throw new Error('Audio file exceeds the available import limit.');
      if (!output.write(chunk)) await once(output, 'drain');
    }
    output.end();
    await once(output, 'close');
    if (size === 0) throw new Error('Audio file is empty.');
    return size;
  } catch (error) {
    input.destroy?.(); output.destroy();
    await remove(destination, { force: true }).catch(() => {});
    throw error;
  }
}

export async function reconcileManagedFiles(directory, referencedIds, { readdir, remove }) {
  const names = await readdir(directory);
  const referenced = new Set(referencedIds);
  for (const name of names) {
    if (!isManagedAudioFilename(name)) continue;
    const id = name.slice(0, name.lastIndexOf('.'));
    if (name.endsWith('.pending') || !referenced.has(id)) await remove(name);
  }
}
