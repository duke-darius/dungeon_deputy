import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourceUrl = 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf';
const license = 'CC-BY-4.0';
const categories = new Set(['spell', 'condition', 'action', 'monster', 'equipment', 'class', 'species']);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function validateBundle({ pdf, records, manifest }) {
  if (!Buffer.isBuffer(pdf) || pdf.length < 1000 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Pinned source is not a PDF.');
  if (manifest?.release !== '5.2.1' || manifest?.license !== license || manifest?.source?.url !== sourceUrl) throw new Error('Unsupported release, source, or license metadata.');
  const hash = createHash('sha256').update(pdf).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(manifest.source.sha256 ?? '') || manifest.source.sha256 !== hash) throw new Error('PDF SHA-256 does not match the pinned manifest.');
  if (!Array.isArray(records) || records.length > 1000) throw new Error('Invalid record list.');
  const ids = new Set();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9:-]{1,79}$/.test(record.id) || ids.has(record.id)) throw new Error('Missing or duplicate record id.');
    ids.add(record.id);
    if (!categories.has(record.category) || typeof record.name !== 'string' || !record.name.trim() || record.name.length > 120 || typeof record.summary !== 'string' || !record.summary.trim() || !record.details || typeof record.details !== 'object' || Array.isArray(record.details)) throw new Error('Invalid record identity or category details.');
    const provenance = record.provenance;
    if (provenance?.dataset !== 'SRD 5.2.1' || provenance?.license !== license || provenance?.sourceHash !== `sha256:${hash}` || !Number.isInteger(provenance?.page) || provenance.page < 1 || typeof provenance?.section !== 'string' || !provenance.section.trim() || typeof provenance?.modifications !== 'string' || !provenance.modifications.trim()) throw new Error('Record is missing verified citation/provenance.');
    const { recordHash, ...recordWithoutHash } = record;
    recordWithoutHash.provenance = { ...record.provenance };
    delete recordWithoutHash.provenance.recordHash;
    const expectedRecordHash = `sha256:${createHash('sha256').update(stable(recordWithoutHash)).digest('hex')}`;
    if (provenance.recordHash !== expectedRecordHash || recordHash !== expectedRecordHash) throw new Error('Record content SHA-256 does not match its provenance.');
    if (record.category === 'monster') {
      const stats = record.stats;
      const allowedStats = new Set(['size', 'armorClass', 'hitPoints', 'speed', 'strength', 'dexterity', 'constitution', 'challengeRatingNumerator', 'challengeRatingDenominator', 'attacks']);
      if (Object.keys(stats ?? {}).some(key => !allowedStats.has(key))) throw new Error('Unsupported monster stat field.');
      if (!stats || typeof stats.size !== 'string' || !stats.size.trim() || !Number.isInteger(stats.armorClass) || stats.armorClass < 1 || stats.armorClass > 50 || !Number.isInteger(stats.hitPoints) || stats.hitPoints < 1 || stats.hitPoints > 9999 || !Number.isInteger(stats.speed) || stats.speed < 0 || stats.speed > 1000 || !Number.isInteger(stats.strength) || stats.strength < 1 || stats.strength > 30 || !Number.isInteger(stats.dexterity) || stats.dexterity < 1 || stats.dexterity > 30 || !Number.isInteger(stats.constitution) || stats.constitution < 1 || stats.constitution > 30 || !Number.isInteger(stats.challengeRatingNumerator) || !Number.isInteger(stats.challengeRatingDenominator) || stats.challengeRatingNumerator < 0 || stats.challengeRatingNumerator > 30 || stats.challengeRatingDenominator < 1 || stats.challengeRatingDenominator > 8 || !Array.isArray(stats.attacks) || stats.attacks.length > 20 || stats.attacks.some(attack => typeof attack !== 'string' || !attack.trim() || attack.length > 120)) throw new Error('Unsupported or invalid monster stat.');
    }
  }
  const sorted = records.map(record => structuredClone(record)).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return { records: sorted };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = new URL('../../assets/srd/2024/', import.meta.url);
  const [pdf, recordsText, manifestText] = await Promise.all([
    readFile(new URL('source/SRD_CC_v5.2.1.pdf', directory)),
    readFile(new URL('records.json', directory), 'utf8'),
    readFile(new URL('manifest.json', directory), 'utf8'),
  ]);
  const bundle = validateBundle({ pdf, records: JSON.parse(recordsText), manifest: JSON.parse(manifestText) });
  const coverage = JSON.parse(await readFile(new URL('coverage.json', directory), 'utf8'));
  const verifiedRecords = Object.fromEntries([...categories].sort().map(category => [category, bundle.records.filter(record => record.category === category).length]));
  for (const category of categories) {
    const available = verifiedRecords[category] > 0;
    if (coverage.categories?.[category]?.available !== available) throw new Error(`Coverage availability mismatch for ${category}.`);
  }
  if (!coverage.requirements || coverage.requirements['SRD-01'] !== (Object.values(verifiedRecords).every(count => count > 0) ? 'met' : 'unmet')) throw new Error('SRD-01 coverage status mismatch.');
  await writeFile(new URL('records.normalized.json', directory), `${JSON.stringify(bundle.records, null, 2)}\n`, 'utf8');
  await writeFile(new URL('coverage.normalized.json', directory), `${JSON.stringify({ ...coverage, verifiedRecords }, null, 2)}\n`, 'utf8');
}
