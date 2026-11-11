import assert from 'node:assert/strict';

export async function verifyWizardCharacterProfile(manager) {
  await manager.getByRole('button', { name: 'New character' }).click();
  await manager.getByLabel('Character name').fill('Ira Wizard');
  await manager.getByLabel('Class').selectOption('wizard');
  assert.equal(await manager.getByText('nature', { exact: true }).count(), 0, 'Wizard skill choices do not include the unsupported Nature proficiency');
  await manager.getByRole('button', { name: 'Save changes' }).click();
  await manager.getByText(/Wizard spellbook \(names\/IDs only\)/).waitFor();
  let wizardRecord = (await manager.evaluate(() => window.dungeonDeputy.command('/api/characters'))).find(item => item.class === 'wizard');
  assert.deepEqual(wizardRecord.cantrips, ['acid-splash','fire-bolt','light']);
  assert.deepEqual(wizardRecord.spellbook, ['alarm','burning-hands','detect-magic','disguise-self','magic-missile','shield']);
  assert.deepEqual(wizardRecord.preparedSpells, ['alarm','burning-hands','detect-magic','disguise-self']);
  assert.equal(wizardRecord.spellSaveDc, 10);
  assert.equal(wizardRecord.spellAttackBonus, 2);
  assert.equal(wizardRecord.support.citations.spells.includes('PDF p. 79'), true);
  assert.equal(wizardRecord.support.pdfSha256, 'sha256:8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87');
  assert.equal(Object.hasOwn(wizardRecord, 'spellDescriptions'), false);
  assert.equal(Object.hasOwn(wizardRecord, 'spellEffects'), false);
  await manager.getByRole('button', { name: 'Expend spell slot' }).click();
  await manager.getByRole('button', { name: 'Short rest' }).click();
  await manager.waitForFunction(async () => (await window.dungeonDeputy.command('/api/characters')).some(item => item.class === 'wizard' && item.arcaneRecoveryAvailable), { timeout: 5000 });
  await manager.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Arcane Recovery' && !button.disabled), { timeout: 5000 });
  await manager.getByRole('button', { name: 'Arcane Recovery' }).click();
  await manager.waitForFunction(async () => (await window.dungeonDeputy.command('/api/characters')).some(item => item.class === 'wizard' && item.arcaneRecoveryUsed), { timeout: 5000 });
  wizardRecord = (await manager.evaluate(() => window.dungeonDeputy.command('/api/characters'))).find(item => item.class === 'wizard' && item.arcaneRecoveryUsed);
  assert.equal(wizardRecord.currentSpellSlots, 2);
  assert.equal(wizardRecord.arcaneRecoveryUsed, true);
  manager.once('dialog', dialog => dialog.accept());
  await manager.getByRole('button', { name: 'Delete character' }).click();
}
