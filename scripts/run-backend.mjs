import { spawn } from 'node:child_process';

const port = process.env.DUNGEON_DEPUTY_PORT ?? '43127';
const child = spawn('dotnet', ['run', '--project', 'src/backend/DungeonDeputy.Api.csproj'], {
  stdio: 'inherit',
  env: { ...process.env, DUNGEON_DEPUTY_PORT: port },
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
