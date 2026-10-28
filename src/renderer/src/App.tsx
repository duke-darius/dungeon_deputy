import React, { useCallback, useEffect, useState } from 'react';
import { SCENES, sceneById } from './contracts.mjs';
import type { PublicPresentation } from './contracts.mjs';
import { command, getPresentation } from './api';

export default function App() {
  const [previewId, setPreviewId] = useState(SCENES[0].id);
  const [shown, setShown] = useState<PublicPresentation>({ mode: 'black', sceneId: null, title: null, description: null });
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('Connecting to the local presentation service…');
  const [displays, setDisplays] = useState<Array<{id: number; label: string}>>([]);
  const [displayId, setDisplayId] = useState<number | null>(null);
  const preview = sceneById(previewId)!;

  const refresh = useCallback(async () => {
    try {
      const state = await getPresentation();
      setShown(state.mode === 'scene' && sceneById(state.sceneId) ? state : { mode: 'black', sceneId: null, title: null, description: null });
      setConnected(true);
      setMessage('');
    } catch (error) {
      setConnected(false);
      setShown({ mode: 'black', sceneId: null, title: null, description: null });
      setMessage(error instanceof Error ? error.message : 'The local presentation service is unavailable.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    void Promise.all([window.dungeonDeputy.displays?.(), window.dungeonDeputy.preferences?.()]).then(([items, saved]) => {
      setDisplays(items ?? []); setDisplayId(saved?.displayId ?? null);
      if (saved?.sceneId && sceneById(saved.sceneId)) setPreviewId(saved.sceneId);
    }).catch(() => setMessage('Display preferences could not be loaded.'));
  }, []);

  async function select(id: string) {
    setPreviewId(id);
    try { await command(`/api/selection/${encodeURIComponent(id)}`, 'POST'); await window.dungeonDeputy.preferences?.({ sceneId: id, displayId }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the private selection.'); setConnected(false); }
  }

  async function show() {
    try { await command(`/api/show/${encodeURIComponent(previewId)}`, 'POST'); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not show this scene.'); }
  }

  async function blackout() {
    try { await command('/api/blackout', 'POST'); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not black out the table display.'); }
  }

  return <main className="desk">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Dungeon Deputy command desk"><span className="brand-mark" aria-hidden="true">D</span><span>Dungeon Deputy</span></a>
      <div className="session-title"><span className="session-kicker">Session workspace</span><h1>The Ashen Road</h1></div>
      <div className={`connection ${connected ? 'is-connected' : ''}`} role="status"><span className="status-dot" />{connected ? 'Presentation service connected' : 'Presentation service unavailable'}</div>
    </header>
    <div className="desk-grid">
      <nav className="scene-rail" aria-label="Scenes">
        <div className="section-heading"><h2>Scenes</h2><span>{SCENES.length}</span></div>
        <ul>{SCENES.map((scene) => <li key={scene.id}><button className={`scene-choice ${scene.id === previewId ? 'is-selected' : ''}`} aria-pressed={scene.id === previewId} onClick={() => void select(scene.id)}>
          <img src={scene.image} alt="" /><span>{scene.title}</span><span className="choice-indicator" aria-hidden="true">↗</span>
        </button></li>)}</ul>
        <p className="rail-note">Selecting a scene changes only your private preview.</p>
      </nav>

      <section className="preview-panel" aria-labelledby="preview-title">
        <div className="panel-heading"><div><span className="state-label"><i /> Private preview</span><h2 id="preview-title">{preview.title}</h2></div><span className="local-label">Only you can see this</span></div>
        <div className="hero-frame"><img className="hero-art" src={preview.image} alt={`Illustration of ${preview.title}`} /><span className="frame-caption">Scene preview</span></div>
        <p className="scene-description">{preview.description}</p>
      </section>

      <aside className="table-panel" aria-labelledby="table-title">
        <div className="panel-heading"><div><span className="state-label public-state"><i /> Public output</span><h2 id="table-title">Table display</h2></div><span className={`display-glyph ${connected ? '' : 'is-offline'}`} aria-hidden="true">▰</span></div>
        <div className={`now-showing ${shown.mode === 'black' ? 'is-black' : ''}`}>
          {shown.mode === 'scene' ? <><img src={sceneById(shown.sceneId)?.image} alt="" /><div><span>Showing on table</span><strong>{shown.title}</strong></div></> : <><span className="black-preview" /><div><span>Showing on table</span><strong>Black screen</strong></div></>}
        </div>
        {message && <p className="service-message" role="status">{message}</p>}
        <label className="table-hint">Player display <select value={displayId ?? ''} onChange={async event => { const id = event.target.value ? Number(event.target.value) : null; setDisplayId(id); await window.dungeonDeputy.preferences?.({ sceneId: previewId, displayId: id }); }}><option value="">Automatic / windowed preview</option>{displays.map(display => <option key={display.id} value={display.id}>{display.label}</option>)}</select></label>
        <p className="table-hint">Your private preview stays hidden until you choose to show it.</p>
        <div className="actions"><button className="show-button" onClick={() => void show()} disabled={!connected}>Show on table</button><button className="blackout-button" onClick={() => void blackout()}>Black out</button></div>
        <p className="action-footnote">Black out hides the public scene immediately.</p>
      </aside>
    </div>
    <footer className="desk-footer"><span>Scene art: original project artwork</span><span>Local session · Changes are controlled by the DM</span></footer>
  </main>;
}
