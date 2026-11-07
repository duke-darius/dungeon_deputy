import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGenerationPayload, describeProposal, proposalFields, updateField } from './proposalView.mjs';

test('generation requires current affirmative consent and sends only explicit prompt and local ids', () => {
  assert.equal(createGenerationPayload('scene', 'hello', ['srd:spell:light'], false), null);
  assert.deepEqual(createGenerationPayload('scene', 'hello', ['srd:spell:light'], true), {
    kind: 'scene', prompt: 'hello', consent: true, selectedSrdRecordIds: ['srd:spell:light'],
  });
  assert.deepEqual(createGenerationPayload('scene', '  ', [], true), {
    kind: 'scene', prompt: '', consent: true, selectedSrdRecordIds: [],
  });
});

test('proposal view labels narrative and catalog provenance separately for every kind', () => {
  const kinds = ['npc', 'encounter', 'adventure', 'scene', 'geometry'];
  for (const kind of kinds) {
    const view = describeProposal({ kind, content: {}, references: [] });
    assert.equal(view.privateLabel, 'PRIVATE PROPOSAL — NOT IN CAMPAIGN');
    assert.equal(view.narrativeLabel, 'AI-suggested · Unverified');
    assert.equal(view.referenceLabel, 'Local SRD reference · verified in this catalog');
    assert.equal(view.noReference, 'No matching local SRD reference found. Rules-related suggestions are unverified.');
  }
});

test('typed field extraction supports editable geometry and omits model-authored citations', () => {
  const geometry = proposalFields({ kind: 'geometry', content: { primitives: [{ kind: 'rectangle', x: 1, y: 2, width: 3, height: 4, label: 'Hall' }] }, references: [] });
  assert.deepEqual(geometry, [{ section: 'Geometry', key: 'primitives.0', label: 'Hall', value: { kind: 'rectangle', x: 1, y: 2, width: 3, height: 4, label: 'Hall' } }]);
  const scene = proposalFields({ kind: 'scene', content: { description: 'Foggy pass', referenceIds: ['forged'] }, references: [] });
  assert.deepEqual(scene.map(field => field.key), ['description']);
});

test('editing a proposal creates a transient copy without changing original provider data', () => {
  const original = { kind: 'scene', content: { description: 'Old text', referenceIds: [] }, references: [] };
  const edited = updateField(original, 'description', 'Corrected text');
  assert.equal(original.content.description, 'Old text');
  assert.equal(edited.content.description, 'Corrected text');
});

test('Preparation acceptance remains DM-only and separate from public Show/publish', async () => {
  const workspace = await readFile(new URL('./PreparationWorkspace.tsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
  const preload = await readFile(new URL('../../../preload.cts', import.meta.url), 'utf8');
  const publicMain = await readFile(new URL('../public-main.tsx', import.meta.url), 'utf8');
  assert.match(workspace, /useState/);
  assert.doesNotMatch(workspace, /localStorage|sessionStorage|publishMapRaster|\/api\/map\/show/);
  assert.match(workspace, /Accept and create private draft/);
  assert.match(workspace, /acceptProposal\(proposal, acceptedMonsterIds\)/);
  assert.match(await readFile(new URL('./preparationApi.ts', import.meta.url), 'utf8'), /command\('\/api\/ai\/accept', 'POST'/);
  assert.match(workspace, /This request sends the prompt and any data listed below, including selected local SRD excerpts, to the configured provider\. Do not include private player sheets, hidden tokens, fog, DM secrets, or unselected campaign data\. The request leaves this device; provider storage controls do not prevent external processing\./);
  assert.match(app, /PreparationWorkspace/);
  assert.doesNotMatch(preload, /api\/ai|proposal|AiProposal/i);
  assert.doesNotMatch(publicMain, /PreparationWorkspace|proposalView/);
});

test('workspace offers five types, safe status, local selections, accessible geometry edits and explicit discard', async () => {
  const workspace = await readFile(new URL('./PreparationWorkspace.tsx', import.meta.url), 'utf8');
  for (const label of ['NPC', 'Encounter', 'Short adventure', 'Scene description', 'Map geometry', 'Generate proposal', 'Retry generation', 'Discard proposal', 'Keep editing', 'Regenerate', 'Replace proposal', 'Review current proposal']) assert.ok(workspace.includes(label), `missing ${label}`);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /aria-label=.*coordinate/i);
  assert.match(workspace, /No provider key configured/);
  assert.match(workspace, /campaign is unchanged/i);
});

test('accepted narrative has a DM-only editable lifecycle separate from geometry editing', async () => {
  const workspace = await readFile(new URL('./PreparationWorkspace.tsx', import.meta.url), 'utf8');
  const api = await readFile(new URL('./preparationApi.ts', import.meta.url), 'utf8');
  const mapEditor = await readFile(new URL('../map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(api, /\/api\/ai\/accepted/);
  assert.match(workspace, /Accepted preparations/);
  assert.match(workspace, /Save accepted preparation/);
  assert.match(workspace, /Delete accepted preparation/);
  assert.match(workspace, /Local SRD reference/);
  assert.match(workspace, /editing\.references/);
  assert.match(mapEditor, /MapDocument|geometry/);
  assert.doesNotMatch(await readFile(new URL('../public-main.tsx', import.meta.url), 'utf8'), /Accepted preparations|acceptedPreparation/);
});
