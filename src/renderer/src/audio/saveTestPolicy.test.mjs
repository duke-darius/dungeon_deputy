import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTestPolicy, createFailOnce } from './saveTestPolicy.mjs';

test('save test policy is disabled outside an unpackaged E2E run', () => {
  assert.deepEqual(saveTestPolicy({ e2e: false, isPackaged: false, delayMs: 250, failFirst: true }), { delayMs: 0, failFirst: false });
  assert.deepEqual(saveTestPolicy({ e2e: true, isPackaged: true, delayMs: 250, failFirst: true }), { delayMs: 0, failFirst: false });
  assert.deepEqual(saveTestPolicy({ e2e: true, isPackaged: false, delayMs: 250, failFirst: true }), { delayMs: 250, failFirst: true });
});

test('save test policy bounds finite delays and requires exact true for failure', () => {
  for (const delayMs of [-1, 0, 5000, 9000]) {
    const expected = Math.max(0, Math.min(5000, delayMs));
    assert.equal(saveTestPolicy({ e2e: true, isPackaged: false, delayMs, failFirst: 1 }).delayMs, expected);
  }
  for (const delayMs of [undefined, NaN, Infinity, '100']) {
    assert.equal(saveTestPolicy({ e2e: true, isPackaged: false, delayMs, failFirst: 'true' }).delayMs, 0);
  }
});

test('fail-once consumer rejects only its first eligible write', () => {
  const shouldFail = createFailOnce(true);
  assert.equal(shouldFail(), true);
  assert.equal(shouldFail(), false);
  assert.equal(shouldFail(), false);
  assert.equal(createFailOnce(false)(), false);
});
