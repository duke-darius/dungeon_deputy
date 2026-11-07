import assert from 'node:assert/strict';

export const PRIVATE_PROMPT_SENTINEL = 'P7_PRIVATE_PROMPT_SENTINEL_3b8c7d';

/** Full Electron/backend path using the isolated backend fake-provider seam; never calls OpenAI. */
export async function verifyTavernAmbushAcceptance(manager, player) {
  const snapshot = () => manager.evaluate(async () => ({
    map: await window.dungeonDeputy.command('/api/map'),
    encounter: await window.dungeonDeputy.command('/api/encounter'),
    public: await window.dungeonDeputy.command('/api/presentation'),
  }));
  const assertPrivateContentNotProjected = async () => {
    const publicText = await player.locator('.public-stage').innerText();
    assert.doesNotMatch(publicText, /tavern ambush|reviewed tavern room|ambush approach|private proposal|provider configured/i,
      'proposal prose, geometry labels, provider status, and preview errors must never reach player/table text');
  };
  const original = await snapshot();
  await manager.getByRole('button', { name: 'Preparation · AI optional · DM only' }).click();
  await manager.locator('.preparation-status').getByText('Provider configured · Requests require your approval').waitFor();
  await manager.getByRole('button', { name: 'Map geometry' }).click();
  await manager.getByLabel('Prompt / constraints').fill(`${PRIVATE_PROMPT_SENTINEL} Tavern ambush: mark the room and the goblins’ approach.`);
  await manager.getByLabel('Find local records').fill('bandit');
  await manager.getByRole('button', { name: 'Search local catalog' }).click();
  const banditRow = manager.locator('.preparation-srd li').filter({ hasText: 'srd521:monster:bandit' }).first();
  await banditRow.getByRole('checkbox').check();
  await manager.getByRole('checkbox', { name: /I understand and consent/ }).check();
  await manager.getByRole('button', { name: 'Generate proposal' }).click();
  await manager.locator('.preparation-main p[role="status"]').getByText('Private proposal ready for review').waitFor();
  const afterGenerate = await snapshot();
  assert.deepEqual(afterGenerate, original, 'generation and private preview must leave map, encounter and public presentation unchanged');
  await assertPrivateContentNotProjected();
  assert.ok(await manager.getByText('Tavern ambush room', { exact: true }).count() >= 1, 'fake provider returned the bounded tavern ambush proposal');

  await assert.rejects(() => manager.evaluate(() => window.dungeonDeputy.command('/api/ai/accept', 'POST', {
    kind: 'geometry',
    proposalJson: JSON.stringify({ primitives: [{ kind: 'rectangle', x: 120, y: 100, width: 260, height: 190, label: 'Tavern ambush room' }], referenceIds: ['srd521:monster:bandit'] }),
    selectedMonsterIds: ['srd521:monster:stale'],
  })), 'stale selected monster must be rejected');
  assert.deepEqual(await snapshot(), original, 'invalid acceptance must not change map, encounter or public presentation');
  await assertPrivateContentNotProjected();

  await manager.getByRole('checkbox', { name: /Add Bandit \(srd521:monster:bandit\)/ }).check();
  await manager.getByRole('button', { name: 'Accept and create private draft' }).click();
  await manager.locator('.preparation-main p[role="status"]').getByText(/Accepted to the private editable map draft/).waitFor();
  const accepted = await snapshot();
  assert.equal(accepted.map.draft.tokens.length, original.map.draft.tokens.length + 1);
  assert.equal(accepted.encounter.actors.some(actor => actor.sourceMonsterId === 'srd521:monster:bandit'), true);
  assert.deepEqual(accepted.public, original.public, 'accept must not publish or push public changes');
  await assertPrivateContentNotProjected();
  const actor = accepted.encounter.actors.find(item => item.sourceMonsterId === 'srd521:monster:bandit');
  const token = accepted.map.draft.tokens.find(item => item.id === actor.tokenId);
  assert.ok(token, 'actor token ID is the same as its map token ID');
  assert.equal(token.kind, 'monster');

  await manager.getByRole('button', { name: 'Return to map, scenes, encounters, compendium, characters and table display' }).click();
  await manager.getByLabel('Private map geometry').waitFor();
  await manager.getByLabel('Geometry 1 label').fill('Reviewed tavern room');
  await manager.getByLabel('Geometry 2 x').fill('140');
  await manager.getByRole('button', { name: 'Remove Ambush approach' }).click();
  await manager.getByRole('button', { name: 'Save changes' }).click();
  await manager.getByRole('button', { name: new RegExp(`${token.name}, monster`) }).click();
  await manager.getByLabel('Token name').fill('Ambush Bandit · DM edited');
  await manager.getByLabel('Token color').click();
  await manager.getByLabel('Token name').waitFor();
  const edited = await snapshot();
  assert.equal(edited.map.draft.geometry.length, 1, 'DM can remove an accepted geometry shape');
  assert.equal(edited.map.draft.geometry[0].label, 'Reviewed tavern room');
  assert.equal(edited.map.draft.tokens.find(item => item.id === token.id).name, 'Ambush Bandit · DM edited');
  assert.deepEqual(edited.public, original.public, 'geometry and token edits remain private until a separate Show');
  await assertPrivateContentNotProjected();

  await manager.getByRole('spinbutton', { name: 'Initiative' }).fill('12');
  await manager.getByRole('button', { name: 'Set initiative' }).click();
  await manager.getByRole('button', { name: 'End turn' }).click();
  const running = await snapshot();
  assert.equal(running.encounter.activeTokenId, actor.tokenId, 'accepted actor participates in the ordinary local encounter turn flow');
  assert.deepEqual(running.public, original.public, 'running the private encounter does not publish it');
  await assertPrivateContentNotProjected();

  await manager.getByRole('button', { name: 'Show encounter' }).click();
  await player.locator('.public-map-art').waitFor();
  const shown = await snapshot();
  assert.equal(shown.public.mode, 'map');
  assert.notEqual(shown.public.imageData, original.public.imageData, 'only the separate Show action changes the public raster');
  const afterShowText = await player.locator('.public-stage').innerText();
  assert.doesNotMatch(afterShowText, /tavern ambush room|reviewed tavern room|ambush approach|private proposal|provider configured/i,
    'separate Show exposes the approved geometry raster/token only, not private proposal narrative/status');
  const brassGeometryPixel = await player.locator('.public-map-art').evaluate(async image => {
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 760;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    for (let y = 72; y < 82; y++) for (let x = 145; x < 455; x++) {
      const [r, g, b] = context.getImageData(x, y, 1, 1).data;
      if (r > 160 && g > 120 && b > 60 && r > g && g > b) return true;
    }
    return false;
  });
  assert.equal(brassGeometryPixel, true, 'the separately shown public map raster contains accepted geometry');
  assert.equal(afterShowText.includes('Reviewed tavern room'), false, 'DM-only geometry labels are not projected into public text');
}
