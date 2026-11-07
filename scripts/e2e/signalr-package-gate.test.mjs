import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePackageMetadata } from '../check-signalr-package.mjs';

const valid = {
  name: '@microsoft/signalr',
  version: '10.0.11',
  license: 'MIT',
  repository: { type: 'git', url: 'git+https://github.com/dotnet/aspnetcore.git' },
  dist: { integrity: 'sha512-FulOJ2EEtKvLQcswe/U7v8pzyXyk7Jua5xgWJPPwyQU/2Z9ORvKcVjyO75VvLsem+CJ1ORRexJ+7Bz1FCei2aw==' },
  scripts: { build: 'node build.js' },
};

test('SignalR package gate accepts the exact audited package metadata only', () => {
  assert.deepEqual(validatePackageMetadata(valid), { ok: true, failures: [] });
});

for (const [field, update] of [
  ['version', metadata => { metadata.version = '10.0.12'; }],
  ['license', metadata => { metadata.license = 'Apache-2.0'; }],
  ['repository', metadata => { metadata.repository.url = 'https://example.invalid/fork'; }],
  ['integrity', metadata => { metadata.dist.integrity = 'sha512-wrong'; }],
]) {
  test(`SignalR package gate rejects ${field} drift`, () => {
    const metadata = structuredClone(valid); update(metadata);
    assert.equal(validatePackageMetadata(metadata).ok, false);
  });
}

for (const lifecycle of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'prepublish', 'prepublishOnly']) {
  test(`SignalR package gate rejects lifecycle script ${lifecycle}`, () => {
    const metadata = structuredClone(valid); metadata.scripts[lifecycle] = 'node unexpected.js';
    assert.equal(validatePackageMetadata(metadata).ok, false);
    assert.ok(validatePackageMetadata(metadata).failures.some(failure => failure.includes(lifecycle)));
  });
}
