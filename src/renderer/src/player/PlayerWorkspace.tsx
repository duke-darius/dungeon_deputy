import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayerApiError, sendPlayerCommand, type PlayerCommand, type PlayerSheet } from './playerApi';
import { createPlayerConnection, type PlayerConnectionState } from '../realtime/playerConnection.mjs';

type AccessFailure = 'revoked' | 'ended' | 'expired' | 'invalid';

export default function PlayerWorkspace({ token, onAccessEnded }: { token: string; onAccessEnded: (failure: AccessFailure) => void }) {
  const [sheet, setSheet] = useState<PlayerSheet | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('Loading character…');
  const [publicPresentation, setPublicPresentation] = useState<{ mode: string; title?: string | null }>({ mode: 'black' });
  const [connectionState, setConnectionState] = useState<PlayerConnectionState>('connecting');
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);
  const playerConnection = useRef<ReturnType<typeof createPlayerConnection> | null>(null);

  const handleFailure = useCallback((error: unknown) => {
    if (error instanceof PlayerApiError && [401, 410].includes(error.status)) {
      setSheet(null);
      onAccessEnded(error.code === 'ended' || error.code === 'expired' ? error.code : error.code === 'revoked' ? 'revoked' : 'invalid');
      return;
    }
    setStatus('Disconnected. Your sheet may be out of date. Reconnect to load the latest approved state.');
  }, [onAccessEnded]);

  useEffect(() => {
    let active = true;
    const session = createPlayerConnection({
      token,
      onSnapshot: snapshot => {
        if (!active) return;
        setSheet(snapshot.sheet);
        if (snapshot.presentation) setPublicPresentation(snapshot.presentation);
      },
      onPresentation: fresh => { if (active) setPublicPresentation(fresh); },
      onState: next => {
        if (!active) return;
        setConnectionState(next);
        setStatus(next === 'connected' ? 'Connected' : next === 'connecting' ? 'Connecting to the session…' : next === 'reconnecting' ? 'Connection lost. Your sheet may be out of date; reconnecting.' : 'Disconnected. Your sheet may be out of date. Reconnect to load the latest approved state.');
      },
      onAccessEnded: failure => { if (active) { setSheet(null); onAccessEnded(failure); } },
    });
    playerConnection.current = session;
    void session.start();
    return () => { active = false; playerConnection.current = null; void session.stop(); };
  }, [onAccessEnded, token]);

  const submit = async (command: PlayerCommand): Promise<boolean> => {
    const sequence = ++requestSequence.current;
    setBusy(true); setStatus('Saving change…');
    try { const next = await sendPlayerCommand(token, command); if (sequence === requestSequence.current) { setSheet(next); setStatus('Change saved.'); } return sequence === requestSequence.current; }
    catch (error) {
      if (sequence === requestSequence.current) {
        if (error instanceof PlayerApiError && [401, 410].includes(error.status)) handleFailure(error);
        else if (error instanceof PlayerApiError) setStatus('Change not saved. Check the supported action and try again.');
        else { handleFailure(error); setStatus('Change not saved. Reconnect and try again.'); }
      }
      return false;
    }
    finally { setBusy(false); }
  };

  return <main className="player-sheet" aria-labelledby="player-sheet-heading">
    <header className="player-sheet-header"><p className="player-kicker">Dungeon Deputy · Assigned player sheet</p><h1 id="player-sheet-heading">{sheet?.name ?? 'Player sheet'}</h1><p className="player-connection" role="status" aria-live="polite">{status}</p>
      {connectionState === 'disconnected' && <button type="button" onClick={() => void playerConnection.current?.retry()}>Retry connection</button>}
    </header>
    {sheet && <>
      <p className="player-public-status" role="status">{publicPresentation.mode === 'scene' ? `Approved scene: ${publicPresentation.title ?? 'Current scene'}` : 'Blackout active'}</p>
      <section className="player-sheet-stats" aria-label="Character summary"><p>Level {sheet.level} {sheet.species} {sheet.class}</p><dl><div><dt>Hit point maximum</dt><dd>{sheet.hitPointMaximum}</dd></div><div><dt>Armor Class</dt><dd>{sheet.armorClass}</dd></div><div><dt>Proficiency</dt><dd>+{sheet.proficiencyBonus}</dd></div></dl></section>
      <section aria-labelledby="player-abilities"><h2 id="player-abilities">Abilities</h2><dl className="player-ability-list">{(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(key => <div key={key}><dt>{key}</dt><dd>{sheet[key]} ({sheet.abilityModifiers[key] >= 0 ? '+' : ''}{sheet.abilityModifiers[key]})</dd></div>)}</dl></section>
      <section aria-labelledby="player-inventory"><h2 id="player-inventory">Inventory</h2><p className="player-help">Player-managed inventory tracker. Item names are not rules-validated and do not change character calculations.</p>
        {sheet.inventory.length ? <ul className="player-inventory-list">{sheet.inventory.map(item => <li key={item.id}><span>{item.name} · {item.quantity}</span><button type="button" disabled={busy} onClick={() => void submit({ type: 'removeInventory', itemId: item.id, quantity: 1 })}>Remove item</button></li>)}</ul> : <p>No inventory items recorded.</p>}
        <form className="player-add-item" onSubmit={async event => { event.preventDefault(); if (await submit({ type: 'addInventory', name: itemName, quantity })) { setItemName(''); setQuantity(1); } }}>
          <label>Item name<input maxLength={60} required value={itemName} onChange={event => setItemName(event.target.value)} disabled={busy} /></label>
          <label>Quantity<input type="number" min={1} max={99} value={quantity} onChange={event => setQuantity(Number(event.target.value))} disabled={busy} /></label>
          <button type="submit" disabled={busy || !itemName.trim()}>Add item</button>
        </form>
      </section>
      <section aria-labelledby="player-resources"><h2 id="player-resources">Resources</h2>{sheet.resources.length ? <ul className="player-resource-list">{sheet.resources.map(resource => <li key={resource.id}><span>{resource.id} · {resource.remaining} remaining</span><button type="button" disabled={busy || resource.remaining < 1} onClick={() => void submit({ type: 'useResource', resourceId: resource.id })}>Use resource</button></li>)}</ul> : <p>No supported resources are available for this character.</p>}</section>
      <small className="player-ruleset">Calculated values · {sheet.rulesetVersion}</small>
    </>}
  </main>;
}
