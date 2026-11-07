import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const PACKAGE_NAME = '@microsoft/signalr';
export const PACKAGE_VERSION = '10.0.11';
export const EXPECTED_INTEGRITY = 'sha512-FulOJ2EEtKvLQcswe/U7v8pzyXyk7Jua5xgWJPPwyQU/2Z9ORvKcVjyO75VvLsem+CJ1ORRexJ+7Bz1FCei2aw==';
export const EXPECTED_REPOSITORY = 'git+https://github.com/dotnet/aspnetcore.git';
const FORBIDDEN_LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'prepublish', 'prepublishOnly'];

export function validatePackageMetadata(metadata) {
  const failures = [];
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return { ok: false, failures: ['npm metadata is not a JSON object'] };
  if (metadata.name !== PACKAGE_NAME) failures.push(`name mismatch (expected ${PACKAGE_NAME})`);
  if (metadata.version !== PACKAGE_VERSION) failures.push(`version mismatch (expected ${PACKAGE_VERSION})`);
  if (metadata.license !== 'MIT') failures.push('license mismatch (expected MIT)');
  if (metadata.repository?.url !== EXPECTED_REPOSITORY) failures.push('repository mismatch (expected official dotnet/aspnetcore URL)');
  if (metadata.dist?.integrity !== EXPECTED_INTEGRITY) failures.push('dist.integrity mismatch (expected pinned SHA-512)');
  const scripts = metadata.scripts && typeof metadata.scripts === 'object' && !Array.isArray(metadata.scripts) ? metadata.scripts : {};
  for (const name of FORBIDDEN_LIFECYCLE_SCRIPTS) if (Object.hasOwn(scripts, name)) failures.push(`forbidden lifecycle script: ${name}`);
  return { ok: failures.length === 0, failures };
}

export function fetchRegistryMetadata() {
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm.cmd', 'view', `${PACKAGE_NAME}@${PACKAGE_VERSION}`, '--json']
    : ['view', `${PACKAGE_NAME}@${PACKAGE_VERSION}`, '--json'];
  const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm', args, {
    encoding: 'utf8', timeout: 30_000, windowsHide: true,
  });
  if (result.error) throw new Error(`npm view could not run (${result.error.code ?? 'process error'}).`);
  if (result.status !== 0) throw new Error(`npm view exited with status ${result.status ?? 'unknown'}; metadata was not accepted.`);
  try { return JSON.parse(result.stdout); }
  catch { throw new Error('npm view returned invalid JSON; metadata was not accepted.'); }
}

export function runGate() {
  let metadata;
  try { metadata = fetchRegistryMetadata(); }
  catch (error) {
    console.error(`SignalR pre-install gate failed: ${error instanceof Error ? error.message : 'registry metadata could not be verified'}`);
    return 1;
  }
  const result = validatePackageMetadata(metadata);
  if (!result.ok) {
    console.error(`SignalR pre-install gate failed:\n- ${result.failures.join('\n- ')}`);
    return 1;
  }
  console.log(`SignalR pre-install gate passed: ${PACKAGE_NAME}@${PACKAGE_VERSION}; pinned license, repository, integrity and no lifecycle hooks.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = runGate();
