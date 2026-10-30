import { useEffect, useState } from 'react';
// @ts-ignore Shared cue model owns runtime allowlist validation.
import { normalizeChord, shouldIgnoreCueEvent } from './cues.mjs';
import { SCENES } from '../contracts.mjs';

type Target = { kind: 'pad'; bankId: string; slotId: string } | { kind: 'scene'; sceneId: string } | { kind: 'current'|'blackout' };
type Binding = { chord: string; target: Target };
type Bank = { id: string; name: string; slots: Array<{ id: string; asset: string|null }> };
export default function CueEditor({ banks, assets, bindings, onChange }: { banks: Bank[]; assets: Array<{id:string;name:string}>; bindings: Binding[]; onChange: (next: Binding[]) => void }) {
  const [capture, setCapture] = useState<number|null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (capture === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || shouldIgnoreCueEvent(event)) return;
      if (event.key === 'Escape') { event.preventDefault(); setCapture(null); setMessage('Shortcut recording cancelled.'); return; }
      const chord = normalizeChord(event); if (!chord) return;
      event.preventDefault();
      const conflict = bindings.findIndex((binding, i) => i !== capture && binding.chord === chord);
      if (conflict !== -1) { const target=bindings[conflict].target; const description=target.kind==='pad'?`${target.bankId} ${target.slotId}`:target.kind==='scene'?`scene ${target.sceneId}`:target.kind==='current'?'current encounter':'blackout'; setMessage(`${chord} is already assigned to ${description}. Existing cue unchanged.`); return; }
      update(capture, { chord }); setCapture(null); setMessage(`${chord} recorded.`);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [capture, bindings]);
  const add = () => { onChange([...bindings, { chord: '', target: { kind: 'blackout' } }]); setCapture(bindings.length); };
  const update = (index: number, patch: Partial<Binding>) => onChange(bindings.map((binding, i) => i === index ? { ...binding, ...patch } : binding));
  return <section className="cue-editor" aria-label="Cue shortcuts">
    <h3>Cue shortcuts</h3><p>In-app only. Use Ctrl/Cmd + Shift/Alt + a key. Shortcuts are paused while editing text.</p>
    {bindings.map((binding, index) => <div className="cue-row" key={index}>
      <label>Cue target <select aria-label={`Cue target ${index+1}`} value={binding.target.kind} onChange={event => {
        const kind = event.target.value;
        const target: Target = kind === 'pad' ? { kind, bankId: banks[0]?.id ?? '', slotId: 'pad-1' } : kind === 'scene' ? { kind, sceneId: SCENES[0].id } : { kind: kind as 'current'|'blackout' };
        update(index, { target });
      }}><option value="pad">Play pad</option><option value="scene">Show scene</option><option value="current">Show current encounter</option><option value="blackout">Blackout</option></select></label>
      {binding.target.kind === 'pad' && <><label>Bank <select aria-label={`Cue bank ${index+1}`} value={binding.target.bankId} onChange={e=>update(index,{target:{...binding.target as Extract<Target,{kind:'pad'}>,bankId:e.target.value}})}>{banks.map(bank=><option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></label><label>Pad <select aria-label={`Cue pad ${index+1}`} value={binding.target.slotId} onChange={e=>update(index,{target:{...binding.target as Extract<Target,{kind:'pad'}>,slotId:e.target.value}})}>{banks.find(bank=>bank.id===('bankId' in binding.target ? binding.target.bankId : ''))?.slots.map((slot,i)=><option key={slot.id} value={slot.id}>Pad {i+1}{slot.asset?` · ${assets.find(a=>a.id===slot.asset)?.name??'File missing'}`:' · Empty'}</option>)}</select></label></>}
      {binding.target.kind === 'scene' && <label>Scene <select aria-label={`Cue scene ${index+1}`} value={binding.target.sceneId} onChange={e=>update(index,{target:{...binding.target as Extract<Target,{kind:'scene'}>,sceneId:e.target.value}})}>{SCENES.map(scene=><option key={scene.id} value={scene.id}>{scene.title}</option>)}</select></label>}
      {capture===index ? <button onClick={()=>setMessage('Press the required chord. Escape cancels.')}>Record shortcut</button> : <button onClick={()=>{setCapture(index);setMessage('Press Ctrl/Cmd + Shift/Alt + a key. Escape cancels.');}}>Record shortcut</button>}
      <kbd>{binding.chord || 'No shortcut set'}</kbd><button onClick={()=>{update(index,{chord:''});setCapture(null);}}>Clear shortcut</button><button aria-label={`Remove cue ${index+1}`} onClick={()=>onChange(bindings.filter((_,i)=>i!==index))}>Remove</button>
    </div>)}
    <button onClick={add}>Add cue</button><button onClick={()=>{if(window.confirm('Reset all cue shortcuts? Your pads and banks will stay unchanged.'))onChange([]);}}>Reset shortcuts</button>
    {capture!==null && <div className="cue-capture" role="status">{message || 'Press Ctrl/Cmd + Shift/Alt + a key. Escape cancels.'}</div>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
