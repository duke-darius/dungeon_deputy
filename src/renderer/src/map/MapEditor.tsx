import { useEffect, useRef, useState } from 'react';
import { command, publishMapRaster } from '../api';
import { MapCanvas, rasterizePublicMap } from './MapCanvas';
import type { MapState } from './types';
import { SCENES, sceneById } from '../contracts.mjs';

type Workspace = 'scenes' | 'map';
type Presentation = { mode: string; sceneId: string | null };

export default function MapEditor() {
  const [mode, setMode] = useState<Workspace>('map');
  const [sceneId, setSceneId] = useState('ashen-road');
  const [publicPresentation, setPublicPresentation] = useState<Presentation>({ mode: 'black', sceneId: null });
  const [displays, setDisplays] = useState<Array<{ id: number; label: string }>>([]);
  const [displayId, setDisplayId] = useState<number | null>(null);
  const [state, setState] = useState<MapState | null>(null);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [fogTool, setFogTool] = useState<'reveal'|'hide'|null>(null);
  const [brushSize, setBrushSize] = useState(96);
  const [encounter, setEncounter] = useState<any>(null);
  const [encounterBusy, setEncounterBusy] = useState(false);
  const [die, setDie] = useState(20);
  const [modifier, setModifier] = useState(0);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (text: string, duration = 3500) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(''), duration);
  };

  useEffect(() => () => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
  }, []);

  const refresh = async () => {
    try {
      const next = await command('/api/map') as MapState;
      setState(next);
      setDirty(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load the saved map.');
    }
  };

  useEffect(() => {
    void refresh();
    void command('/api/encounter').then(setEncounter).catch(() => notify('Encounter state could not be loaded.'));
    void (async () => {
      try {
        const [prefs, targets, current] = await Promise.all([
          window.dungeonDeputy.preferences?.(),
          window.dungeonDeputy.displays?.(),
          window.dungeonDeputy.getPresentation(),
        ]);
        if (prefs) {
          setSceneId(prefs.sceneId);
          setDisplayId(prefs.displayId);
        }
        setDisplays(targets ?? []);
        setPublicPresentation(current as Presentation);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Scene controls are unavailable.');
      }
    })();
  }, []);

  const chooseScene = async (id: string) => {
    setSceneId(id);
    try {
      await command(`/api/selection/${id}`, 'POST');
      await window.dungeonDeputy.preferences?.({ sceneId: id, displayId });
      notify('Private preview updated.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Scene preview could not be selected.');
    }
  };

  const showScene = async () => {
    try {
      setPublicPresentation(await command(`/api/show/${sceneId}`, 'POST') as Presentation);
      notify('Scene shown on table.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Scene could not be shown.');
    }
  };

  const draft = state?.draft;
  const update = (patch: Partial<NonNullable<typeof draft>>) => {
    if (!draft || !state) return;
    setState({ ...state, draft: { ...draft, ...patch } });
    setDirty(true);
  };
  const applySavedMap = (saved: MapState) => setState(current => current
    ? { ...saved, draft: { ...saved.draft, name: current.draft.name, image: current.draft.image, gridVisible: current.draft.gridVisible, scale: current.draft.scale } }
    : saved);

  const save = async () => {
    if (!draft || !dirty) return;
    try {
      await command('/api/map/draft', 'PUT', draft);
      setDirty(false);
      notify('Map saved on this device.');
    } catch (error) {
      notify(error instanceof Error ? `${error.message} Save changes to retry.` : 'Map could not be saved. Save changes to retry.', 6000);
    }
  };

  const tokenChange = async (id: string, change: Record<string, unknown>) => {
    try {
      const saved = 'visible' in change
        ? await command(`/api/map/token/${id}/visibility?visible=${String(change.visible)}`, 'PATCH')
        : await command(`/api/map/token/${id}`, 'PATCH', change);
      applySavedMap(saved as MapState);
      if ('visible' in change && publicPresentation.mode === 'map' && saved) {
        const map = (saved as MapState).draft;
        setPublicPresentation(await publishMapRaster({ imageData: await rasterizePublicMap(map.image, map.fogEnabled ?? false, map.fogStrokes ?? []) }, true) as Presentation);
      }
      notify('Token updated.');
    } catch (error) {
      notify(error instanceof Error ? `${error.message} Save changes to retry.` : 'Token could not be updated.', 6000);
    }
  };

  const add = async (kind: 'hero' | 'monster') => {
    const id = window.crypto.randomUUID();
    try {
      applySavedMap(await command('/api/map/token', 'POST', {
        id,
        name: kind === 'hero' ? 'New hero' : 'New goblin',
        kind,
        color: kind === 'hero' ? '#b58d51' : '#718b68',
        x: 500,
        y: 400,
        artwork: kind === 'hero' ? 'hero.svg' : 'goblin.svg',
      }) as MapState);
      setSelected(id);
      notify(`${kind === 'hero' ? 'Hero' : 'Monster'} added.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Token could not be added.');
    }
  };

  const showMap = async () => {
    if (!draft) return;
    try {
      if (dirty) await command('/api/map/draft', 'PUT', draft);
      const imageData = await rasterizePublicMap(draft.image, draft.fogEnabled ?? false, draft.fogStrokes ?? []);
      const approved = await publishMapRaster({ imageData }) as MapState;
      applySavedMap(approved);
      setPublicPresentation({ mode: 'map', sceneId: null });
      setDirty(false);
      notify('Map shown on table.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Map could not be shown.', 6000);
    }
  };

  const applyFogCommand = async (path: string, body?: unknown) => {
    try {
      const saved = await command(path, 'POST', body) as MapState;
      applySavedMap(saved);
      if (publicPresentation.mode === 'map') {
        const map = saved.draft;
        setPublicPresentation(await publishMapRaster({ imageData: await rasterizePublicMap(map.image, map.fogEnabled ?? false, map.fogStrokes ?? []) }, true) as Presentation);
      }
      notify('Fog change saved.');
    } catch {
      notify("Couldn’t save this change. Your last saved state is unchanged; retry the action.", 6000);
    }
  };

  const encounterCommand = async (path: string, method = 'POST', body?: unknown, successText = 'Encounter updated.') => {
    if (encounterBusy) return;
    setEncounterBusy(true);
    try { setEncounter(await command(path, method, body)); notify(successText); }
    catch { notify("Couldn't save this change. Your last saved state is unchanged; retry the action.", 6000); }
    finally { setEncounterBusy(false); }
  };
  const moveTieOrder = async (actor: any, index: number, direction: -1 | 1) => {
    const neighbor = encounter?.actors[index + direction];
    if (!neighbor || actor.initiative !== neighbor.initiative || encounterBusy) return;
    setEncounterBusy(true);
    try {
      const first = await command(`/api/encounter/actors/${actor.tokenId}/tie-break`, 'PUT', {order:neighbor.tieBreakOrder});
      setEncounter(await command(`/api/encounter/actors/${neighbor.tokenId}/tie-break`, 'PUT', {order:actor.tieBreakOrder}) ?? first);
      notify('Initiative tie order updated.');
    } catch { notify("Couldn't save this change. Your last saved state is unchanged; retry the action.",6000); }
    finally { setEncounterBusy(false); }
  };

  const blackout = async () => {
    try {
      await command('/api/blackout', 'POST');
      setPublicPresentation({ mode: 'black', sceneId: null });
      notify('Table display blacked out.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Blackout failed.', 6000);
    }
  };

  const removeToken = async (id: string) => {
    try {
      applySavedMap(await command(`/api/map/token/${id}`, 'DELETE') as MapState);
      setSelected(null);
      notify('Token removed.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Token could not be removed.', 6000);
    }
  };

  return <main className="map-desk">
    <header className="map-top">
      <a className="brand" href="/">Dungeon Deputy</a>
      <div className="map-heading"><small>Campaign / The Ashen Road</small><h1>{draft?.name ?? 'Map editor'}</h1></div>
      <span className={`draft-state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'Private draft'}</span>
    </header>

    <nav className="work-mode" aria-label="Workspace">
      <button aria-pressed={mode === 'scenes'} onClick={() => setMode('scenes')}>Scenes</button>
      <button aria-pressed={mode === 'map'} onClick={() => setMode('map')}>Battle map</button>
    </nav>

    {mode === 'scenes' && <section className="scene-mode" aria-label="Scene presentation">
      <div className="scene-mode-choices">
        <h2>Choose a scene</h2>
        {SCENES.map(scene => <button key={scene.id} aria-pressed={sceneId === scene.id} onClick={() => void chooseScene(scene.id)}>{scene.title}</button>)}
        <p>Choosing a scene only changes your private preview.</p>
      </div>
      <div className="scene-preview">
        <img src={sceneById(sceneId)?.image} alt={sceneById(sceneId)?.title} />
        <h2>Private preview · {sceneById(sceneId)?.title}</h2>
        <div className="scene-actions">
          <button onClick={() => void chooseScene(sceneId)}>Preview privately</button>
          <button className="primary-action" onClick={() => void showScene()}>Show scene on table</button>
          <button className="danger-action" onClick={() => void blackout()}>Black out</button>
        </div>
        <p className="table-state">Table display: <strong>{publicPresentation.mode === 'black' ? 'Black screen' : sceneById(publicPresentation.sceneId)?.title ?? 'Approved map'}</strong></p>
        <label className="display-choice">External display
          <select aria-label="External display" value={displayId ?? ''} onChange={async event => {
            const next = event.target.value === '' ? null : Number(event.target.value);
            setDisplayId(next);
            try {
              await window.dungeonDeputy.preferences?.({ sceneId, displayId: next });
              notify('Display preference saved.');
            } catch (error) {
              notify(error instanceof Error ? error.message : 'Display preference could not be saved.');
            }
          }}>
            <option value="">Windowed preview (safe fallback)</option>
            {displays.map(display => <option key={display.id} value={display.id}>{display.label}</option>)}
          </select>
        </label>
        <p role="status" className="display-note">{displays.length ? 'External display available.' : 'No external display detected; the player window stays safely windowed.'}</p>
      </div>
    </section>}

    {mode === 'map' && <div className="map-layout">
      <nav className="map-rail" aria-label="Map scenes">
        <h2>Maps</h2>
        <button className="active-map">The Crooked Tankard</button>
        <button onClick={async () => {
          try {
            await command('/api/map/blank', 'POST');
            await refresh();
            setSelected(null);
            notify('Blank map created.');
          } catch (error) {
            notify(error instanceof Error ? error.message : 'Blank map could not be created.');
          }
        }}>+ Blank map</button>
        <p>Draft edits stay private until you show the map.</p>
      </nav>

      <section className="map-workspace" aria-label="Map editor">
        <div className="map-toolbar">
          {!draft?.fogEnabled && <button className="quiet-action" onClick={() => {
            const confirmConceal = publicPresentation.mode !== 'black' && window.confirm('Enable fog and conceal the map currently shown on the table?');
            if (publicPresentation.mode === 'black' || confirmConceal) void applyFogCommand('/api/map/fog/enable');
          }}>Enable fog</button>}
          {draft?.fogEnabled && <>
            <button aria-pressed={fogTool === 'reveal'} onClick={() => setFogTool(fogTool === 'reveal' ? null : 'reveal')}>Reveal</button>
            <button aria-pressed={fogTool === 'hide'} onClick={() => setFogTool(fogTool === 'hide' ? null : 'hide')}>Hide</button>
            <label>Brush size <input aria-label="Brush size" type="range" min="16" max="320" step="8" value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} /><span>{brushSize} map px</span></label>
          </>}
          <button className="save-action" disabled={!dirty} onClick={() => void save()}>{dirty ? 'Save changes' : 'Saved'}</button>
          <label className="grid-toggle"><input type="checkbox" checked={draft?.gridVisible ?? false} onChange={event => update({ gridVisible: event.target.checked })} />Square grid</label>
          <label className="scale-control">Scale <input aria-label="Grid scale" type="range" min="24" max="96" step="4" value={draft?.scale ?? 48} onChange={event => update({ scale: Number(event.target.value) })} /><span>{draft?.scale ?? 48}px</span></label>
          <span className="scale-note">Grid spacing</span>
          <button className="quiet-action" onClick={() => void refresh()}>Reload saved map</button>
        </div>
        {draft
          ? <MapCanvas image={draft.image} gridVisible={draft.gridVisible} scale={draft.scale} tokens={draft.tokens} fogEnabled={draft.fogEnabled ?? false} fogStrokes={draft.fogStrokes ?? []} fogTool={fogTool} brushSize={brushSize} onStroke={stamps => void applyFogCommand('/api/map/fog/strokes', { mode: fogTool, stamps })} onMove={(id, x, y) => void tokenChange(id, { x, y })} />
          : <div className="map-loading" role="status">Loading saved map…</div>}
        <div className="token-tray" aria-label="Tokens on map">
          <span className="tray-title">Tokens <small>{draft?.tokens.length ?? 0}</small></span>
          {draft?.tokens.map(token => <button key={token.id} aria-label={`${token.name}, ${token.kind}`} style={{ '--token': token.color } as React.CSSProperties} onClick={() => setSelected(token.id)}>{token.name}</button>)}
          <span className="tray-divider" aria-hidden="true" />
          <button className="add-token" onClick={() => void add('hero')}>+ Hero</button>
          <button className="add-token" onClick={() => void add('monster')}>+ Monster</button>
        </div>
      </section>

      <aside className="map-inspector" aria-label="Table display">
        <div className="display-status"><span className={`status-light ${publicPresentation.mode === 'black' ? 'is-black' : 'is-live'}`} />
          <div><small>Table display</small><strong>{publicPresentation.mode === 'black' ? 'Black screen' : state?.approved?.name ?? 'Showing map'}</strong></div>
        </div>
        <h2>Publish draft</h2>
        <p>Only shown maps appear on the player screen.</p>
            <button className="primary-action publish-action" disabled={!draft} onClick={() => void showMap()}>Show encounter</button>
        <button className="danger-action blackout-action" onClick={() => void blackout()}>Black out</button>

        <section className="encounter-inspector" aria-label="Encounter — DM only">
          <h2>Encounter <span aria-label="Locked">🔒</span> <small>DM only</small></h2>
          {!encounter ? <p role="status">Loading encounter.</p> : encounter.actors.length === 0 ? <><strong>No actors in this encounter</strong><p>Add a map token to track it here.</p></> : <>
            <ol className="encounter-order" aria-label="Initiative order">{encounter.actors.map((actor: any, index: number) => <li key={actor.tokenId} className={encounter.activeTokenId === actor.tokenId ? 'current-turn' : ''}>
              <button title={draft?.tokens.find(token => token.id === actor.tokenId)?.name} onClick={() => setSelected(actor.tokenId)}>{draft?.tokens.find(token => token.id === actor.tokenId)?.name ?? actor.tokenId} <span>{actor.Initiative ?? actor.initiative ?? '—'}</span>{encounter.activeTokenId === actor.tokenId && <small>Current turn</small>}</button>
              <span className="tie-controls"><button aria-label="Move earlier" disabled={index === 0 || encounterBusy || encounter.actors[index-1]?.initiative !== actor.initiative} onClick={() => void moveTieOrder(actor,index,-1)}>↑</button><button aria-label="Move later" disabled={index === encounter.actors.length - 1 || encounterBusy || encounter.actors[index+1]?.initiative !== actor.initiative} onClick={() => void moveTieOrder(actor,index,1)}>↓</button></span>
            </li>)}</ol>
            <button className="primary-action" disabled={encounterBusy || !encounter.actors.some((actor: any) => actor.initiative != null)} onClick={() => void encounterCommand('/api/encounter/turn/end', 'POST', undefined, 'Turn advanced.')}>End turn</button>
            {selected && encounter.actors.some((actor: any) => actor.tokenId === selected) && (() => { const actor = encounter.actors.find((item: any) => item.tokenId === selected); const token = draft?.tokens.find(item => item.id === selected); return <div className="encounter-fields">
              <h3>{token?.name ?? selected}</h3>
              <label>🔒 HP · DM only <span><input aria-label="Current HP" type="number" min="0" max="9999" placeholder="—" defaultValue={actor.currentHp ?? ''} /> / <input aria-label="Maximum HP" type="number" min="0" max="9999" placeholder="—" defaultValue={actor.maximumHp ?? ''} /></span><button disabled={encounterBusy} onClick={event => { const root=event.currentTarget.parentElement!; void encounterCommand(`/api/encounter/actors/${selected}/hp`, 'PUT', { current: Number((root.querySelector('[aria-label="Current HP"]') as HTMLInputElement | null)?.value), maximum: Number((root.querySelector('[aria-label="Maximum HP"]') as HTMLInputElement | null)?.value) }); }}>Save HP</button></label>
              <label>🔒 Conditions · DM only <select aria-label="Add condition" onChange={event => { const ids=[...(actor.conditionIds ?? [])]; if(event.target.value && !ids.includes(event.target.value)) ids.push(event.target.value); void encounterCommand(`/api/encounter/actors/${selected}/conditions`, 'PUT', { conditionIds: ids }); event.target.value=''; }}><option value="">Add condition</option>{encounter.conditions?.map((condition: any)=><option key={condition.id} value={condition.id}>{condition.name}</option>)}</select></label><div className="condition-chips">{(actor.conditionIds ?? []).map((id: string)=><button key={id} disabled={encounterBusy} onClick={() => void encounterCommand(`/api/encounter/actors/${selected}/conditions`, 'PUT', {conditionIds: actor.conditionIds.filter((entry: string)=>entry!==id)})}>{encounter.conditions?.find((item: any)=>item.id===id)?.name ?? id} ×</button>)}</div>
              <label>🔒 Initiative · DM only <input aria-label="Initiative" type="number" placeholder="—" defaultValue={actor.initiative ?? ''} /><small>{actor.initiativeSource ?? 'Unset'}</small><button disabled={encounterBusy} onClick={event => { const input=event.currentTarget.parentElement?.querySelector('input'); if(input?.value) void encounterCommand(`/api/encounter/actors/${selected}/initiative`, 'PUT', {value:Number(input.value)}); }}>Set initiative</button><button disabled={encounterBusy} onClick={() => void encounterCommand(`/api/encounter/actors/${selected}/initiative/roll`, 'POST')}>Roll d20</button></label>
            </div>; })()}
            <div className="dice-controls"><label>🔒 Roll dice · DM only <select aria-label="Dice" value={die} onChange={event=>setDie(Number(event.target.value))}>{[4,6,8,10,12,20,100].map(side=><option key={side} value={side}>d{side}</option>)}</select><input aria-label="Dice modifier" type="number" value={modifier} onChange={event=>setModifier(Number(event.target.value))}/></label><button disabled={encounterBusy} onClick={() => void encounterCommand('/api/encounter/dice','POST',{sides:die,modifier},'Dice rolled (DM only).')}>Roll dice</button>{encounter.rolls?.length>0 && <p>🔒 DM only · Result: {encounter.rolls.at(-1).total}</p>}</div>
          </>}
        </section>

        {selected && draft?.tokens.find(token => token.id === selected) && (() => {
          const token = draft.tokens.find(item => item.id === selected)!;
          return <section className="token-inspector" aria-label="Selected token inspector">
            <h2>Selected token</h2>
            <label>Name <input aria-label="Token name" value={token.name} onChange={event => update({ tokens: draft.tokens.map(item => item.id === selected ? { ...item, name: event.target.value } : item) })} onBlur={() => void tokenChange(token.id, { name: token.name })} /></label>
            <label>Color <input aria-label="Token color" type="color" value={token.color} onChange={event => void tokenChange(token.id, { color: event.target.value })} /></label>
            <label>Artwork <select aria-label="Token artwork" value={token.artwork} onChange={event => void tokenChange(token.id, { artwork: event.target.value })}><option value="hero.svg">Hero</option><option value="goblin.svg">Goblin</option></select></label>
            <button className="quiet-action" aria-label={token.visible === false ? 'Show token' : 'Hide token'} onClick={() => void tokenChange(token.id, { visible: token.visible === false })}>{token.visible === false ? 'Show token' : 'Hide token'}</button>
            <button className="quiet-action remove-action" onClick={() => void removeToken(token.id)}>Remove token</button>
          </section>;
        })()}
      </aside>
    </div>}

    {message && <p className="map-toast" role="status" aria-live="polite">{message}</p>}
  </main>;
}
