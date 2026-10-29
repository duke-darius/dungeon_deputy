import { useEffect, useRef, useState } from 'react';
import { command } from '../api';
import { MapCanvas } from './MapCanvas';
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
      applySavedMap(await command(`/api/map/token/${id}`, 'PATCH', change) as MapState);
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
      const approved = await command('/api/map/show', 'POST') as MapState;
      applySavedMap(approved);
      setDirty(false);
      notify('Map shown on table.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Map could not be shown.', 6000);
    }
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
          <button className="save-action" disabled={!dirty} onClick={() => void save()}>{dirty ? 'Save changes' : 'Saved'}</button>
          <label className="grid-toggle"><input type="checkbox" checked={draft?.gridVisible ?? false} onChange={event => update({ gridVisible: event.target.checked })} />Square grid</label>
          <label className="scale-control">Scale <input aria-label="Grid scale" type="range" min="24" max="96" step="4" value={draft?.scale ?? 48} onChange={event => update({ scale: Number(event.target.value) })} /><span>{draft?.scale ?? 48}px</span></label>
          <span className="scale-note">Grid spacing</span>
          <button className="quiet-action" onClick={() => void refresh()}>Reload saved map</button>
        </div>
        {draft
          ? <MapCanvas image={draft.image} gridVisible={draft.gridVisible} scale={draft.scale} tokens={draft.tokens} onMove={(id, x, y) => void tokenChange(id, { x, y })} />
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
        <button className="primary-action publish-action" disabled={!draft} onClick={() => void showMap()}>Show on table</button>
        <button className="danger-action blackout-action" onClick={() => void blackout()}>Black out</button>

        {selected && draft?.tokens.find(token => token.id === selected) && (() => {
          const token = draft.tokens.find(item => item.id === selected)!;
          return <section className="token-inspector" aria-label="Selected token inspector">
            <h2>Selected token</h2>
            <label>Name <input aria-label="Token name" value={token.name} onChange={event => update({ tokens: draft.tokens.map(item => item.id === selected ? { ...item, name: event.target.value } : item) })} onBlur={() => void tokenChange(token.id, { name: token.name })} /></label>
            <label>Color <input aria-label="Token color" type="color" value={token.color} onChange={event => void tokenChange(token.id, { color: event.target.value })} /></label>
            <label>Artwork <select aria-label="Token artwork" value={token.artwork} onChange={event => void tokenChange(token.id, { artwork: event.target.value })}><option value="hero.svg">Hero</option><option value="goblin.svg">Goblin</option></select></label>
            <button className="quiet-action remove-action" onClick={() => void removeToken(token.id)}>Remove token</button>
          </section>;
        })()}
      </aside>
    </div>}

    {message && <p className="map-toast" role="status" aria-live="polite">{message}</p>}
  </main>;
}
