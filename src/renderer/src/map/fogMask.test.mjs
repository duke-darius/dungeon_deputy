import test from 'node:test';
import assert from 'node:assert/strict';
import { rasterizeFogMask } from './fogMask.mjs';

test('opaque mask exposes only pixel centers inside a reveal circle', () => {
  const pixels = rasterizeFogMask(5, 5, [{ mode: 'reveal', stamps: [{ x: 2.5, y: 2.5, radius: 1 }] }]);
  const alpha = (x, y) => pixels[(y * 5 + x) * 4 + 3];
  assert.equal(alpha(2, 2), 0); assert.equal(alpha(1, 2), 0); assert.equal(alpha(0, 2), 255); assert.equal(alpha(0, 0), 255);
});
test('ordered hide re-covers prior reveal and overlaps are deterministic without mutating input', () => {
  const strokes = [{ mode: 'reveal', stamps: [{ x: 2.5, y: 2.5, radius: 2 }] }, { mode: 'hide', stamps: [{ x: 2.5, y: 2.5, radius: 1 }] }];
  const original = structuredClone(strokes);
  const first = rasterizeFogMask(5, 5, strokes); const second = rasterizeFogMask(5, 5, strokes);
  assert.deepEqual(first, second); assert.deepEqual(strokes, original);
  assert.equal(first[(2 * 5 + 2) * 4 + 3], 255); assert.equal(first[(0 * 5 + 2) * 4 + 3], 0);
});
