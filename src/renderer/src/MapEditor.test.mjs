import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('initiative tie movement posts one full ordering and uses authoritative actors', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const ordered = await reorderInitiative\(actorIds\)/);
  assert.match(editor, /setEncounter\(\(current: any\) => \(\{ \.\.\.current, actors: ordered\.actors \}\)\)/);
  assert.doesNotMatch(editor, /tie-break/);
});

test('blank HP fields independently serialize as null', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /current\.trim\(\) === '' \? null : Number\(current\)/);
  assert.match(editor, /maximum\.trim\(\) === '' \? null : Number\(maximum\)/);
});

test('fog modes remain explicit and token visibility has persistent text status', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /Select \/ pan/);
  assert.match(editor, /onClick=\{\(\) => setFogTool\('reveal'\)\}/);
  assert.match(editor, /onClick=\{\(\) => setFogTool\('hide'\)\}/);
  assert.doesNotMatch(editor, /setFogTool\(fogTool === '(?:reveal|hide)' \? null/);
  assert.match(editor, /Visible to players/);
  assert.match(editor, /Hidden from players/);
  assert.match(editor, /visibilityBusyId === token\.id/);
});

test('visual mutations rasterize anticipated map and send one image-bearing request', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const imageData = await rasterizePublicMap\(draft\.image, true,/);
  assert.match(editor, /imageData: visibilityImage/);
  assert.match(editor, /const payload = path\.endsWith\('\/strokes'\).*imageData/s);
  assert.match(editor, /publishMapRaster\(\{ imageData \}, true\)/, 'current encounter cue must use the existing filtered saved-map publication route');
  assert.match(editor, /if \(dirty\).*Current encounter cue refused/s, 'current encounter cue must refuse unsaved drafts');
  assert.doesNotMatch(editor, /visibility\?visible=/);
});

test('transient status region reserves space instead of overlaying editor controls', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  assert.match(editor, /className="map-status-region"/);
  assert.match(editor, /className="map-toast" role="status"/);
  assert.match(styles, /\.map-desk \.map-status-region\{display:flex;min-height:36px/);
  assert.match(styles, /\.map-desk \.map-toast\{position:static/);
});

test('mutation failures use one actionable retry message', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const RETRY_MESSAGE = 'Couldn’t save this change\. Your last saved state is unchanged; retry the action\.'/);
  assert.doesNotMatch(editor, /Couldn't save this change|Could not save this change/);
});

test('map editor keeps responsive primary controls practical and focus-visible', async () => {
  const editor = await readFile(new URL('./map/MapEditor.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  assert.match(editor, /fog-controls" role="group" aria-label="Fog tools"/);
  assert.match(editor, /className="encounter-inspector" aria-label="Encounter — DM only"/);
  assert.match(styles, /\.map-desk \.fog-controls button\{min-height:44px/);
  assert.match(styles, /\.map-desk \.map-toolbar \.save-action\{min-height:44px/);
  assert.match(styles, /\.map-desk \.map-canvas:focus-visible\{outline:/);
  assert.match(styles, /--desk-teal:#4d837d/);
});
