import { useEffect, useState } from 'react';
import { acceptProposal, deleteAcceptedPreparation, findLocalRecords, generateProposal, getPreparationStatus, listAcceptedPreparations, type AcceptedPreparation, type ProposalKind, type ProviderStatus, updateAcceptedPreparation } from './preparationApi';
import { createGenerationPayload, describeProposal, proposalFields, updateField } from './proposalView.mjs';
import type { Proposal } from './proposalView.mjs';
import type { SrdRecord } from '../api';

const choices: Array<{ id: ProposalKind; label: string }> = [
  { id: 'npc', label: 'NPC' }, { id: 'encounter', label: 'Encounter' }, { id: 'adventure', label: 'Short adventure' },
  { id: 'scene', label: 'Scene description' }, { id: 'geometry', label: 'Map geometry' },
];
const disclosure = 'This request sends the prompt and any data listed below, including selected local SRD excerpts, to the configured provider. Do not include private player sheets, hidden tokens, fog, DM secrets, or unselected campaign data. The request leaves this device; provider storage controls do not prevent external processing. Provider storage settings do not prevent transmission, abuse-monitoring, processing, or other provider retention.';
const errorCopy = 'The proposal could not be generated. Your campaign is unchanged. Check AI status or your connection, then try again.';

export default function PreparationWorkspace({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<ProposalKind>('npc');
  const [prompt, setPrompt] = useState('');
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<SrdRecord[]>([]);
  const [selected, setSelected] = useState<SrdRecord[]>([]);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [consent, setConsent] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editingRequest, setEditingRequest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [discarding, setDiscarding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptedMonsterIds, setAcceptedMonsterIds] = useState<string[]>([]);
  const [acceptedRefresh, setAcceptedRefresh] = useState(0);

  useEffect(() => { let active = true; getPreparationStatus().then(value => { if (active) setStatus(value); }).catch(() => { if (active) setStatus({ state: 'unconfigured' }); }); return () => { active = false; }; }, []);
  const statusText = status?.state === 'configured' ? 'Provider configured · Requests require your approval' : status?.state === 'disabled' ? 'AI preparation is off. Existing campaign tools are available.' : status?.state === 'unconfigured' ? 'No provider key configured. AI proposals are unavailable.' : 'Checking local AI configuration';
  const search = async () => { try { setRecords(await findLocalRecords(query)); } catch { setRecords([]); setFailure('Local SRD search is unavailable. Your campaign is unchanged.'); } };
  const submit = async () => {
    const payload = createGenerationPayload(kind, prompt, selected.map(x => x.id), consent);
    if (!payload || status?.state !== 'configured' || loading) return;
    setConsent(false); setLoading(true); setFailure(''); setNotice('Generating private proposal…');
    try { setProposal(await generateProposal(payload)); setEditingRequest(false); setNotice('Private proposal ready for review'); }
    catch { setFailure(errorCopy); setNotice(''); }
    finally { setLoading(false); }
  };
  const update = (key: string, value: any) => setProposal(current => current ? updateField(current, key, value) : current);
  const accept = async () => {
    if (!proposal || accepting) return;
    setAccepting(true); setFailure('');
    try { const result = await acceptProposal(proposal, acceptedMonsterIds); setNotice(result.message); setAcceptedRefresh(value => value + 1); }
    catch { setFailure('Acceptance was rejected. Your edited proposal is preserved; verify local catalog selections and try again.'); }
    finally { setAccepting(false); }
  };
  const view = proposal ? describeProposal(proposal) : null;

  return <main className="map-desk preparation-workspace">
    <header className="map-top preparation-top"><button className="brand preparation-back" onClick={onBack}>Dungeon Deputy</button><div><small>DM-only workspace</small><h1>Preparation</h1></div><span className="preparation-status" role="status">{statusText}</span></header>
    <nav className="preparation-local-nav" aria-label="Local campaign tools"><span>Local campaign tools remain available:</span><button onClick={onBack}>Return to map, scenes, encounters, compendium, characters and table display</button></nav>
    <div className="preparation-layout">
      <aside className="preparation-rail"><h2>Prepare</h2><div role="group" aria-label="Request type">{choices.map(choice => <button key={choice.id} className={kind === choice.id ? 'is-selected' : ''} aria-pressed={kind === choice.id} onClick={() => { setKind(choice.id); setConsent(false); }}>{choice.label}</button>)}</div><p>AI is optional. Local maps, encounters, compendium, characters, scenes and presentation work offline.</p><section className="preparation-provider"><h2>Provider</h2><p>{statusText}</p><p>Configure AI through the backend process environment. Do not paste a key into the app. Provider keys and model details are never shown here.</p></section></aside>
      <section className="preparation-main" aria-label="Proposal request and review">
        {!proposal || editingRequest ? <><h2>New proposal</h2><p className="preparation-intro">Choose a type and describe only what you want to share. Stored campaign, player, map and hidden state are never included.</p>{proposal && <p className="accept-boundary">Your current private proposal and edits remain unchanged while you adjust the request. A successful new generation replaces it.</p>}
          <label className="preparation-field">Prompt / constraints <textarea maxLength={2000} value={prompt} onChange={e => { setPrompt(e.target.value); setConsent(false); }} rows={5} aria-describedby="prompt-limit" /></label><small id="prompt-limit">{prompt.length}/2000 characters. Blank by default; enter a prompt to request generation. No campaign context is attached.</small>
          <fieldset className="preparation-srd"><legend>Optional local SRD references (up to 3)</legend><label>Find local records <input value={query} maxLength={100} onChange={e => setQuery(e.target.value)} /></label><button type="button" onClick={search}>Search local catalog</button><ul>{records.map(record => <li key={record.id}><label><input type="checkbox" checked={selected.some(x => x.id === record.id)} disabled={!selected.some(x => x.id === record.id) && selected.length >= 3} onChange={e => { setSelected(current => e.target.checked ? [...current, record] : current.filter(x => x.id !== record.id)); setConsent(false); }} />{record.name} ({record.id})</label><small>{record.summary}</small></li>)}</ul>{selected.length > 0 && <ul aria-label="Selected local records">{selected.map(record => <li key={`selected-${record.id}`}><span>{record.name} ({record.id}) selected</span><button type="button" onClick={() => { setSelected(current => current.filter(x => x.id !== record.id)); setConsent(false); }}>Remove {record.name}</button></li>)}</ul>}</fieldset>
          {selected.length > 0 && <p className="preparation-selected">Selected data to be shared: {selected.map(record => `${record.name} (${record.id}), excerpt: ${record.summary}, provenance: ${record.provenance.dataset}, ${record.provenance.license}, p. ${record.provenance.page}`).join('; ')}</p>}
          <div className="preparation-disclosure"><p>{disclosure}</p>{selected.length ? <p>Selected local records and excerpts: {selected.map(record => `${record.name} (${record.id}) — ${record.summary}; ${record.provenance.dataset}, ${record.provenance.license}, p. ${record.provenance.page}`).join(' | ')}</p> : <p>Selected local SRD records: none.</p>}</div>
          <label className="preparation-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I understand and consent to sharing only the listed data for this request.</label>
          <button className="preparation-primary" disabled={!consent || !prompt.trim() || status?.state !== 'configured' || loading} onClick={submit}>{failure ? 'Retry generation' : 'Generate proposal'}</button>
          {proposal && <button className="preparation-secondary" onClick={() => setEditingRequest(false)}>Review current proposal</button>}
          {!consent && <small>Fresh consent is required for every request.</small>}{failure && <p className="preparation-error" role="alert">{failure}</p>}
          {!proposal && <div className="preparation-empty"><h2>No proposal yet</h2><p>Choose a preparation type and describe what you need. Your campaign stays unchanged until you review and accept a proposal.</p></div>}
        </> : <><div className="private-banner">{view?.privateLabel}</div><h2>Private proposal review</h2><p className="proposal-kind">{choices.find(item => item.id === proposal.kind)?.label}</p><p className="proposal-badge">{view?.narrativeLabel}</p><p>{'The AI is not a rules authority. Use the cited local SRD record for rules; unsupported or uncited mechanics are unverified suggestions.'}</p>
          <section className="proposal-fields"><h3>Field review · proposed values only</h3><p>Campaign values were not loaded. Each change is shown as a new unverified suggestion; omitted campaign fields remain untouched.</p>{proposalFields(proposal).map(field => <div className="proposal-field" key={field.key}><label htmlFor={`field-${field.key}`}>{field.section}: {field.label} <span className="proposal-badge">AI-suggested · Unverified</span></label><p className="field-before">Campaign value: not loaded (private campaign data is not included)</p>{proposal.kind === 'geometry' && field.key.startsWith('primitives.') ? <GeometryEditor field={field} onUpdate={update} onRemove={() => setProposal(current => current ? updateField(current, 'primitives', (current.content.primitives as unknown[]).filter((_: unknown, i: number) => i !== Number(field.key.split('.')[1]))) : current)} /> : <textarea id={`field-${field.key}`} value={String(field.value ?? '')} maxLength={1000} rows={Math.min(8, Math.max(2, String(field.value ?? '').split('\n').length + 1))} onChange={e => update(field.key, e.target.value)} />}</div>)}</section>
          {proposal.kind === 'geometry' && <GeometryPreview primitives={proposal.content.primitives as Array<{ kind: string; x: number; y: number; width: number; height: number; label: string }>} />}
          {proposal.kind === 'geometry' && <button className="preparation-secondary" onClick={() => update('primitives', [...(proposal.content.primitives as unknown[]), { kind: 'rectangle', x: 0, y: 0, width: 100, height: 100, label: 'New rectangle' }])}>Add geometry</button>}
          <section className="proposal-references"><h3>{view?.referenceLabel}</h3>{proposal.references?.length ? proposal.references.map(ref => <article key={ref.id}><strong>{ref.name} ({ref.id})</strong><p>{ref.excerpt}</p><small>{ref.source}</small></article>) : <p>{view?.noReference}</p>}</section>
           <p className="accept-boundary">Accept applies only this edited proposal to a private map draft. Selected local monsters are added through the existing encounter workflow. It never shows or publishes; use the separate Show action afterward.</p>
           <fieldset className="preparation-srd"><legend>Explicitly accept supported local monsters (optional)</legend>{selected.filter(record => record.category === 'monster').length ? selected.filter(record => record.category === 'monster').map(record => <label key={record.id}><input type="checkbox" checked={acceptedMonsterIds.includes(record.id)} onChange={event => setAcceptedMonsterIds(ids => event.target.checked ? [...ids, record.id] : ids.filter(id => id !== record.id))} />Add {record.name} ({record.id}) to this encounter and private map</label>) : <p>No selected local monster records. Narrative characters and encounter ideas are not game actors.</p>}</fieldset>
            <button className="preparation-primary" disabled={accepting} onClick={accept}>{accepting ? 'Accepting private draft…' : 'Accept and create private draft'}</button>
          {discarding ? <div className="discard-confirm" role="group" aria-label="Confirm discard"><p>Discard this private proposal and its edits? It has not changed your campaign.</p><button className="preparation-danger" onClick={() => { setProposal(null); setEditingRequest(false); setDiscarding(false); setNotice('Proposal discarded. Campaign unchanged.'); }}>Discard proposal</button><button onClick={() => setDiscarding(false)}>Keep editing</button></div> : regenerating ? <div className="discard-confirm" role="group" aria-label="Confirm regenerate"><p>Regenerating replaces this proposal and all of its edits. A new request requires fresh consent.</p><button className="preparation-primary" onClick={() => { setProposal(null); setEditingRequest(true); setRegenerating(false); setConsent(false); setNotice('Review the request and give fresh consent to regenerate.'); }}>Replace proposal</button><button onClick={() => setRegenerating(false)}>Keep editing</button></div> : <div className="proposal-actions"><button onClick={() => setEditingRequest(true)}>Adjust request</button><button onClick={() => setRegenerating(true)}>Regenerate</button><button className="preparation-danger" onClick={() => setDiscarding(true)}>Discard proposal</button></div>}
          {notice && <p role="status" aria-live="polite">{notice}</p>}{failure && <p role="alert">{failure}</p>}
        </>}
          <AcceptedPreparations refreshKey={acceptedRefresh} />
       </section>
    </div><p className="preparation-live" role="status" aria-live="polite">{notice}</p>
  </main>;
}

function AcceptedPreparations({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<AcceptedPreparation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<AcceptedPreparation | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const reload = async () => setItems(await listAcceptedPreparations());
  useEffect(() => { reload().catch(() => setMessage('Accepted preparations are unavailable.')); }, [refreshKey]);
  const selected = items.find(item => item.id === selectedId) ?? null;
  const editing = draft ?? selected;
  const fields = editing ? proposalFields({ kind: editing.kind, content: editing.content, references: editing.references } as Proposal) : [];
  const save = async () => {
    if (!editing || busy) return;
    setBusy(true); setMessage('');
    try { const updated = await updateAcceptedPreparation(editing); setItems(current => current.map(item => item.id === updated.id ? updated : item)); setDraft(updated); setMessage('Accepted preparation saved.'); }
    catch { setMessage('Save rejected. The saved preparation is unchanged; verify its local SRD references.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected || busy) return;
    setBusy(true); setMessage('');
    try { await deleteAcceptedPreparation(selected.id); setItems(current => current.filter(item => item.id !== selected.id)); setSelectedId(''); setDraft(null); setMessage('Accepted preparation deleted.'); }
    catch { setMessage('Delete failed. The accepted preparation was not changed.'); }
    finally { setBusy(false); }
  };
  return <section className="accepted-preparations" aria-label="Accepted preparations">
    <h2>Accepted preparations</h2><p>Private DM narrative only. Geometry stays in the MapDocument map editor; selected monsters stay in the encounter workflow.</p>
    {items.length ? <ul>{items.map(item => <li key={item.id}><button type="button" aria-pressed={selectedId === item.id} onClick={() => { setSelectedId(item.id); setDraft(null); setMessage(''); }}>{item.kind} · {item.updatedAt.slice(0, 10)}</button></li>)}</ul> : <p>No accepted narrative yet.</p>}
    {editing && <><h3>Edit accepted {editing.kind}</h3><section className="proposal-references"><h4>Local SRD reference · verified in this catalog</h4>{editing.references.length ? editing.references.map(reference => <p key={reference.id}>{reference.name} ({reference.id}) · {reference.source}</p>) : <p>No local SRD references.</p>}</section>
      {fields.map(field => <label className="preparation-field" key={field.key}>{field.label}<textarea value={String(field.value ?? '')} maxLength={1000} rows={3} onChange={event => setDraft(updateField({ kind: editing.kind, content: editing.content, references: editing.references } as Proposal, field.key, event.target.value) as unknown as AcceptedPreparation)} /></label>)}
      <button type="button" disabled={busy} onClick={save}>Save accepted preparation</button><button type="button" className="preparation-danger" disabled={busy} onClick={remove}>Delete accepted preparation</button>
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}

function GeometryEditor({ field, onUpdate, onRemove }: { field: { key: string; label: string; value: any }; onUpdate: (key: string, value: any) => void; onRemove: () => void }) {
  const shape = field.value;
  const updateShape = (name: string, value: string | number) => onUpdate(field.key, { ...shape, [name]: value });
  return <fieldset className="geometry-edit"><legend>{field.label}: {shape.kind}, coordinates and size</legend><label>Type<select aria-label={`${field.label} type`} value={shape.kind} onChange={e => updateShape('kind', e.target.value)}><option value="rectangle">Rectangle</option><option value="line">Line</option></select></label>{(['x', 'y', 'width', 'height'] as const).map(name => <label key={name}>{name}<input type="number" min={name === 'width' || name === 'height' ? 1 : 0} max={1000} aria-label={`${field.label} ${name} coordinate`} value={shape[name]} onChange={e => updateShape(name, Number(e.target.value))} /></label>)}<label>Label<input aria-label={`${field.label} label`} maxLength={80} value={shape.label} onChange={e => updateShape('label', e.target.value)} /></label><button type="button" className="preparation-danger" onClick={onRemove}>Remove geometry</button></fieldset>;
}

function GeometryPreview({ primitives }: { primitives: Array<{ kind: string; x: number; y: number; width: number; height: number; label: string }> }) {
  const clamp = (value: number, min = 0, max = 1000) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
  return <section className="geometry-preview-section"><h3>Private geometry preview · unverified</h3><div className="geometry-preview" role="img" aria-label={`Private geometry preview with ${primitives.length} shapes. Use the labeled geometry controls to edit each shape.`}>{primitives.map((shape, index) => <span key={index} aria-hidden="true" className={shape.kind === 'line' ? 'geometry-preview-line' : 'geometry-preview-rectangle'} style={{ left: `${clamp(shape.x) / 10}%`, top: `${clamp(shape.y) / 10}%`, width: `${clamp(shape.width, 1) / 10}%`, height: `${clamp(shape.height, 1) / 10}%` }}>{shape.label}</span>)}</div><p>Application-rendered primitive preview only. This geometry is not a token and does not alter the map.</p></section>;
}
