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
  assert.doesNotMatch(editor, /publishMapRaster\([^\n]*true/);
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
