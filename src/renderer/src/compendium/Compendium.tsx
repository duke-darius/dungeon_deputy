import { useEffect, useRef, useState } from 'react';
import {
  addSrdMonsterToEncounter, getSrdCoverage, getSrdMetadata, searchSrdRecords,
  type SrdCategory, type SrdCoverage, type SrdMetadata, type SrdRecord,
} from '../api';

const categories: Array<{ id: SrdCategory; label: string }> = [
  { id: 'spell', label: 'Spells' }, { id: 'condition', label: 'Conditions' },
  { id: 'action', label: 'Actions' }, { id: 'monster', label: 'Monsters' },
  { id: 'equipment', label: 'Equipment' }, { id: 'class', label: 'Class' },
  { id: 'species', label: 'Species' },
];
const failure = 'The offline compendium could not be loaded. Check that the local service is running, then retry.';

export default function Compendium() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SrdCategory | ''>('');
  const [result, setResult] = useState<{ records: SrdRecord[]; total: number } | null>(null);
  const [metadata, setMetadata] = useState<SrdMetadata | null>(null);
  const [coverage, setCoverage] = useState<SrdCoverage | null>(null);
  const [selected, setSelected] = useState<SrdRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);

  const search = async (term: string, selectedCategory = category) => {
    const currentRequest = ++requestId.current;
    const boundedTerm = term.slice(0, 100);
    setLoading(true); setMessage(''); setSelected(null);
    try {
      const [next, manifest, support] = await Promise.all([
        searchSrdRecords(boundedTerm, selectedCategory || undefined),
        metadata ? Promise.resolve(metadata) : getSrdMetadata(),
        coverage ? Promise.resolve(coverage) : getSrdCoverage(),
      ]);
      if (currentRequest !== requestId.current) return;
      setResult({ records: next.records.slice(0, 50), total: next.total });
      setMetadata(manifest); setCoverage(support);
    } catch {
      if (currentRequest !== requestId.current) return;
      setResult(null); setMessage(failure);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => { void search(''); }, []);

  const add = async () => {
    if (!selected || selected.category !== 'monster' || adding) return;
    if (!window.confirm(`Add ${selected.name} to the private encounter? This does not create a map token or publish anything.`)) return;
    setAdding(true); setMessage('');
    try { await addSrdMonsterToEncounter(selected.id); setMessage(`${selected.name} added to the private encounter.`); }
    catch { setMessage('Could not add this monster. The encounter was not changed; retry the action.'); }
    finally { setAdding(false); }
  };

  const categorySupport = (item: SrdCategory) => coverage?.categories[item];
  const selectedUnavailable = category !== '' && categorySupport(category)?.available === false;

  return <section className="compendium-workspace" aria-labelledby="compendium-title">
    <header className="compendium-header">
      <div><p className="compendium-kicker">🔒 Compendium · DM only</p><h2 id="compendium-title">SRD field reference</h2></div>
      <span className="compendium-release">{metadata ? `SRD ${metadata.release} · ${metadata.license}` : 'Offline reference'}</span>
    </header>
    <p className="compendium-coverage">A supported subset of individually reviewed records, stored locally for offline use. Unreviewed entries are unavailable; this is not a complete SRD.</p>
    <form className="compendium-search" onSubmit={event => { event.preventDefault(); void search(query); }}>
      <label htmlFor="compendium-search">Search the reviewed records</label>
      <div><input id="compendium-search" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} />
        <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></div>
      <small>Up to 100 characters; results are limited to 50 records.</small>
    </form>
    <div className="compendium-layout">
      <nav className="compendium-categories" aria-label="SRD categories">
        <h3>Categories</h3>
        <button type="button" className={!category ? 'is-active' : ''} aria-pressed={!category} onClick={() => { setCategory(''); void search(query, ''); }}>All reviewed</button>
        {categories.map(item => {
          const support = categorySupport(item.id);
          const available = support?.available !== false;
          const count = coverage?.verifiedRecords[item.id] ?? 0;
          return <button type="button" key={item.id} className={category === item.id ? 'is-active' : ''} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); void search(query, item.id); }}>
            <span>{item.label}</span><small>{!available ? 'Unavailable' : count ? `${count} reviewed` : 'Coverage pending'}</small>
          </button>;
        })}
        <p>Class and species definitions are partial. Other unreviewed entries are not included.</p>
      </nav>
      <div className="compendium-results">
        <h3>{category ? categories.find(item => item.id === category)?.label : 'Reviewed records'}</h3>
        {loading && <p role="status" aria-live="polite">Loading reviewed SRD records…</p>}
        {!loading && message && <p role="status" aria-live="polite">{message}<button type="button" onClick={() => void search(query)}>Retry</button></p>}
        {!loading && !message && selectedUnavailable && <p role="status">This category is unavailable in the bundled reviewed subset. Unreviewed SRD entries are not searchable.</p>}
        {!loading && !message && !selectedUnavailable && result?.records.length === 0 && <p role="status">No reviewed records match this search. Coverage is limited; unreviewed SRD entries are unavailable.</p>}
        {!loading && !message && result && result.records.length > 0 && <>
          <p className="compendium-count" role="status">Showing {result.records.length} of {result.total} matching reviewed records.</p>
          <ul aria-label="SRD search results">{result.records.slice(0, 50).map(record => <li key={record.id}>
            <button type="button" aria-label={`Open ${record.name}, ${record.category}`} onClick={() => setSelected(record)}>
              <span>{record.name}<small>{record.category}</small></span><small>Reviewed subset</small>
            </button>
          </li>)}</ul>
        </>}
      </div>
      {selected && <article className="compendium-detail" aria-label={`${selected.name} record details`}>
        <div className="compendium-detail-heading"><div><p className="compendium-kicker">{selected.category} · Reviewed record</p><h3>{selected.name}</h3></div>
          <button type="button" className="compendium-close" onClick={() => setSelected(null)}>Close details</button></div>
        <p>{selected.summary}</p>
        {selected.stats && <dl className="compendium-stats"><dt>Armor class</dt><dd>{selected.stats.armorClass}</dd><dt>Hit points</dt><dd>{selected.stats.hitPoints}</dd><dt>Speed</dt><dd>{selected.stats.speed} ft.</dd><dt>Challenge</dt><dd>{selected.stats.challengeRatingNumerator}/{selected.stats.challengeRatingDenominator}</dd></dl>}
        <h4>Reviewed details</h4><pre>{JSON.stringify(selected.details, null, 2)}</pre>
        <h4>Source and attribution</h4>
        <dl className="compendium-metadata">
          <dt>Release</dt><dd>{metadata?.release ?? selected.provenance.dataset}</dd>
          <dt>Source reference</dt><dd>{selected.provenance.section}, PDF page {selected.provenance.page}</dd>
          <dt>License</dt><dd>{selected.provenance.license}</dd>
          <dt>Attribution</dt><dd>{metadata?.attribution ?? `Material from ${selected.provenance.dataset}.`}</dd>
          <dt>Source SHA-256</dt><dd>{selected.provenance.sourceHash}</dd>
          <dt>Record SHA-256</dt><dd>{selected.provenance.recordHash}</dd>
          <dt>Modifications</dt><dd>{selected.provenance.modifications}</dd>
          <dt>Coverage</dt><dd>Individually reviewed subset; no completeness claim.</dd>
        </dl>
        {selected.category === 'monster' && <button className="compendium-add" type="button" disabled={adding} onClick={() => void add()}>{adding ? 'Adding…' : 'Add to private encounter'}</button>}
      </article>}
    </div>
    {coverage && metadata && <details className="compendium-gaps"><summary>Known coverage gaps and license attribution</summary>
      <p>Records available: {Object.values(coverage.verifiedRecords).reduce((sum, count) => sum + (count ?? 0), 0)} across seven requested categories. This reviewed subset does not claim completeness or parity.</p>
      <ul>{[...metadata.knownGaps, ...coverage.gaps].filter((gap, index, all) => all.indexOf(gap) === index).map(gap => <li key={gap}>{gap}</li>)}</ul>
      <p>{metadata.attribution}</p><p>Source modifications: {metadata.modifications}</p>
    </details>}
  </section>;
}
