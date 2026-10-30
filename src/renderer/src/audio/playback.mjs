export function createOneShotPlayer(api, AudioContextType = globalThis.AudioContext) {
  let context;
  let master;
  const cache = new Map();
  const sources = new Set();
  let cacheBytes = 0;
  return {
    async play(asset, volume = 100, masterVolume = 100) {
      context ??= new AudioContextType();
      master ??= context.createGain(); master.connect(context.destination);
      await context.resume();
      let buffer = cache.get(asset.id);
      if (!buffer) {
        const raw = await api.audioBytes(asset.id);
        const bytes = raw instanceof Uint8Array ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) : raw;
        buffer = await context.decodeAudioData(bytes);
        if (buffer.duration > 600) throw new Error('Sound exceeds ten minutes.');
        const size = buffer.length * buffer.numberOfChannels * 4;
        if (size > 192 * 1024 * 1024) throw new Error('Decoded sound exceeds memory limit.');
        while (cacheBytes + size > 192 * 1024 * 1024 && cache.size) { const [key, old] = cache.entries().next().value; cache.delete(key); cacheBytes -= old.length * old.numberOfChannels * 4; }
        cache.set(asset.id, buffer); cacheBytes += size;
      }
      master.gain.value = masterVolume / 100;
      const source = context.createBufferSource(); const gain = context.createGain();
      source.buffer = buffer; gain.gain.value = volume / 100; source.connect(gain); gain.connect(master);
      sources.add(source); source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(); return source;
    },
    stopAll() { for (const source of sources) { try { source.stop(); } catch {} } sources.clear(); },
    close() { this.stopAll(); if (context) void context.close(); context = undefined; master = undefined; cache.clear(); cacheBytes = 0; },
  };
}
