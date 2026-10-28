import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const supported = new Set(['win-x64', 'osx-x64', 'osx-arm64']);
const rid = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!supported.has(rid)) {
  console.error(`Usage: node scripts/package-backend.mjs <${[...supported].join('|')}> [--dry-run]`);
  process.exitCode = 2;
} else {
  const project = resolve('src/backend/DungeonDeputy.Api.csproj');
  const args = ['publish', project, '-c', 'Release', '-r', rid, '--self-contained', 'true'];
  if (dryRun) console.log(`dotnet ${args.join(' ')}`);
  else {
    const result = spawnSync('dotnet', args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
}
