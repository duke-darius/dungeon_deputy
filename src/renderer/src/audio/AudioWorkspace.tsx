import { useEffect, useRef, useState } from 'react';
// @ts-ignore Shared JS model uses runtime validation; the local shape keeps this view typed.
import { assignAsset, defaultAudioConfig, MAX_BANKS, validateAudioConfig } from './model.mjs';
// @ts-ignore Shared JS playback helper has no declaration file by design.
import { createAudioPlayer } from './playback.mjs';
// @ts-ignore Shared cue module provides normalized private key handling.
import { dispatchCue, normalizeChord, shouldIgnoreCueEvent } from './cues.mjs';
import CueEditor from './CueEditor';
type AudioAsset = { id: string; name: string; format: 'wav'|'mp3'|'ogg'; size: number; duration: number };
type AudioSlot = { id: string; asset: string|null; volume: number; loop: boolean };
type AudioBank = { id: string; name: string; slots: AudioSlot[] };
type CueBinding = { chord: string; target: any };
type AudioConfig = { version: 1; masterVolume: number; banks: AudioBank[]; selectedBankId: string; assets: AudioAsset[]; cues: CueBinding[] };
const newBank = (name: string, id: string): AudioBank => ({ id, name, slots: Array.from({length:12}, (_,i)=>({id:`pad-${i+1}`,asset:null,volume:100,loop:false})) });

