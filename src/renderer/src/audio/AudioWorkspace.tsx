import { useEffect, useRef, useState } from 'react';
// @ts-ignore Shared JS model uses runtime validation; the local shape keeps this view typed.
import { assignAsset, defaultAudioConfig, validateAudioConfig } from './model.mjs';
// @ts-ignore Shared JS playback helper has no declaration file by design.
import { createOneShotPlayer } from './playback.mjs';
type AudioAsset = { id: string; name: string; format: 'wav'|'mp3'|'ogg'; size: number; duration: number };
type AudioSlot = { id: string; asset: string|null; volume: number; loop: boolean };
type AudioBank = { id: string; name: string; slots: AudioSlot[] };
type AudioConfig = { version: 1; masterVolume: number; banks: AudioBank[]; selectedBankId: string; assets: AudioAsset[] };

export default function AudioWorkspace() {
  const [config, setConfig] = useState<AudioConfig>(defaultAudioConfig());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const player = useRef<any>(null);
  useEffect(() => { void window.dungeonDeputy.audioConfig?.().then(value => setConfig(validateAudioConfig(value))).catch(() => setMessage('Soundboard settings could not be loaded.')).finally(() => setLoaded(true)); return () => player.current?.close(); }, []);
  const bank = config.banks.find((b: AudioBank) => b.id === config.selectedBankId)!;
  const persist = async (next: AudioConfig) => { setConfig(next); await window.dungeonDeputy.audioConfig?.(next); };
  const importSound = async (slot: string) => {
    setBusy(true); setMessage('Importing sound…');
    try {
      const asset = await window.dungeonDeputy.audioImport?.(); if (!asset) { setMessage('Import cancelled.'); return; }
      const Audio = window.AudioContext; const ctx = new Audio();
      try {
        const raw = await window.dungeonDeputy.audioBytes!(asset.id);
        const bytes = raw instanceof Uint8Array ? Uint8Array.from(raw).buffer : raw;
        const decoded = await ctx.decodeAudioData(bytes as ArrayBuffer);
        if (decoded.duration <= 0 || decoded.duration > 600) throw new Error('Sound exceeds ten minutes or could not be decoded.');
        const accepted = { ...asset, duration: decoded.duration };
        await persist(assignAsset(config, bank.id, slot, accepted));
        setMessage(`${accepted.name} imported to ${slot.replace('pad-', 'Pad ')}.`);
      } finally { await ctx.close(); }
    } catch { setMessage('Couldn’t import this sound. Check the file and limits, then choose another file or try again.'); }
    finally { setBusy(false); }
  };
  const play = async (slot: AudioSlot) => {
    const asset = config.assets.find(a => a.id === slot.asset); if (!asset) return;
    try { player.current ??= createOneShotPlayer(window.dungeonDeputy); await player.current.play(asset, slot.volume, config.masterVolume); setMessage(`Playing ${asset.name}.`); }
    catch { setMessage('Playback unavailable. Re-import the sound and try again.'); }
  };
  return <section className="audio-workspace" aria-label="Audio — DM only"><h2>Audio · DM only 🔒</h2><label>Master volume <input aria-label="Master volume" type="range" min="0" max="100" value={config.masterVolume} onChange={e => void persist({ ...config, masterVolume: Number(e.target.value) })}/>{config.masterVolume}%</label><div className="audio-pads">{bank.slots.map((slot: AudioSlot, i: number) => { const asset = config.assets.find((a: AudioAsset) => a.id === slot.asset); return <article key={slot.id}><h3>Pad {i + 1}</h3><p>{asset?.name ?? 'Empty'}</p>{asset && <button onClick={() => void play(slot)}>Play</button>}<button disabled={busy || !loaded} onClick={() => void importSound(slot.id)}>Import sound</button></article>; })}</div><button onClick={() => player.current?.stopAll()}>Stop all</button><p role="status" aria-live="polite">{message}</p></section>;
}
