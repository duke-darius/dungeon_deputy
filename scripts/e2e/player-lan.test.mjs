import assert from 'node:assert/strict';
import test from 'node:test';

const ALLOWED_SHEET_KEYS = [
  'abilityModifiers', 'armorClass', 'class', 'charisma', 'constitution', 'dexterity',
  'currentHitPoints', 'hitPointMaximum', 'intelligence', 'inventory', 'level', 'name', 'proficiencyBonus',
  'resources', 'rulesetVersion', 'species', 'strength', 'wisdom',
].sort();

export async function pairIndependentBrowser(app, inviteUrl, partition, characterName) {
  const pagePromise = app.waitForEvent('window');
  await app.evaluate(({ BrowserWindow }, { url, sessionPartition }) => {
    const phone = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { partition: sessionPartition, contextIsolation: true, sandbox: true, nodeIntegration: false } });
    void phone.loadURL(url);
  }, { url: inviteUrl, sessionPartition: partition });
  const page = await pagePromise;
  await page.waitForLoadState('domcontentloaded');
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/player/exchange');
  await page.getByRole('button', { name: 'Use this invite' }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, `${characterName} browser redeems its own one-time invitation`);
  const grant = await response.json();
  await page.getByRole('heading', { name: characterName, exact: true }).waitFor();
  await page.locator('.player-connection').filter({ hasText: 'Connected' }).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('invite'), false, 'invite secret leaves browser history after redemption');
  await page.getByText(/unencrypted HTTP/i).waitFor();
  return { page, grant };
}

export function assertAssignedSheetProjection(sheet, expectedName) {
  assert.equal(sheet?.name, expectedName, 'bearer identity resolves only its assigned character');
  assert.deepEqual(Object.keys(sheet).sort(), ALLOWED_SHEET_KEYS, 'sheet serialized shape is exactly the allowlisted assignment projection');
  assert.doesNotMatch(JSON.stringify(sheet), /initiative|condition|hidden|currentHp|dmNotes|otherPlayer|secret|token/i);
}

export async function assertNoPrivateRouteEnumeration(origin, token, otherCharacterId) {
  const headers = { Authorization: `Bearer ${token}` };
  for (const path of ['/api/encounter', '/api/map', '/api/characters', '/api/player-session/players', `/api/player/sheet/${otherCharacterId}`]) {
    const response = await fetch(`${origin}${path}`, { headers, cache: 'no-store' });
    assert.equal(response.status, 404, `private route is not registered on LAN listener: ${path}`);
  }
}

if (process.env.NODE_TEST_CONTEXT) {
  const sample = () => ({
    name: 'Aster', class: 'barbarian', species: 'dwarf', level: 1,
    strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8,
    abilityModifiers: {}, proficiencyBonus: 2, hitPointMaximum: 15, currentHitPoints: 15, armorClass: 14,
    rulesetVersion: 'SRD test', inventory: [], resources: [],
  });
  test('LAN browser test contract accepts only an assigned safe sheet projection', () => {
    assert.doesNotThrow(() => assertAssignedSheetProjection(sample(), 'Aster'));
    for (const field of ['initiative', 'conditions', 'hiddenTokens', 'currentHp', 'dmNotes', 'otherPlayer']) {
      assert.throws(() => assertAssignedSheetProjection({ ...sample(), [field]: 'private' }, 'Aster'));
    }
    assert.throws(() => assertAssignedSheetProjection(sample(), 'Other character'));
  });
}
