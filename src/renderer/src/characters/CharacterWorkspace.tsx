import { useEffect, useState } from 'react';
import { characterRuleAvailability, formatAbilityModifier } from './characterRules';
import { createPlayerInvite, getPlayerAssignments, getPlayerHostAddresses, getPlayerSession, revokePlayer, setAssignedHitPoints, startPlayerSession, stopPlayerSession, type PlayerAssignment, type PlayerHostAddress, type PlayerSessionState } from '../api';

type Character = { id: string; name: string; class: string; species: string; level: number; strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number; abilityModifiers: Record<string, number>; proficiencyBonus: number; hitPointMaximum: number; armorClass: number; rulesetVersion: string; support: { pdfSha256: string; citations: Record<string, string>; categoryStatus: Record<string, string> } };
const blank = { name: '', class: 'barbarian', species: 'dwarf', level: 1, strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 };

export default function CharacterWorkspace() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [hostAddresses, setHostAddresses] = useState<PlayerHostAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [pairing, setPairing] = useState<PlayerSessionState | null>(null);
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [invite, setInvite] = useState<{ secret: string; url: string; expiresAt: string; warning: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [pairingMessage, setPairingMessage] = useState('');
  const refresh = async (selectId?: string) => {
    const items = await window.dungeonDeputy.command('/api/characters') as Character[];
    setCharacters(items);
    if (selectId) {
      const item = await window.dungeonDeputy.command(`/api/characters/${selectId}`) as Character;
      setSelected(item); setForm({ name: item.name, class: item.class, species: item.species, level: item.level, strength: item.strength, dexterity: item.dexterity, constitution: item.constitution, intelligence: item.intelligence, wisdom: item.wisdom, charisma: item.charisma });
    } else if (!selected || !items.some(item => item.id === selected.id)) setSelected(null);
  };
  useEffect(() => { void refresh().catch(() => setMessage('Characters could not be loaded.')); }, []);
  const refreshPairing = async () => {
    const [state, addresses, players] = await Promise.all([getPlayerSession(), getPlayerHostAddresses(), getPlayerAssignments()]);
    setPairing(state); setHostAddresses(addresses); setAssignments(players);
    if (!selectedAddress && addresses.length) setSelectedAddress(addresses[0].address);
  };
  useEffect(() => { void refreshPairing().catch(() => setPairingMessage('Player access status could not be loaded.')); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void Promise.all([getPlayerSession(), getPlayerAssignments()]).then(([state, players]) => {
        setPairing(state); setAssignments(players);
        if (!state.listener.enabled) { setInvite(null); setShowInvite(false); }
      }).catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);
  const enableLan = async () => {
    setPairingMessage('Starting…');
    try { await startPlayerSession(selectedAddress); await refreshPairing(); setInvite(null); setShowInvite(false); setPairingMessage('LAN access on. HTTP traffic is unencrypted.'); }
    catch { setPairingMessage('LAN access could not be started. Confirm the interface is active and try again.'); await refreshPairing().catch(() => {}); }
  };
  const endLan = async () => {
    if (!window.confirm('End this player session? Every invite and player grant will be revoked.')) return;
    setPairingMessage('Stopping…');
    try { await stopPlayerSession(); setInvite(null); setShowInvite(false); await refreshPairing(); setPairingMessage('LAN access off. Player grants were revoked.'); }
    catch { setPairingMessage('Could not stop LAN access; retry and confirm the status is off.'); }
  };
  const issueInvite = async () => {
    if (!selected) return;
    try { const result = await createPlayerInvite(selected.id); setInvite(result); setShowInvite(false); await refreshPairing(); setPairingMessage(`One-time invite created for ${selected.name}.`); }
    catch { setPairingMessage('Invite was not created. Confirm LAN access is on and the character is saved.'); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const saved = await window.dungeonDeputy.command(selected ? `/api/characters/${selected.id}` : '/api/characters', selected ? 'PUT' : 'POST', form) as Character;
      await refresh(saved.id); setMessage('Character saved.');
    } catch { setMessage('Character was not saved. Check the supported values and try again.'); }
    finally { setBusy(false); }
  };
  const update = (key: keyof typeof blank, value: string) => setForm(current => ({ ...current, [key]: key === 'name' ? value : Number(value) }));
  return <section className="character-workspace" aria-labelledby="character-heading">
    <header><div><h2 id="character-heading">Characters</h2><p>DM-only character management · supported rules only</p></div><button type="button" className="primary-action" onClick={() => { setSelected(null); setForm({ ...blank }); setMessage('Creating a new character.'); }}>New character</button></header>
    <div className="character-layout"><nav aria-label="Saved characters"><h3>Saved characters</h3>{characters.length ? characters.map(item => <button key={item.id} type="button" aria-current={selected?.id === item.id ? 'true' : undefined} onClick={() => void refresh(item.id)}>{item.name}<small>Level {item.level} · Barbarian · Dwarf</small></button>) : <p>No characters yet. Create a supported character to start a player sheet.</p>}</nav>
      <form onSubmit={save}><h3>{selected?.name ?? 'New character'}</h3><p>Only the level 1 Barbarian / Dwarf combination is currently calculated.</p>
        <label>Character name<input required maxLength={80} value={form.name} onChange={e => update('name', e.target.value)} /></label>
        <label>Class<select value={form.class} onChange={e => update('class', e.target.value)}><option value="barbarian">Barbarian (supported)</option><option value="wizard" disabled>Wizard (unavailable)</option></select></label>
        <label>Species<select value={form.species} onChange={e => update('species', e.target.value)}><option value="dwarf">Dwarf (supported)</option><option value="elf" disabled>Elf (unavailable)</option></select></label>
        <label>Level<select value={form.level} onChange={e => update('level', e.target.value)}><option value={1}>1 (supported)</option><option value={2} disabled>2 (unavailable)</option></select></label>
        <fieldset><legend>Ability scores</legend><div className="character-abilities">{(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(key => <label key={key}>{key}<input type="number" min="3" max="20" required value={form[key]} onChange={e => update(key, e.target.value)} /></label>)}</div></fieldset>
        {selected && <section className="character-derived" aria-label="Server-calculated values"><h4>Server-calculated values</h4><p>Strength {formatAbilityModifier(selected.abilityModifiers.strength)} · Dexterity {formatAbilityModifier(selected.abilityModifiers.dexterity)} · Constitution {formatAbilityModifier(selected.abilityModifiers.constitution)}</p><p>Proficiency +{selected.proficiencyBonus} · HP {selected.hitPointMaximum} · AC {selected.armorClass}</p><small>{selected.rulesetVersion} · Source PDF SHA-256: {selected.support.pdfSha256}</small></section>}
        <section className="character-derived" aria-label="Unsupported calculations"><h4>Explicitly unavailable</h4><ul>{Object.values(characterRuleAvailability).map(item => <li key={item}>{item}</li>)}</ul></section>
        <p className="character-source">Source: SRD 5.2.1 PDF pages 28-29 (Barbarian), 36-37 (advancement and ability modifiers), 84 (Dwarf). Calculations stay in the authenticated .NET service.</p>
        <button className="primary-action" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save changes'}</button>{selected && <button type="button" disabled={busy} onClick={async () => { if (!window.confirm(`Delete ${selected.name}? This cannot be undone.`)) return; await window.dungeonDeputy.command(`/api/characters/${selected.id}`, 'DELETE'); await refresh(); setMessage('Character deleted.'); }}>Delete character</button>}
        <p role="status" aria-live="polite">{message}</p>
      </form></div>
    <section className="player-access" aria-labelledby="player-access-heading">
      <h3 id="player-access-heading">Player access</h3>
      <p>LAN access is off until you explicitly enable it. No internet relay is used. HTTP traffic is unencrypted and may be observed or changed by other users on this Wi-Fi; enable only on a trusted private LAN.</p>
      {!pairing?.listener.enabled ? <div className="player-access-controls">
        <label>Private LAN interface<select aria-label="Private LAN interface" value={selectedAddress} onChange={event => setSelectedAddress(event.target.value)} disabled={!hostAddresses.length}><option value="">Select an active interface</option>{hostAddresses.map(item => <option key={item.address} value={item.address}>{item.interfaceName} · {item.address}</option>)}</select></label>
        <button type="button" className="primary-action" onClick={() => void enableLan()} disabled={!selectedAddress}>Enable LAN access</button>
        {!hostAddresses.length && <p>No active private LAN interface is available.</p>}
      </div> : <div>
        <p><strong>LAN access on</strong> · Host: <code>{pairing.listener.origin}</code> · Paired players: {assignments.length}/2</p>
        {selected && assignments.length < 2 && !assignments.some(player => player.characterId === selected.id) && <button type="button" className="primary-action" onClick={() => void issueInvite()}>Create invite</button>}
       {assignments.map(player => { const character = characters.find(item => item.id === player.characterId); const hp = player.currentHitPoints ?? character?.hitPointMaximum ?? 0; return <article className="player-assignment" key={player.playerId}><p>Paired character {character?.name ?? 'unavailable'}</p><label>Current HP ({character?.hitPointMaximum ?? 0} max)<input aria-label={`${character?.name ?? 'Player'} current HP`} type="number" min="0" max={character?.hitPointMaximum ?? 0} value={hp} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 0 && value <= (character?.hitPointMaximum ?? 0)) void setAssignedHitPoints(player.playerId, value).then(refreshPairing).catch(() => setPairingMessage('Current HP was not updated.')); }} /></label><p>Player inventory updates</p>{player.inventory.length ? <ul>{player.inventory.map(item => <li key={item.id}>{item.name} · {item.quantity}</li>)}</ul> : <p>No inventory items recorded.</p>}<button type="button" onClick={async () => { if (!window.confirm('Revoke access for this player? Their phone must use a new invite to rejoin.')) return; await revokePlayer(player.playerId); setInvite(null); setShowInvite(false); await refreshPairing(); }}>Revoke access</button></article>; })}
        <button type="button" onClick={() => void endLan()}>End session</button>
      </div>}
      {invite && <div className="player-invite"><p>Single use · expires {new Date(invite.expiresAt).toLocaleString()}</p><button type="button" aria-pressed={showInvite} onClick={() => setShowInvite(value => !value)}>{showInvite ? 'Hide invite' : 'Reveal invite'}</button>{showInvite && <><label>Copyable one-time invitation<input aria-label="One-time invitation" readOnly value={invite.url} /></label><p>{invite.warning}</p></>}</div>}
      <p role="status" aria-live="polite">{pairingMessage}</p>
    </section>
  </section>;
}
