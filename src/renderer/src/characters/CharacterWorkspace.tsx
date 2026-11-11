import { useEffect, useState } from 'react';
import { characterRuleAvailability, formatAbilityModifier } from './characterRules';
import { createPlayerInvite, getPlayerAssignments, getPlayerHostAddresses, getPlayerSession, revokePlayer, setAssignedHitPoints, startPlayerSession, stopPlayerSession, type PlayerAssignment, type PlayerHostAddress, type PlayerSessionState } from '../api';

type Character = { id: string; name: string; class: string; species: string; level: number; totalExperiencePoints:number; equipmentPackage:string; inventory:{itemId:string;quantity:number;equipped:boolean}[]; goldPieces:number; shieldEquipped:boolean; cantrips:string[]; spellbook:string[]; preparedSpells:string[]; skillProficiencies:string[]; spellSlotMaximum:number; currentSpellSlots:number; rageMaximum:number; currentRageUses:number; stonecunningMaximum:number; currentStonecunningUses:number; arcaneRecoveryAvailable:boolean; arcaneRecoveryUsed:boolean; spellSaveDc:number; spellAttackBonus:number; strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number; abilityModifiers: Record<string, number>; proficiencyBonus: number; hitPointMaximum: number; armorClass: number; rulesetVersion: string; support: { pdfSha256: string; citations: Record<string, string>; categoryStatus: Record<string, string> } };
const wizardCantrips = ['acid-splash','fire-bolt','light'];
const wizardSpellbook = ['alarm','burning-hands','detect-magic','disguise-self','magic-missile','shield'];
const barbarianSkills = ['animal-handling','athletics','intimidation','nature','perception','survival'];
const wizardSkills = ['arcana','history','insight','investigation','medicine','religion'];
const blank = { name: '', class: 'barbarian', species: 'dwarf', level: 1, totalExperiencePoints: 0, equipmentPackage: 'A', shieldEquipped: false, cantrips: [] as string[], spellbook: [] as string[], preparedSpells: [] as string[], skillProficiencies: ['athletics','perception'] as string[], strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 };

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
      setSelected(item); setForm({ ...blank, name: item.name, class: item.class, species: item.species, level: item.level, totalExperiencePoints:item.totalExperiencePoints, equipmentPackage:item.equipmentPackage, shieldEquipped:item.shieldEquipped, cantrips:item.cantrips, spellbook:item.spellbook, preparedSpells:item.preparedSpells, skillProficiencies:item.skillProficiencies, strength: item.strength, dexterity: item.dexterity, constitution: item.constitution, intelligence: item.intelligence, wisdom: item.wisdom, charisma: item.charisma });
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
  const resourceAction = async (body: object) => { if (!selected) return; try { await window.dungeonDeputy.command(`/api/characters/${selected.id}/rest`, 'POST', body); await refresh(selected.id); setMessage('Character resources updated.'); } catch { setMessage('Resource action is unavailable or no uses remain.'); } };
  const update = (key: keyof typeof blank, value: string) => setForm(current => ({ ...current, [key]: key === 'name' || key === 'equipmentPackage' || key === 'species' ? value : Number(value) }));
  return <section className="character-workspace" aria-labelledby="character-heading">
    <header><div><h2 id="character-heading">Characters</h2><p>DM-only character management · supported rules only</p></div><button type="button" className="primary-action" onClick={() => { setSelected(null); setForm({ ...blank }); setMessage('Creating a new character.'); }}>New character</button></header>
    <div className="character-layout"><nav aria-label="Saved characters"><h3>Saved characters</h3>{characters.length ? characters.map(item => <button key={item.id} type="button" aria-current={selected?.id === item.id ? 'true' : undefined} onClick={() => void refresh(item.id)}>{item.name}<small>Level {item.level} · {item.class} · {item.species}</small></button>) : <p>No characters yet. Create a supported character to start a player sheet.</p>}</nav>
      <form onSubmit={save}><h3>{selected?.name ?? 'New character'}</h3><p>Supported: Barbarian/Dwarf levels 1–20 and Wizard/Dwarf level 1. Level derives from XP.</p>
        <label>Character name<input required maxLength={80} value={form.name} onChange={e => update('name', e.target.value)} /></label>
        <label>Class<select value={form.class} onChange={e => { const next=e.target.value; setForm(current=>({...current,class:next,level:1,totalExperiencePoints:0,shieldEquipped:false,cantrips:next==='wizard'?wizardCantrips:[],spellbook:next==='wizard'?wizardSpellbook:[],preparedSpells:next==='wizard'?wizardSpellbook.slice(0,4):[],skillProficiencies:next==='wizard'?['arcana','history']:['athletics','perception']})); }}><option value="barbarian">Barbarian (levels 1–20)</option><option value="wizard">Wizard (level 1)</option></select></label>
        <label>Species<select value={form.species} onChange={e => update('species', e.target.value)}><option value="dwarf">Dwarf (supported)</option><option value="elf" disabled>Elf (unavailable)</option></select></label>
        <label>Total XP<input type="number" min="0" max="355000" required value={form.totalExperiencePoints} onChange={e => { const xp=Number(e.target.value); const thresholds=[0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000]; const level=thresholds.filter(value=>value<=xp).length; setForm(current=>({...current,totalExperiencePoints:xp,level})); }} /></label><p>Derived level {form.level} · proficiency +{2+Math.floor((form.level-1)/4)}</p>
        <label>Starting equipment package<select value={form.equipmentPackage} onChange={e => update('equipmentPackage', e.target.value)}><option value="A">Package A</option><option value="B">Package B (currency only)</option></select></label>
        {form.class==='barbarian' && <label><input type="checkbox" checked={form.shieldEquipped} onChange={e=>setForm(current=>({...current,shieldEquipped:e.target.checked}))}/> Equip trained shield (+2 AC)</label>}
         <fieldset className="character-options"><legend>Choose exactly two class skill proficiencies</legend>{(form.class==='barbarian'?barbarianSkills:wizardSkills).map(skill=><label key={skill}><input type="checkbox" checked={form.skillProficiencies.includes(skill)} disabled={!form.skillProficiencies.includes(skill)&&form.skillProficiencies.length>=2} onChange={e=>setForm(current=>({...current,skillProficiencies:e.target.checked?[...current.skillProficiencies,skill]:current.skillProficiencies.filter(item=>item!==skill)}))}/>{skill}</label>)}</fieldset>
        <fieldset><legend>Ability scores</legend><div className="character-abilities">{(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(key => <label key={key}>{key}<input type="number" min="3" max="20" required value={form[key]} onChange={e => update(key, e.target.value)} /></label>)}</div></fieldset>
         {form.class==='wizard' && <section className="character-derived" aria-label="Wizard spell bookkeeping"><h4>Wizard spellbook (names/IDs only)</h4><p>Cantrips: {wizardCantrips.join(', ')}</p><p>Spellbook choices: {wizardSpellbook.join(', ')}</p><fieldset className="character-options"><legend>Choose exactly four prepared spells</legend>{wizardSpellbook.map(spell=><label key={spell}><input type="checkbox" checked={form.preparedSpells.includes(spell)} disabled={!form.preparedSpells.includes(spell)&&form.preparedSpells.length>=4} onChange={e=>setForm(current=>({...current,preparedSpells:e.target.checked?[...current.preparedSpells,spell]:current.preparedSpells.filter(item=>item!==spell)}))}/>{spell}</label>)}</fieldset><p>Prepared: {form.preparedSpells.join(', ')}</p><p>Slots {selected?.currentSpellSlots ?? 2}/2 · INT save DC {selected?.spellSaveDc ?? (8 + Math.floor((form.intelligence-10)/2) + 2)} · attack {formatAbilityModifier(selected?.spellAttackBonus ?? (Math.floor((form.intelligence-10)/2)+2))}</p><small>No spell descriptions/effects are imported or simulated. Wizard Spell List: PDF p. 79.</small></section>}
        {selected && <section className="character-derived" aria-label="Server-calculated values"><h4>Server-calculated values</h4><p>Strength {formatAbilityModifier(selected.abilityModifiers.strength)} · Dexterity {formatAbilityModifier(selected.abilityModifiers.dexterity)} · Constitution {formatAbilityModifier(selected.abilityModifiers.constitution)}</p><p>XP {selected.totalExperiencePoints} · Level {selected.level} · Proficiency +{selected.proficiencyBonus} · HP {selected.hitPointMaximum} · AC {selected.armorClass}</p><p>Equipment: {selected.inventory.map(item=>`${item.itemId} ×${item.quantity}`).join(', ') || 'none'} · {selected.goldPieces} GP</p><p>Rage {selected.currentRageUses}/{selected.rageMaximum} · Stonecunning {selected.currentStonecunningUses}/{selected.stonecunningMaximum} · Slots {selected.currentSpellSlots}/{selected.spellSlotMaximum}</p><div><button type="button" onClick={()=>void resourceAction({longRest:false})}>Short rest</button><button type="button" onClick={()=>void resourceAction({longRest:true})}>Long rest</button><button type="button" disabled={!selected.rageMaximum||!selected.currentRageUses} onClick={()=>void resourceAction({resourceAction:'rage'})}>Use Rage</button><button type="button" disabled={!selected.stonecunningMaximum||!selected.currentStonecunningUses} onClick={()=>void resourceAction({resourceAction:'stonecunning'})}>Use Stonecunning</button><button type="button" disabled={!selected.spellSlotMaximum||!selected.currentSpellSlots} onClick={()=>void resourceAction({resourceAction:'spell-slot'})}>Expend spell slot</button><button type="button" disabled={!selected.arcaneRecoveryAvailable||selected.arcaneRecoveryUsed||selected.currentSpellSlots>=selected.spellSlotMaximum} onClick={()=>void resourceAction({arcaneRecovery:true})}>Arcane Recovery</button></div><small>{selected.rulesetVersion} · Source PDF SHA-256: {selected.support.pdfSha256}</small><ul>{Object.entries(selected.support.citations).map(([rule,citation])=><li key={rule}>{rule}: {citation}</li>)}</ul></section>}
        <section className="character-derived" aria-label="Supported rule boundaries"><h4>Supported rule boundaries</h4><ul>{Object.values(characterRuleAvailability).map(item => <li key={item}>{item}</li>)}</ul></section>
        <p className="character-source">Source: SRD 5.2.1 PDF pages 6-7, 22-23, 28-29, 77-79, 84, 92, and 104. Calculations stay in the authenticated .NET service.</p>
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
