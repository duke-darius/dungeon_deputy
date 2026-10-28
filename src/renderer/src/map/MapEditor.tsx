import { useEffect, useState } from 'react';
import { command } from '../api';
import { MapCanvas } from './MapCanvas';
import type { MapState } from './types';

export default function MapEditor() {
  const [state,setState]=useState<MapState|null>(null),[message,setMessage]=useState('Loading your saved map…');
  const refresh=async()=>{try{const next=await command('/api/map') as MapState;setState(next);setMessage('');}catch(e){setMessage(e instanceof Error?e.message:'Could not load the saved map.');}};
  useEffect(()=>{void refresh();},[]);
  const draft=state?.Draft;
  const update=(patch:Partial<NonNullable<typeof draft>>)=>{if(draft)setState({...state!,Draft:{...draft,...patch}});};
  const save=async()=>{if(!draft)return;try{await command('/api/map/draft','PUT',draft);setMessage('Map saved to this device.');}catch(e){setMessage(e instanceof Error?e.message:'Map could not be saved.');}};
  return <main className="map-desk">
    <header className="map-top"><a className="brand" href="/">Dungeon Deputy</a><div><small>Campaign · The Ashen Road</small><h1>{draft?.Name??'Map editor'}</h1></div><span className="draft-state">Private draft</span></header>
    <div className="map-layout"><nav className="map-rail" aria-label="Map scenes"><h2>Scenes</h2><button className="active-map">The Crooked Tankard</button><button onClick={async()=>{await command('/api/map/blank','POST');await refresh();}}>＋ Blank map</button><p>Changes stay private until shown on the table.</p></nav>
      <section className="map-workspace"><div className="map-toolbar"><button onClick={()=>void save()}>Save changes</button><label><input type="checkbox" checked={draft?.GridVisible??false} onChange={e=>update({GridVisible:e.target.checked})}/> Square grid</label><label>Scale <input aria-label="Grid scale" type="range" min="24" max="96" step="4" value={draft?.Scale??48} onChange={e=>update({Scale:Number(e.target.value)})}/><span>{draft?.Scale??48}px</span></label><span className="scale-note">Adjusts visible grid spacing</span><button onClick={()=>void refresh()}>Reload</button></div>
        {draft&&<MapCanvas image={draft.Image} gridVisible={draft.GridVisible} scale={draft.Scale} tokens={draft.Tokens} onMove={(id,x,y)=>update({Tokens:draft.Tokens.map(t=>t.Id===id?{...t,X:x,Y:y}:t)})}/>}
        <div className="token-tray"><span>On the map</span>{draft?.Tokens.map(token=><button key={token.Id} aria-label={`${token.Name}, ${token.Kind}`} style={{'--token':token.Color} as React.CSSProperties} onClick={()=>setMessage(`${token.Name} · drag it on the map to reposition`)}>{token.Name}</button>)}</div>
      </section><aside className="map-inspector"><span>Table display</span><h2>Approved map</h2><p>{state?.Approved?.Name??'Black screen'}</p><p className="help-copy">Your draft stays private. Publication controls are managed separately.</p><p className="help-copy">Grid spacing is a visual aid, not a physical measurement.</p></aside>
    </div>{message&&<p className="map-message" role="status">{message}</p>}
  </main>;
}
