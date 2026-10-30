const MAX_CACHE_BYTES = 192 * 1024 * 1024;
const MAX_VOICE_BYTES = 192 * 1024 * 1024;
const MAX_DURATION_SECONDS = 600;

export function createAudioPlayer(api, AudioContextType = globalThis.AudioContext) {
  let context;
  let master;
  const cache = new Map();
  const sources = new Map();
  let cacheBytes = 0;
  let closed = false;

  const ensureContext = () => {
    if (closed) throw new Error('Audio player is closed.');
    context ??= new AudioContextType();
    if (!master) { master = context.createGain(); master.connect(context.destination); }
    return context;
  };

  const stopSource = source => {
    try { source.stop(); } catch { /* Already ended. */ }
    try { source.disconnect(); } catch { /* Already disconnected. */ }
    try { source._gain?.disconnect(); } catch { /* Already disconnected. */ }
    sources.delete(source);
  };

  return {
    async play(asset, volume = 100, masterVolume = 100, loop = false) {
      if (!Number.isFinite(volume) || volume < 0 || volume > 100 || !Number.isFinite(masterVolume) || masterVolume < 0 || masterVolume > 100) throw new Error('Volume must be from 0 to 100.');
      const audio = ensureContext();
      // Calling resume before the first await preserves the initiating click/key gesture.
      const resume = audio.state === 'suspended' ? audio.resume() : Promise.resolve();
      await resume;
      if (closed) throw new Error('Audio player is closed.');
      const active = [...sources.values()];
      if (loop ? active.some(node => node.loop) : active.filter(node => !node.loop).length >= 8) throw new Error(loop ? 'A loop is already playing.' : 'Playback limit reached. Stop a sound or use Stop all.');
      let entry = cache.get(asset.id);
      if (entry) { cache.delete(asset.id); cache.set(asset.id, entry); }
      else {
        const raw = await api.audioBytes(asset.id);
        const bytes = raw instanceof Uint8Array ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) : raw;
        entry = await audio.decodeAudioData(bytes);
        if (!Number.isFinite(entry.duration) || entry.duration <= 0 || entry.duration > MAX_DURATION_SECONDS) throw new Error('Sound exceeds ten minutes or could not be decoded.');
        const size = entry.length * entry.numberOfChannels * 4;
        if (!Number.isFinite(size) || size <= 0 || size > MAX_CACHE_BYTES) throw new Error('Decoded sound exceeds memory limit.');
        while (cacheBytes + size > MAX_CACHE_BYTES && cache.size) { const [key, old] = cache.entries().next().value; cache.delete(key); cacheBytes -= old.size; }
        cache.set(asset.id, { buffer: entry, size }); cacheBytes += size;
      }
      // Recheck after asynchronous decode so concurrent Play clicks cannot exceed caps.
      const current = [...sources.values()];
      if (loop ? current.some(node => node.loop) : current.filter(node => !node.loop).length >= 8) throw new Error('Playback limit reached. Stop a sound or use Stop all.');
      const buffer = entry?.buffer ?? entry;
      const source = audio.createBufferSource();
      const gain = audio.createGain();
      source._gain = gain;
      source.loop = Boolean(loop);
      source.buffer = buffer;
      gain.gain.value = volume / 100;
      master.gain.value = masterVolume / 100;
      source.connect(gain); gain.connect(master);
      sources.set(source, source);
      source.onended = () => { try { source.disconnect(); gain.disconnect(); } catch {} sources.delete(source); };
      try { source.start(); } catch (error) { stopSource(source); throw error; }
      return source;
    },
    stop(source) { if (source && sources.has(source)) stopSource(source); },
    stopAll() { for (const source of [...sources.keys()]) stopSource(source); },
    get activeCount() { return sources.size; },
    get cacheBytes() { return cacheBytes; },
    async close() {
      if (closed) return;
      closed = true; this.stopAll(); cache.clear(); cacheBytes = 0;
      const audio = context; context = undefined; master = undefined;
      if (audio && audio.state !== 'closed') await audio.close();
    },
  };
}

export const createOneShotPlayer = (api, AudioContextType) => createAudioPlayer(api, AudioContextType);
