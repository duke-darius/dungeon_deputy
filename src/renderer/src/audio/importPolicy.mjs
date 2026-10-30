import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

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

export function stageWithinAudioQuota({ lock, committedBytes, reservedBytes, maxFileBytes, maxTotalBytes, tempPath, copy, reserve, remove }) {
  return lock(async () => {
    try {
      const committed = await committedBytes();
      const reserved = await reservedBytes();
      const budget = Math.min(maxFileBytes, maxTotalBytes - committed - reserved);
      if (budget <= 0) throw new Error('Imported audio total exceeds 256 MiB.');
      const size = await copy(budget);
      if (!Number.isSafeInteger(size) || size <= 0 || size > budget || size > maxFileBytes) throw new Error('Audio file exceeds the available import limit.');
      await reserve(size);
      return size;
    } catch (error) {
      await Promise.resolve().then(() => remove(tempPath)).catch(() => {});
      throw error;
    }
  });
}

export async function commitStagedAudioConfig({ config, tempPath, writePrepared, promote, replace, rollbackPromotion, remove, releaseReservation, setConfig }) {
  let promotionAttempted = false;
  try {
    await writePrepared(tempPath, config);
    promotionAttempted = true;
    await promote();
    await replace(tempPath);
    setConfig(config);
    await releaseReservation();
  } catch (error) {
    if (promotionAttempted) await Promise.resolve().then(() => rollbackPromotion()).catch(() => {});
    await Promise.resolve().then(() => remove(tempPath)).catch(() => {});
    throw error;
  }
}

export async function copyBounded(source, destination, limit, { createReadStreamFn, createWriteStreamFn = createWriteStream, remove = rm } = {}) {
  const read = createReadStreamFn ?? (await import('node:fs')).createReadStream;
  const input = read(source);
  const output = createWriteStreamFn(destination, { flags: 'wx', mode: 0o600 });
  let size = 0;
  const bounded = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > limit) callback(new Error('Audio file exceeds the available import limit.'));
      else callback(null, chunk);
    },
  });
  try {
    await pipeline(input, bounded, output);
    if (size === 0) throw new Error('Audio file is empty.');
    return size;
  } catch (error) {
    input.destroy?.(); bounded.destroy(); output.destroy();
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
