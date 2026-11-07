import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateBundle } from './import.mjs';

const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);

const root = new URL('../../assets/srd/2024/', import.meta.url);
test('pinned official PDF provenance and all seven reviewed categories validate deterministically offline', async () => {
  const pdf = await readFile(new URL('source/SRD_CC_v5.2.1.pdf', root));
  const records = JSON.parse(await readFile(new URL('records.json', root), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  const first = validateBundle({ pdf, records, manifest });
  const second = validateBundle({ pdf, records, manifest });
  assert.equal(createHash('sha256').update(pdf).digest('hex'), manifest.source.sha256);
  assert.deepEqual(first, second);
  assert.deepEqual([...new Set(first.records.map(record => record.category))].sort(), ['action', 'class', 'condition', 'equipment', 'monster', 'species', 'spell']);
  assert.ok(first.records.length >= 7);
  assert.equal(first.records.find(record => record.category === 'monster').provenance.page, 261);
  for (const record of first.records) {
    assert.match(record.provenance.recordHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(record.provenance.sourceHash, `sha256:${manifest.source.sha256}`);
    assert.ok(record.name && record.summary && record.details);
  }
  assert.deepEqual(first.records.map(record => record.id), [...first.records.map(record => record.id)].sort());
});

test('import rejects missing provenance, duplicate ids, unsupported stats and license drift', () => {
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(1100)]);
  const base = { release: '5.2.1', license: 'CC-BY-4.0', source: { url: 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf', sha256: createHash('sha256').update(pdf).digest('hex') } };
  const valid = { id: 'monster:test', category: 'monster', name: 'Fixture', summary: 'Fixture monster.', stats: { size: 'Medium', armorClass: 10, hitPoints: 1, speed: 30, strength: 10, dexterity: 10, constitution: 10, challengeRatingNumerator: 0, challengeRatingDenominator: 1, attacks: [] }, details: { creatureType: 'Humanoid' }, provenance: { dataset: 'SRD 5.2.1', license: 'CC-BY-4.0', sourceHash: `sha256:${base.source.sha256}`, page: 1, section: 'Monsters — Fixture', modifications: 'Transcribed.' } };
  valid.recordHash = `sha256:${createHash('sha256').update(stable(valid)).digest('hex')}`;
  valid.provenance.recordHash = valid.recordHash;
  assert.throws(() => validateBundle({ pdf, records: [valid], manifest: { ...base, source: { ...base.source, sha256: '' } } }), /SHA-256/);
  assert.throws(() => validateBundle({ pdf, records: [{ ...valid, provenance: { ...valid.provenance, page: 0 } }], manifest: base }), /provenance/);
  assert.throws(() => validateBundle({ pdf, records: [{ ...valid, provenance: { ...valid.provenance, section: '' } }], manifest: base }), /provenance/);
  assert.throws(() => validateBundle({ pdf, records: [valid, valid], manifest: base }));
  assert.throws(() => validateBundle({ pdf, records: [{ ...valid, stats: { ...valid.stats, inventedRule: true } }], manifest: base }));
  assert.throws(() => validateBundle({ pdf, records: [valid], manifest: { ...base, license: 'OGL-1.0a' } }));
});
