import { useEffect, useState } from 'react';
// @ts-ignore Shared cue model owns runtime allowlist validation.
import { normalizeChord, shouldIgnoreCueEvent } from './cues.mjs';
import { SCENES } from '../contracts.mjs';

type Target = { kind: 'pad'; bankId: string; slotId: string } | { kind: 'scene'; sceneId: string } | { kind: 'current'|'blackout' };
type Binding = { chord: string; target: Target };
type Bank = { id: string; name: string; slots: Array<{ id: string; asset: string|null }> };
export default function CueEditor({ banks, assets, bindings, saving, onChange, onStatus }: { banks: Bank[]; assets: Array<{id:string;name:string}>; bindings: Binding[]; saving: boolean; onChange: (next: Binding[]) => void; onStatus: (message:string) => void }) {
  const [capture, setCapture] = useState<number|null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (capture === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || shouldIgnoreCueEvent(event)) return;
      if (event.key === 'Escape') { event.preventDefault(); setCapture(null); setMessage('Shortcut recording cancelled.'); onStatus('Shortcut recording cancelled.'); return; }
      const chord = normalizeChord(event); if (!chord) return;
      event.preventDefault();
      const conflict = bindings.findIndex((binding, i) => i !== capture && binding.chord === chord);
      if (conflict !== -1) { const target=bindings[conflict].target; const targetBank=target.kind==='pad'?banks.find(bank=>bank.id===target.bankId):undefined; const description=target.kind==='pad'?`${targetBank?.name??'Sound bank'}, Pad ${Number(target.slotId?.replace('pad-',''))||1}`:target.kind==='scene'?`Show ${SCENES.find(scene=>scene.id===target.sceneId)?.title??'scene'}`:target.kind==='current'?'Show current encounter':'Blackout'; const feedback=`${chord} is already assigned to ${description}. Existing cue unchanged.`; setMessage(feedback); onStatus(feedback); return; }
      update(capture, { chord }); setCapture(null); setMessage(`${chord} recorded.`);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [capture, bindings, banks, onStatus]);
  const add = () => { onChange([...bindings, { chord: '', target: { kind: 'blackout' } }]); setCapture(bindings.length); };
  const update = (index: number, patch: Partial<Binding>) => onChange(bindings.map((binding, i) => i === index ? { ...binding, ...patch } : binding));
  return <section className="cue-editor" aria-label="Cue shortcuts">
    <h3>Cue shortcuts</h3><p>In-app only. Use Ctrl/Cmd + Shift/Alt + a key. Shortcuts are paused while editing text.</p>
    {bindings.map((binding, index) => <div className="cue-row" key={index}>
      <div className="cue-targets">
        <label>Cue target <select disabled={saving} aria-label={`Cue target ${index+1}`} value={binding.target.kind} onChange={event => {
          const kind = event.target.value;
          const target: Target = kind === 'pad' ? { kind, bankId: banks[0]?.id ?? '', slotId: 'pad-1' } : kind === 'scene' ? { kind, sceneId: SCENES[0].id } : { kind: kind as 'current'|'blackout' };
          update(index, { target });
        }}><option value="pad">Play pad</option><option value="scene">Show scene</option><option value="current">Show current encounter</option><option value="blackout">Blackout</option></select></label>
        {binding.target.kind === 'pad' && <><label>Bank <select disabled={saving} aria-label={`Cue bank ${index+1}`} value={binding.target.bankId} onChange={e=>update(index,{target:{...binding.target as Extract<Target,{kind:'pad'}>,bankId:e.target.value}})}>{banks.map(bank=><option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></label><label>Pad <select disabled={saving} aria-label={`Cue pad ${index+1}`} value={binding.target.slotId} onChange={e=>update(index,{target:{...binding.target as Extract<Target,{kind:'pad'}>,slotId:e.target.value}})}>{banks.find(bank=>bank.id===('bankId' in binding.target ? binding.target.bankId : ''))?.slots.map((slot,i)=><option key={slot.id} value={slot.id}>Pad {i+1}{slot.asset?` · ${assets.find(a=>a.id===slot.asset)?.name??'File missing'}`:' · Empty'}</option>)}</select></label></>}
        {binding.target.kind === 'scene' && <label>Scene <select disabled={saving} aria-label={`Cue scene ${index+1}`} value={binding.target.sceneId} onChange={e=>update(index,{target:{...binding.target as Extract<Target,{kind:'scene'}>,sceneId:e.target.value}})}>{SCENES.map(scene=><option key={scene.id} value={scene.id}>{scene.title}</option>)}</select></label>}
      </div>
      <div className="cue-shortcut-controls">
        {capture===index ? <button aria-pressed="true" onClick={()=>{setCapture(null);setMessage('Shortcut recording cancelled.');onStatus('Shortcut recording cancelled.');}}>Recording… · Cancel</button> : <button disabled={saving} aria-pressed="false" onClick={()=>{setCapture(index);setMessage('Press Ctrl/Cmd + Shift/Alt + a key. Escape cancels.');onStatus('Press Ctrl/Cmd + Shift/Alt + a key. Escape cancels.');}}>Record shortcut</button>}
        <kbd>{binding.chord || 'No shortcut set'}</kbd><button disabled={saving} onClick={()=>{update(index,{chord:''});setCapture(null);}}>Clear shortcut</button><button disabled={saving} aria-label={`Remove cue ${index+1}`} onClick={()=>onChange(bindings.filter((_,i)=>i!==index))}>Remove</button>
      </div>
    </div>)}
    <button disabled={saving} onClick={add}>Add cue</button><button disabled={saving} onClick={()=>{if(window.confirm('Reset all cue shortcuts? Your pads and banks will stay unchanged.'))onChange([]);}}>Reset shortcuts</button>
    {capture!==null && <div className="cue-capture" aria-hidden="true">{message || 'Press Ctrl/Cmd + Shift/Alt + a key. Escape cancels.'}</div>}
    {capture===null && message && <p className="cue-editor-message" aria-live="off">{message}</p>}
  </section>;
}
