import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('accepted geometry renders privately and is rasterized before public fog masking', async () => {
  const canvas = await readFile(new URL('./MapCanvas.tsx', import.meta.url), 'utf8');
  const editor = await readFile(new URL('./MapEditor.tsx', import.meta.url), 'utf8');
  assert.match(canvas, /shape\.kind==='line'/);
  assert.match(canvas, /shapes\.rect\(x,y,w,h\)/);
  assert.match(canvas, /MapGeometry\[\]/);
  assert.ok(canvas.indexOf('context.strokeRect(x, y, width, height)') < canvas.indexOf('if (fogEnabled)'), 'geometry is rasterized before fog conceals hidden regions');
  assert.match(editor, /MapCanvas[\s\S]*geometry=\{draft\.geometry \?\? \[\]\}/);
  for (const control of ['Geometry ${index + 1} ${key}', 'Geometry ${index + 1} label', 'Remove {shape.label', 'Add geometry']) assert.ok(editor.includes(control), `missing editable geometry control ${control}`);
  assert.match(editor, /rasterizePublicMap\(draft\.image[^\n]*draft\.geometry \?\? \[\]/);
});
