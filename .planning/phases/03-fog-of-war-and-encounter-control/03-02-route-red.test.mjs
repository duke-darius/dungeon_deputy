import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => server.listen(0, '127.0.0.1', error => error ? reject(error) : resolveListen()));
  const port = server.address().port;
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  return port;
}

test('authenticated encounter endpoint initializes private encounter state', async () => {
  const root = resolve(import.meta.dirname, '../../..');
  const backend = join(root, 'src/backend/bin/Release/net10.0/DungeonDeputy.Api.dll');
  const dataDir = await mkdtemp(join(tmpdir(), 'dd-encounter-red-'));
  const token = `red-${randomUUID()}`;
  const port = await freePort();
  const child = spawn('dotnet', [backend], {
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DUNGEON_DEPUTY_DATA_DIR: dataDir, DUNGEON_DEPUTY_PORT: String(port), DUNGEON_DEPUTY_TOKEN: token },
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 10_000;

  try {
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null) {
      try {
        const response = await fetch(`${base}/health`, { headers: { 'X-Dungeon-Token': token }, signal: AbortSignal.timeout(500) });
        if (response.ok) { ready = true; break; }
      } catch { /* backend startup race */ }
      await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
    }
    assert.equal(ready, true, `backend did not become ready: ${output}`);
    const response = await fetch(`${base}/api/encounter`, { headers: { 'X-Dungeon-Token': token } });
    assert.equal(response.status, 200, `expected initialized encounter state, got ${response.status}`);
  } finally {
    if (child.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill('SIGTERM');
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});
