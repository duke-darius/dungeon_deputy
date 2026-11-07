import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayerConnection } from '../../src/renderer/src/realtime/playerConnection.mjs';
import { redactUrl } from './fixtures.mjs';

class FakeConnection {
  get state() { return this.started ? 'Connected' : 'Disconnected'; }
  handlers = new Map();
  reconnecting = [];
  reconnected = [];
  closed = [];
  snapshots = [];
  on(name, handler) { this.handlers.set(name, handler); }
  onreconnecting(handler) { this.reconnecting.push(handler); }
  onreconnected(handler) { this.reconnected.push(handler); }
  onclose(handler) { this.closed.push(handler); }
  async start() { this.started = true; }
  async stop() { this.started = false; }
  async invoke(method) { assert.equal(method, 'GetSnapshot'); return this.snapshots.shift(); }
  fire(name, value) { this.handlers.get(name)?.(value); }
}

class FakeBuilder {
  static connection;
  withUrl(url, options) { this.url = url; this.options = options; return this; }
  withAutomaticReconnect() { this.reconnectEnabled = true; return this; }
  configureLogging(level) { this.logLevel = level; return this; }
  build() { FakeBuilder.connection = new FakeConnection(); return FakeBuilder.connection; }
}

test('player connection uses in-memory bearer, snapshots on start and fresh snapshot before reconnect is connected', async () => {
  const snapshots = [];
  const states = [];
  const session = createPlayerConnection({ token: 'scoped', builder: FakeBuilder, onSnapshot: value => snapshots.push(value), onState: value => states.push(value) });
  const connection = FakeBuilder.connection;
  assert.equal(session.connectionOptions.accessTokenFactory(), 'scoped');
  assert.equal(session.connectionOptions.url, '/api/player/hub');
  assert.equal(session.connectionOptions.reconnect, true);
  connection.snapshots.push({ sheet: { name: 'Mira' }, presentation: { mode: 'black' } });
  await session.start();
  assert.equal(snapshots.at(-1).sheet.name, 'Mira');
  connection.snapshots.push({ sheet: { name: 'Mira', armorClass: 15 }, presentation: { mode: 'scene', title: 'Road' } });
  await connection.reconnected[0]();
  assert.equal(snapshots.at(-1).sheet.armorClass, 15);
  assert.equal(states.at(-1), 'connected');
  await session.stop();
});

test('revocation/session end invokes fatal clear callback and dispose stops the connection', async () => {
  const failures = [];
  const session = createPlayerConnection({ token: 'scoped', builder: FakeBuilder, onAccessEnded: value => failures.push(value) });
  const connection = FakeBuilder.connection;
  connection.fire('AccessRevoked');
  assert.deepEqual(failures, ['revoked']);
  connection.fire('SessionEnded');
  assert.deepEqual(failures, ['revoked', 'ended']);
  await session.stop();
  assert.equal(connection.started, false);
});

test('E2E diagnostics redact invite and SignalR query capabilities', () => {
  const diagnostic = redactUrl('http://lan.example/join?invite=invite-secret&access_token=player-secret');
  assert.doesNotMatch(diagnostic, /invite-secret|player-secret/);
  assert.match(diagnostic, /invite=%5BREDACTED%5D/);
  assert.match(diagnostic, /access_token=%5BREDACTED%5D/);
});
