import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const component = await readFile(new URL('./Compendium.tsx', import.meta.url), 'utf8');
const editor = await readFile(new URL('../map/MapEditor.tsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../api.ts', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('DM compendium has a bounded searchable result and provenance detail workflow', () => {
  assert.match(editor, /Compendium · DM only/);
  assert.match(api, /encodeURIComponent\(query\.slice\(0, 100\)\)/);
  assert.match(component, /slice\(0, 50\)/);
  for (const category of ['spell', 'condition', 'action', 'monster', 'equipment', 'class', 'species']) {
    assert.match(component, new RegExp(`['\"]${category}['\"]`));
  }
  assert.match(component, /Source and attribution/);
  assert.match(component, /Source SHA-256/);
  assert.match(component, /attribution/i);
  assert.match(component, /manifest\.release|release/);
  assert.match(component, /coverage/i);
  assert.match(component, /unreviewed SRD entries are unavailable/);
});

test('Add is deliberate, private, accessible, and imported strings are rendered as text', () => {
  assert.match(component, /onClick=\{\(\) => void add\(\)\}/);
  assert.match(api, /\/api\/encounter\/monsters/);
  assert.match(component, /role="status"/);
  assert.match(component, /aria-label=.*detail|aria-label=.*record/i);
  assert.match(component, /Close details|Close record details/);
  assert.match(component, /maxLength=\{100\}/);
  assert.match(styles, /\.compendium-workspace button\{min-height:44px/);
  assert.match(component, /\{record\.name\}/);
  assert.match(component, /\{selected\.summary\}/);
  assert.match(component, /JSON\.stringify\(selected\.details/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});

test('catalog metadata and coverage are read from the authenticated local API', () => {
  assert.match(api, /getSrdMetadata/);
  assert.match(api, /getSrdCoverage/);
  assert.match(api, /\/api\/srd\/metadata/);
  assert.match(api, /\/api\/srd\/coverage/);
  assert.match(component, /getSrdMetadata/);
  assert.match(component, /getSrdCoverage/);
});