export default function AudioWorkspace({ cueActions }: { cueActions: { showScene: (id:string)=>Promise<void>; showCurrent: ()=>Promise<void>; blackout: ()=>Promise<void> } }) {
  const [config, setConfig] = useState<AudioConfig>(defaultAudioConfig());
  const [message, setMessage] = useState('Loading soundboard…');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [editingName, setEditingName] = useState<string|null>(null);
  const player = useRef<any>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const pendingSaves = useRef(0);
  const persistedConfig = useRef<AudioConfig>(defaultAudioConfig());
  useEffect(() => { void window.dungeonDeputy.audioConfig?.().then(value => { const restored=validateAudioConfig(value); persistedConfig.current=restored; setConfig(restored); setMessage(''); }).catch(() => setMessage('Soundboard settings could not be loaded.')).finally(() => setLoaded(true)); return () => { void player.current?.close(); }; }, []);
  const bank = config.banks.find((b: AudioBank) => b.id === config.selectedBankId) ?? config.banks[0];
  const persist = async (next: AudioConfig, kind: 'settings'|'shortcut' = 'settings'): Promise<boolean> => {
    const version=++saveVersion.current;
    setConfig(next);
    pendingSaves.current++;
    setSaving(true);
    setMessage(kind==='shortcut'?'Saving shortcut…':'Saving soundboard changes…');
    const write=saveQueue.current.catch(()=>{}).then(async()=>{await window.dungeonDeputy.audioConfig?.(next);});
    saveQueue.current=write;
    try {
      await write;
      persistedConfig.current=next;
      if(version===saveVersion.current)setMessage(kind==='shortcut'?'Shortcut saved.':'Soundboard changes saved.');
      return true;
    } catch {
      if(version===saveVersion.current){setConfig(persistedConfig.current);setMessage('Couldn’t save this change. Your last saved state is unchanged; retry the action.');}
      return false;
    } finally {
      pendingSaves.current--;
      if(pendingSaves.current===0)setSaving(false);
    }
  };
  const importSound = async (slot: string) => {
    setBusy(true); setMessage('Importing sound…');
    try {
      const asset = await window.dungeonDeputy.audioImport?.(); if (!asset) { setMessage('Import cancelled.'); return; }
      const Audio = window.AudioContext; const ctx = new Audio();
      try {
        const raw = await window.dungeonDeputy.audioBytes!(asset.id);
        const bytes = raw instanceof Uint8Array ? Uint8Array.from(raw).buffer : raw;
        const decoded = await ctx.decodeAudioData(bytes as ArrayBuffer);
        if (decoded.duration <= 0 || decoded.duration > 600) throw new Error('Duration limit.');
        const accepted = { ...asset, duration: decoded.duration };
        if(!await persist(assignAsset(config, bank.id, slot, accepted)))return;
        setMissing(ids => ids.filter(id => id !== slot)); setMessage(`${accepted.name} imported to ${slot.replace('pad-', 'Pad ')}.`);
      } finally { await ctx.close(); }
    } catch { setMessage('Couldn’t import this sound. Check the file and limits, then choose another file or try again.'); }
    finally { setBusy(false); }
  };
  const play = async (slot: AudioSlot): Promise<boolean> => {
    const asset = config.assets.find(a => a.id === slot.asset); if (!asset) return false;
    try { player.current ??= createAudioPlayer(window.dungeonDeputy); await player.current.play(asset, slot.volume, config.masterVolume, slot.loop); setMessage(slot.loop ? `Looping ${asset.name}.` : `Playing ${asset.name}.`); return true; }
    catch (error) { if (/missing|not found|ENOENT/i.test(String(error))) setMissing(ids=>ids.includes(slot.id)?ids:[...ids,slot.id]); setMessage(error instanceof Error && /limit/i.test(error.message) ? 'Playback limit reached. Stop a sound or use Stop all.' : 'Playback unavailable. Relink the sound and try again.'); return false; }
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('.cue-capture') || shouldIgnoreCueEvent(event)) return;
      const chord = normalizeChord(event); if (!chord) return;
      const binding = config.cues.find(item => item.chord === chord); if (!binding) return;
      event.preventDefault(); event.stopPropagation();
      void dispatchCue(binding.target, {
        playPad: async (bankId: string, slotId: string) => { const targetBank=config.banks.find((item:AudioBank)=>item.id===bankId);const targetSlot=targetBank?.slots.find((item:AudioSlot)=>item.id===slotId);if(!targetSlot?.asset) throw new Error('Cue pad is empty or unavailable.');if(!await play(targetSlot)) throw new Error('Cue pad playback could not start.'); },
        ...cueActions,
      }).then(()=>setMessage(binding.target.kind==='pad'?'Cue played.':'Cue completed.')).catch(()=>setMessage('Cue failed. Your last saved state is unchanged; retry the action.'));
    };
    window.addEventListener('keydown',onKeyDown);
    return()=>window.removeEventListener('keydown',onKeyDown);
  },[config, cueActions]);
  const changeSlot = (slot: AudioSlot, patch: Partial<AudioSlot>) => void persist({...config,banks:config.banks.map(b=>b.id===bank.id?{...b,slots:b.slots.map(s=>s.id===slot.id?{...s,...patch}:s)}:b)});
  const create = () => { if(config.banks.length>=MAX_BANKS)return; const id=`bank-${crypto.randomUUID().replaceAll('-','').slice(0,20)}`; void persist({...config,banks:[...config.banks,newBank(`Bank ${config.banks.length+1}`,id)],selectedBankId:id}); };
  const rename = () => { if(editingName?.trim() && editingName.trim().length<=80) { void persist({...config,banks:config.banks.map(b=>b.id===bank.id?{...b,name:editingName.trim()}:b)}); setEditingName(null); } };
  const remove = () => { if(config.banks.length<=1)return; if(!window.confirm(`Delete ‘${bank.name}’ and its 12 pad assignments? Imported sound files remain available only if assigned elsewhere.`))return; const banks=config.banks.filter(b=>b.id!==bank.id); void persist({...config,banks,selectedBankId:banks[0].id}); };
  return <section className="audio-workspace" aria-label="Audio — DM only">
    <header className="audio-header"><h2>Audio · DM only <span aria-label="Locked">🔒</span></h2><p className="audio-shortcut-hint">Sounds stay private. Playback starts only when you press Play. Cue keys work outside text fields.</p></header>
    {!loaded ? <div className="audio-loading" aria-hidden="true"/> : <>
       <div className="audio-bankbar"><label>Banks <select disabled={saving} aria-label="Sound bank" value={bank.id} onChange={e=>void persist({...config,selectedBankId:e.target.value})}>{config.banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button disabled={saving||config.banks.length>=MAX_BANKS} onClick={create}>New bank</button>{editingName===null?<button disabled={saving} onClick={()=>setEditingName(bank.name)}>Rename bank</button>:<><label>Bank name <input disabled={saving} aria-label="Bank name" maxLength={80} value={editingName} onChange={e=>setEditingName(e.target.value)}/></label><button disabled={saving} onClick={rename}>Save bank name</button><button disabled={saving} onClick={()=>setEditingName(null)}>Cancel rename</button></>}<button disabled={saving||config.banks.length<=1} title={config.banks.length<=1?'Keep at least one bank':''} onClick={remove}>Delete bank</button><span>{config.banks.length}/{MAX_BANKS} banks</span></div>
       <label className="audio-master">Master volume <input disabled={saving} aria-label="Master volume" type="range" min="0" max="100" value={config.masterVolume} onChange={e=>void persist({...config,masterVolume:Number(e.target.value)})}/><span>{config.masterVolume}%</span></label>
      {bank.slots.every(s=>!s.asset) && <div className="audio-empty"><strong>No sounds in this bank</strong><p>Choose an empty pad, then import a sound to start your soundboard.</p></div>}
      <div className="audio-pads">{bank.slots.map((slot: AudioSlot, i: number) => { const asset=config.assets.find(a=>a.id===slot.asset); const isMissing=missing.includes(slot.id); return <article key={slot.id} className={slot.loop?'is-looping':''}>
        <h3>Pad {i+1}</h3><p className="audio-name" title={asset?.name}>{isMissing?'File missing':asset?.name??'Empty'}</p><p className="audio-mode">{asset?(slot.loop?'Looping':'One-shot'):'—'}{asset&&<span> · {isMissing?'File missing':'Ready'}</span>}</p>
          <div className="audio-actions">{asset&&!isMissing&&<><button onClick={()=>void play(slot)}>Play</button><button onClick={()=>player.current?.stopAll()}>Stop</button></>}{(!asset||isMissing)&&<button disabled={busy||saving} onClick={()=>void importSound(slot.id)}>{isMissing?'Relink sound':'Import sound'}</button>}{asset&&<button disabled={saving} onClick={()=>{if(window.confirm(`Clear the sound from pad ${i+1}? This does not delete the imported file.`)){changeSlot(slot,{asset:null,loop:false});setMissing(ids=>ids.filter(id=>id!==slot.id));}}}>Clear pad</button>}</div>
         {asset&&<><label className="audio-volume">Pad volume <input disabled={saving} aria-label={`Pad ${i+1} volume`} type="range" min="0" max="100" value={slot.volume} onChange={e=>changeSlot(slot,{volume:Number(e.target.value)})}/><span>{slot.volume}%</span></label><label className="audio-loop"><input disabled={saving} type="checkbox" checked={slot.loop} onChange={e=>changeSlot(slot,{loop:e.target.checked})}/>Loop ambience</label></>}
      </article>; })}</div>
      <CueEditor banks={config.banks} assets={config.assets} bindings={config.cues} saving={saving} onStatus={setMessage} onChange={cues=>void persist({...config,cues},'shortcut')}/>
     <p className="audio-limits">25 MiB per file · 256 MiB total · 10 minutes per sound</p><button className="audio-stop-all" onClick={()=>{player.current?.stopAll();setMessage('All sounds stopped.');}}>Stop all</button>
    </>}
    <p className="audio-status" role="status" aria-live="polite">{message}</p>
  </section>;
}
