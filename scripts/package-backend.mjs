import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const allowed = new Set(['win-x64', 'osx-x64', 'osx-arm64']);
const requested = process.argv.slice(2).filter(a => !a.startsWith('--'));
const rids = requested.length ? requested : [...allowed];
for (const rid of rids) {
  if (!allowed.has(rid)) throw new Error(`Unsupported runtime identifier: ${rid}`);
  const output = resolve('artifacts', `backend-${rid}`);
  rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
  const result = spawnSync('dotnet', ['publish', 'src/backend/DungeonDeputy.Api.csproj', '-c', 'Release', '-r', rid, '--self-contained', 'true', '-o', output], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
