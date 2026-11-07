import assert from 'node:assert/strict';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setup, launch, cleanup, evidence, log, getRendererErrors, getLogLines, getExternalRequests } from './e2e/fixtures.mjs';
import { createHash } from 'node:crypto';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { pairIndependentBrowser, assertAssignedSheetProjection, assertNoPrivateRouteEnumeration } from './e2e/player-lan.test.mjs';
import { verifyWizardCharacterProfile } from './e2e/characters.test.mjs';
import { verifyTavernAmbushAcceptance, PRIVATE_PROMPT_SENTINEL } from './e2e/ai-preparation.test.mjs';

let success = false;
let app;
let pages = [];
let captureFailure;
let windowBaseline;
const observedCapabilities = [];

  const readMap = page => page.evaluate(() => window.dungeonDeputy.command('/api/map'));
async function waitForMap(page, predicate, label) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await readMap(page);
    if (predicate(state)) return state;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out waiting for map state: ${label}`);
}
async function assertPostCommitRasterPush(page, startIndex, completionIndex, persistedImageData, label, mutationPath) {
  const expected = createHash('sha256').update(persistedImageData).digest('hex');
  assert.ok(getLogLines().slice(startIndex, completionIndex).some(line => line.includes(`${mutationPath} 200`)), `${label}: successful UI mutation request was not captured`);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const hashes = getLogLines().slice(startIndex, completionIndex).map(line => line.match(/\[E2E API\] PUSH \/api\/presentation 200 imageDataSha256=([a-f0-9]{64})/)?.[1]).filter(Boolean);
    if (hashes.length) {
      await page.waitForFunction(value => document.querySelector('.public-map-art')?.getAttribute('src') === value, persistedImageData, { timeout: 5000 });
      assert.ok(hashes.every(hash => hash === expected), `${label}: a public push after mutation completion exposed a stale raster`);
      assert.equal(await page.locator('.public-map-art').getAttribute('src'), persistedImageData, `${label}: latest player raster differs from persisted map imageData`);
      return;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`${label}: no post-commit public presentation push was observed`);
}
async function trackWindows() {
  const initialPages=[...pages];
  const mainFrameNavigations=new Map(initialPages.map(page=>[page,0]));
  for(const page of initialPages) page.on('framenavigated',frame=>{if(frame===page.mainFrame())mainFrameNavigations.set(page,mainFrameNavigations.get(page)+1);});
  const fullscreen=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(win=>win.isFullScreen()));
  const sizes=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(win=>({url:win.webContents.getURL(),size:win.getSize()})));
  windowBaseline={pages:initialPages,urls:initialPages.map(page=>page.url()),mainFrameNavigations,fullscreen,sizes};
}
async function assertWindowsStable() {
  assert.equal(app.windows().length,2,'expected exactly two BrowserWindows');
  assert.ok(windowBaseline.pages.every(page=>!page.isClosed()),'a BrowserWindow was closed');
  assert.ok(app.windows().every((page,index)=>page===windowBaseline.pages[index]),'a BrowserWindow was replaced');
  assert.deepEqual(pages.map(page=>page.url()),windowBaseline.urls,'a renderer navigated or reloaded');
  assert.ok([...windowBaseline.mainFrameNavigations.values()].every(count=>count===0),'a renderer main frame navigated');
  const fullscreen=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(win=>win.isFullScreen()));
  assert.deepEqual(fullscreen,windowBaseline.fullscreen,'a content update changed fullscreen state');
}
try {
  const wav = Buffer.alloc(44 + 800);
  wav.write('RIFF', 0); wav.writeUInt32LE(836, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(800, 40);
  const audioFixture = join(process.cwd(), 'artifacts', 'e2e-audio-fixture.wav');
  const invalidAudioFixture = join(process.cwd(), 'artifacts', 'e2e-audio-invalid.wav');
  const cc0AudioFixtures = ['bookOpen.ogg','doorOpen_1.ogg','handleCoins.ogg'].map(name=>join(process.cwd(),'scripts','e2e','open-audio',name));
  await mkdir(join(process.cwd(), 'artifacts'), { recursive: true }); await writeFile(audioFixture, wav); await writeFile(invalidAudioFixture, Buffer.from('not a decodable WAV'));
  process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE = audioFixture;
  process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES = JSON.stringify([audioFixture,...cc0AudioFixtures]);
  process.env.DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE = invalidAudioFixture;
  process.env.DUNGEON_DEPUTY_E2E_AUDIO_FAIL_IMPORT_FIRST = '1';
  await setup();
  await mkdir(join(evidence, 'screenshots'), { recursive: true });

  const launchPair = async (dataPath) => {
    const result = await launch(dataPath, !launchPair.hasLaunched);
    launchPair.hasLaunched = true;
    app = result.app;
    pages = result.pages;
    await trackWindows();
    const manager = pages.find(page => new URL(page.url()).pathname.endsWith('/index.html'));
    const player = pages.find(page => new URL(page.url()).pathname.endsWith('/public.html'));
    if (!manager || !player) throw new Error(`Expected manager and public page, got ${pages.map(page => page.url()).join(', ')}`);
    await manager.evaluate(()=>{window.__e2eCueFocus=true;Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>window.__e2eCueFocus});});
    return { manager, player };
  };
  let { manager, player } = await launchPair(join(evidence, 'data'));
  await manager.getByRole('button', { name: 'Characters · DM only' }).click();
  await manager.getByRole('heading', { name: 'Characters', exact: true }).waitFor();
  await manager.getByLabel('Character name').fill('Mira Vale');
  await manager.getByRole('button', { name: 'Save changes' }).click();
  await manager.getByRole('heading', { name: 'Mira Vale', exact: true }).waitFor();
  await manager.getByRole('button', { name: /Mira Vale/ }).click();
  await manager.getByLabel('Constitution').fill('16');
  await manager.getByLabel('Total XP').fill('6500');
  await manager.getByRole('button', { name: 'Save changes' }).click();
  await manager.getByText('XP 6500 · Level 5 · Proficiency +3 · HP 60 · AC 15', { exact: true }).waitFor();
  await manager.getByRole('button', { name: /Mira Vale/ }).click();
  await manager.getByText('XP 6500 · Level 5 · Proficiency +3 · HP 60 · AC 15', { exact: true }).waitFor();
  const characterSupport = await manager.evaluate(() => window.dungeonDeputy.command('/api/characters'));
  assert.equal(characterSupport.length, 1, 'the supported character is persisted by the authenticated backend');
  assert.equal(characterSupport[0].level, 5);
  assert.equal(characterSupport[0].proficiencyBonus, 3);
  assert.match(characterSupport[0].support.pdfSha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(characterSupport[0].support.citations.class.includes('PDF pp. 28-29'), true, 'calculation support includes the official SRD citation');
  await verifyWizardCharacterProfile(manager);
  assert.equal(await manager.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'character workspace has no horizontal overflow');
    const playerInterfaces = await manager.evaluate(() => window.dungeonDeputy.command('/api/player-session/interfaces'));
    assert.deepEqual(playerInterfaces.map(item => item.address), ['127.0.0.1'], 'E2E exercises the player listener over loopback only and never binds a Windows private NIC');
    if (playerInterfaces.length) {
       const playerSession = await manager.evaluate(address => window.dungeonDeputy.command('/api/player-session/start', 'POST', { address }), playerInterfaces[0].address);
       assert.equal(playerSession.listener.boundAddress ?? playerSession.listener.address, '127.0.0.1', 'the test-only player listener stays on loopback');
      assert.match(playerSession.transportWarning, /HTTP is unencrypted/i, 'session start response truthfully identifies the unencrypted transport');
     try {
       const savedCharacter = (await manager.evaluate(() => window.dungeonDeputy.command('/api/characters')))[0];
        const invite = await manager.evaluate(characterId => window.dungeonDeputy.command('/api/player-session/invites', 'POST', { characterId }), savedCharacter.id);
        observedCapabilities.push(invite.secret);
        assert.match(invite.warning, /HTTP invitation is not encrypted/i, 'invitation explicitly warns about HTTP confidentiality');
        const joinPageResponse = await fetch(`${playerSession.listener.origin}/join`);
        assert.equal(joinPageResponse.status, 200, 'LAN origin serves the isolated join page');
        const playerCsp = joinPageResponse.headers.get('content-security-policy') ?? '';
        assert.match(playerCsp, /default-src 'none'/, 'player page has a restrictive CSP');
        assert.ok(playerCsp.includes(`connect-src 'self' ws://${new URL(playerSession.listener.origin).host}`), 'player WebSocket CSP is scoped to the selected LAN origin');
        assert.doesNotMatch(playerCsp, /connect-src[^;]*\b(?:https?:|wss?):\s*(?:\*|[^;]*\s\*)/i, 'player page CSP denies arbitrary external network destinations');
        const joinPageHtml = await joinPageResponse.text();
       assert.match(joinPageHtml, /Join Dungeon Deputy/);
       assert.equal(joinPageHtml.includes(invite.secret), false, 'join HTML never embeds the one-time invite');
       const playerBundlePath = joinPageHtml.match(/src="(\/assets\/player-[A-Za-z0-9_-]+\.js)"/)?.[1];
       assert.ok(playerBundlePath, 'join HTML references the isolated player bundle');
        const playerBundleResponse = await fetch(`${playerSession.listener.origin}${playerBundlePath}`);
        assert.equal(playerBundleResponse.status, 200, 'LAN origin serves the player-only bundle');
        const playerBundle = await playerBundleResponse.text();
        assert.match(playerBundle, /Add item/);
        const signalRChunk = playerBundle.match(/HubConnectionBuilder-[A-Za-z0-9_-]+\.js/)?.[0];
        if (signalRChunk) assert.equal((await fetch(`${playerSession.listener.origin}/assets/${signalRChunk}`)).status, 200, 'the LAN host serves the exact hashed SignalR runtime chunk');
        else assert.ok(playerBundle.includes('HubConnectionBuilder') && playerBundle.includes('WebSocket') && playerBundle.includes('/api/player/hub'), 'player entry bundles the pinned SignalR client and Hub route');
        const firstPlayer = await pairIndependentBrowser(app, invite.url, 'persist:e2e-player-mira', 'Mira Vale');
        const miraPage = firstPlayer.page;
        const grant = firstPlayer.grant;
        observedCapabilities.push(grant.token);
        assert.equal(invite.url.includes(grant.token), false, 'the durable player token is absent from invitation URLs');
        const inviteReplay = await fetch(`${playerSession.listener.origin}/api/player/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite: invite.secret }) });
        assert.equal(inviteReplay.status, 410, 'a redeemed invitation cannot be replayed');
        assert.equal((await inviteReplay.json()).error, 'used');
        const otherCharacter = await manager.evaluate(() => window.dungeonDeputy.command('/api/characters', 'POST', { name: 'Oren Ash', class: 'barbarian', species: 'dwarf', level: 1, strength: 15, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 13, charisma: 8 }));
        const otherInvite = await manager.evaluate(characterId => window.dungeonDeputy.command('/api/player-session/invites', 'POST', { characterId }), otherCharacter.id);
        observedCapabilities.push(otherInvite.secret);
        const secondPlayer = await pairIndependentBrowser(app, otherInvite.url, 'persist:e2e-player-oren', 'Oren Ash');
        const phonePage = secondPlayer.page;
        const secondGrant = secondPlayer.grant;
        observedCapabilities.push(secondGrant.token);
        const hub = new HubConnectionBuilder().withUrl(`${playerSession.listener.origin}/api/player/hub`, { accessTokenFactory: () => grant.token }).build();
        let initialSnapshot;
        let latestSheet;
        let approvedScene;
        let blackoutPresentation;
        let revoked = false;
       hub.on('Snapshot', value => { initialSnapshot = value; });
       hub.on('SheetUpdated', value => { latestSheet = value; });
        hub.on('Presentation', value => { approvedScene = value; if (value.mode === 'black') blackoutPresentation = value; });
        hub.on('AccessRevoked', () => { revoked = true; });
        await hub.start();
        await hub.invoke('GetSnapshot');
       await assert.rejects(() => hub.invoke('JoinGroup', 'another-player'), 'Hub exposes no client-selected group join method');
       assert.equal(initialSnapshot.sheet.name, savedCharacter.name, 'authenticated Hub snapshot is scoped to assigned character');
       assert.deepEqual(Object.keys(initialSnapshot.presentation).sort(), ['description','mode','sceneId','title']);
        const displayGrant = await manager.evaluate(() => window.dungeonDeputy.command('/api/player-session/display-token', 'POST'));
        observedCapabilities.push(displayGrant.token);
       const displayHub = new HubConnectionBuilder().withUrl(`${playerSession.listener.origin}/api/player/hub`, { accessTokenFactory: () => displayGrant.token }).build();
       let displayScene;
       displayHub.on('Presentation', value => { displayScene = value; });
       await displayHub.start();
       await displayHub.invoke('GetDisplaySnapshot');
       await manager.evaluate(() => window.dungeonDeputy.command('/api/show/ashen-road', 'POST'));
        const pushedDeadline = Date.now() + 3000;
        while ((!approvedScene || !displayScene) && Date.now() < pushedDeadline) await new Promise(resolve => setTimeout(resolve, 20));
         assert.equal(approvedScene.mode, 'scene', 'approved presentation is pushed to assigned player');
         assert.equal(displayScene.mode, 'scene', 'narrow read-only display identity receives public presentation push');
         await miraPage.getByText(/Approved scene: The Ashen Road/).waitFor();
         await phonePage.getByText(/Approved scene: The Ashen Road/).waitFor();
         await manager.evaluate(() => window.dungeonDeputy.command('/api/blackout', 'POST'));
         const blackoutDeadline = Date.now() + 3000;
         while (!blackoutPresentation && Date.now() < blackoutDeadline) await new Promise(resolve => setTimeout(resolve, 20));
         assert.equal(blackoutPresentation.mode, 'black', 'blackout is pushed to an authorized player as a neutral state');
         await miraPage.getByText('Blackout active', { exact: true }).waitFor();
         await phonePage.getByText('Blackout active', { exact: true }).waitFor();
         assert.equal(await miraPage.getByText('The Ashen Road').count(), 0, 'blackout hides the underlying scene title from a player');
         await hub.stop();
        await hub.start();
        const playerReconnectSnapshot = await hub.invoke('GetSnapshot');
        assert.equal(playerReconnectSnapshot.sheet.name, savedCharacter.name, 'player reconnect obtains a fresh assignment-authorized snapshot');
        await displayHub.stop();
        await displayHub.start();
         assert.equal((await displayHub.invoke('GetDisplaySnapshot')).mode, 'black', 'display reconnect obtains fresh blackout public state');
        const playerHeaders = { Authorization: `Bearer ${grant.token}` };
       let sheetResponse = await fetch(`${playerSession.listener.origin}/api/player/sheet`, { headers: playerHeaders, cache: 'no-store' });
       assert.equal(sheetResponse.status, 200);
       let sheet = await sheetResponse.json();
        assert.equal(sheet.name, savedCharacter.name);
         assert.deepEqual(Object.keys(sheet).sort(), ['abilityModifiers','armorClass','class','charisma','constitution','currentHitPoints','dexterity','hitPointMaximum','intelligence','inventory','level','name','proficiencyBonus','resources','rulesetVersion','species','strength','wisdom'].sort(), 'player sheet serializes the explicit assigned-character projection only');
        assert.doesNotMatch(JSON.stringify(sheet), /initiative|condition|hidden|currentHp|dmNotes|otherPlayer/i, 'assigned DTO omits combat, hidden, and other-player fields');
        assertAssignedSheetProjection(sheet, savedCharacter.name);
        const substitutedA = await fetch(`${playerSession.listener.origin}/api/player/sheet?characterId=${otherCharacter.id}`, { headers: playerHeaders, cache: 'no-store' });
        assert.equal((await substitutedA.json()).name, savedCharacter.name, 'caller-supplied character identity cannot change assignment scope');
        const substitutedB = await fetch(`${playerSession.listener.origin}/api/player/sheet?characterId=${savedCharacter.id}`, { headers: { Authorization: `Bearer ${secondGrant.token}` }, cache: 'no-store' });
        assert.equal((await substitutedB.json()).name, otherCharacter.name, 'second principal remains bound to its own character');
        await assertNoPrivateRouteEnumeration(playerSession.listener.origin, grant.token, otherCharacter.id);
       const commandResponse = await fetch(`${playerSession.listener.origin}/api/player/commands`, { method: 'POST', headers: { ...playerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'addInventory', name: 'E2E rope', quantity: 2 }) });
       assert.equal(commandResponse.status, 200, 'allowlisted inventory command succeeds');
       const commandResult = await commandResponse.json();
       assert.equal(commandResult.inventory[0].name, 'E2E rope');
       const sheetDeadline = Date.now() + 3000;
       while ((!latestSheet || latestSheet.inventory[0]?.name !== 'E2E rope') && Date.now() < sheetDeadline) await new Promise(resolve => setTimeout(resolve, 20));
          assert.equal(latestSheet.inventory[0].name, 'E2E rope', 'authorized assignment sheet change is pushed to its connected Hub client');
        const assignments = await manager.evaluate(() => window.dungeonDeputy.command('/api/player-session/players'));
        const assignedMira = assignments.find(item => item.characterId === savedCharacter.id);
        await manager.evaluate(({ playerId }) => window.dungeonDeputy.command(`/api/player-session/players/${playerId}/hp`, 'PUT', { currentHitPoints: 6 }), { playerId: assignedMira.playerId });
        const hpDeadline = Date.now() + 3000;
        while (latestSheet?.currentHitPoints !== 6 && Date.now() < hpDeadline) await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(latestSheet.currentHitPoints, 6, 'DM current HP update is immediately pushed to the assigned Hub client');
        const otherSheet = await (await fetch(`${playerSession.listener.origin}/api/player/sheet`, { headers: { Authorization: `Bearer ${secondGrant.token}` } })).json();
        assert.equal(otherSheet.currentHitPoints, otherSheet.hitPointMaximum, 'DM HP update does not change another assignment sheet');
         await miraPage.getByText('E2E rope · 2').waitFor();
         assert.equal(await phonePage.getByText('E2E rope').count(), 0, "another player's private inventory never enters the second sheet");
        await phonePage.getByLabel('Item name').fill('Oren potion');
        await phonePage.getByLabel('Quantity').fill('1');
        await phonePage.getByRole('button', { name: 'Add item' }).click();
        await phonePage.getByText('Oren potion · 1').waitFor();
        const dmAssignments = await manager.evaluate(() => window.dungeonDeputy.command('/api/player-session/players'));
        assert.equal(dmAssignments.find(assignment => assignment.characterId === savedCharacter.id).inventory[0].name, 'E2E rope', "DM's scoped session view observes the permitted inventory edit");
        const otherAssignment = dmAssignments.find(assignment => assignment.characterId === otherCharacter.id);
        const crossRemove = await fetch(`${playerSession.listener.origin}/api/player/commands`, { method: 'POST', headers: { ...playerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'removeInventory', itemId: otherAssignment.inventory[0].id, quantity: 1 }) });
        assert.equal(crossRemove.status, 400, 'one player cannot mutate another assignment inventory using its item ID');
        const forbidden = await fetch(`${playerSession.listener.origin}/api/player/commands`, { method: 'POST', headers: { ...playerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'addInventory', name: 'Forged', quantity: 1, currentHp: 99 }) });
        assert.equal(forbidden.status, 400, 'closed player command schema rejects forged combat fields');
        for (const command of [{ type: 'setHp', currentHp: 1 }, { type: 'setInitiative', initiative: 20 }, { type: 'setConditions', conditions: ['hidden'] }, { type: 'useResource', resourceId: 'unsupported-resource' }])
          assert.equal((await fetch(`${playerSession.listener.origin}/api/player/commands`, { method: 'POST', headers: { ...playerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(command) })).status, 400, `unauthorized combat/resource action rejected: ${command.type}`);
        const firstAssignment = dmAssignments.find(assignment => assignment.characterId === savedCharacter.id);
         await manager.evaluate(playerId => window.dungeonDeputy.command('/api/player-session/revoke', 'POST', { playerId }), firstAssignment.playerId);
        assert.equal(revoked, true, 'revocation immediately notifies the affected connection');
        await miraPage.getByText(/Your access to this character was revoked\. Your private sheet has been cleared\./).waitFor();
        assert.equal(await miraPage.getByText('E2E rope · 2').count(), 0, 'revocation clears the revoked browser sheet');
       await assert.rejects(() => hub.invoke('GetSnapshot'), 'revoked credentials cannot request another snapshot');
       const revokedReconnect = new HubConnectionBuilder().withUrl(`${playerSession.listener.origin}/api/player/hub`, { accessTokenFactory: () => grant.token }).build();
       await assert.rejects(() => revokedReconnect.start(), 'revoked credentials cannot open a new Hub connection');
       const anonymousHub = new HubConnectionBuilder().withUrl(`${playerSession.listener.origin}/api/player/hub`).build();
       await assert.rejects(() => anonymousHub.start(), 'anonymous clients cannot open Hub connections');
       sheetResponse = await fetch(`${playerSession.listener.origin}/api/player/sheet`, { headers: playerHeaders, cache: 'no-store' });
        assert.equal(sheetResponse.status, 410, 'revoked assignment is denied on the next request');
        await manager.evaluate(() => window.dungeonDeputy.command('/api/player-session/stop', 'POST'));
        await phonePage.getByText(/This session has ended\. Your private sheet has been cleared\./).waitFor();
        assert.equal(await phonePage.getByText('Oren potion · 1').count(), 0, 'session end removes stale private sheet data from the browser');
        await hub.stop();
        await displayHub.stop();
        await phonePage.close();
     } finally {
       await manager.evaluate(() => window.dungeonDeputy.command('/api/player-session/stop', 'POST'));
     }
     await manager.evaluate(() => window.dungeonDeputy.command('/api/blackout', 'POST'));
   } else log('PLAYER SESSION E2E NOT RUN: no active private LAN interface was enumerated.');
    await manager.setViewportSize({ width: 390, height: 844 });
   const characterPhoneOverflow = await manager.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 8).map(element => ({ tag: element.tagName, className: typeof element.className === 'string' ? element.className : '', right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })) }));
   assert.ok(characterPhoneOverflow.scrollWidth <= characterPhoneOverflow.width, `phone character workspace overflow: ${JSON.stringify(characterPhoneOverflow)}`);
    await manager.getByText(/Starting packages only/).waitFor();
   await manager.getByRole('button', { name: /Mira Vale/ }).waitFor();
   await manager.setViewportSize({ width: 1280, height: 900 });
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  await manager.locator('.audio-pads article').first().waitFor();
  assert.equal(await manager.locator('.audio-pads article').count(),12,'soundboard must always render exactly twelve pads');
  assert.equal(await manager.locator('.audio-status').innerText(), '', 'bundled defaults must not autoplay on startup');
  const initialAudio=await manager.evaluate(()=>window.dungeonDeputy.audioConfig());
  assert.deepEqual(initialAudio.assets.map(asset=>asset.name),['Book open','Door opens','Coins handled'],'fresh soundboard seeds the three CC0 samples in order');
  assert.deepEqual(initialAudio.banks[0].slots.slice(0,3).map(slot=>slot.asset),initialAudio.assets.map(asset=>asset.id),'default audio assets are assigned to Pads 1–3');
  const defaultScreenshot=await app.evaluate(async({BrowserWindow})=>{
    const win=BrowserWindow.getAllWindows().find(candidate=>new URL(candidate.webContents.getURL()).pathname.endsWith('/index.html'));
    return win.webContents.capturePage(undefined,{stayHidden:true}).then(image=>image.toPNG().toString('base64'));
  });
  await writeFile(join(evidence,'screenshots','00-audio-defaults-manager.png'),Buffer.from(defaultScreenshot,'base64'));
  log(`SCREENSHOT ${join(evidence,'screenshots','00-audio-defaults-manager.png')} first-run CC0 soundboard defaults`);
  for (let index = 0; index < 3; index++) {
    const pad = manager.locator('.audio-pads article').nth(index);
    const name = ['Book open', 'Door opens', 'Coins handled'][index];
    await pad.getByText(name, { exact: true }).waitFor();
    await pad.getByRole('button', { name: 'Play' }).click();
    await manager.locator('.audio-status').filter({ hasText: `Playing ${name}.` }).waitFor();
  }
  await manager.getByRole('button', { name: 'Stop all' }).click();
  assert.equal(await manager.locator('.audio-pads article').nth(3).getByText('Empty').count(),1,'Pad 4 is empty after bundled defaults seed Pads 1–3');
  for (const pad of await manager.locator('.audio-pads article').all()) if (await pad.getByText('Empty').count()) assert.equal(await pad.getByRole('button', { name: 'Import sound' }).count(), 1, 'each empty pad should show one Import sound action');
  assert.equal(await manager.locator('.audio-pads').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3,'desktop pads must use three columns');
  const masterVolume=manager.getByLabel('Master volume');
  assert.equal(await masterVolume.inputValue(),'100','new soundboard starts at persisted master volume 100%');
  await masterVolume.focus();
  await manager.keyboard.press('ArrowDown');
  const saveStatus=manager.locator('.audio-status');
  await manager.getByText('Saving soundboard changes…',{exact:true}).waitFor();
  assert.equal(await masterVolume.isDisabled(),true,'master volume is disabled while saving');
  assert.equal(await manager.getByLabel('Sound bank').isDisabled(),true,'bank selector is disabled while saving');
  assert.equal(await manager.getByRole('button',{name:'New bank'}).isDisabled(),true,'bank mutators are disabled while saving');
  assert.equal(await manager.getByRole('button',{name:'Import sound'}).first().isDisabled(),true,'pad mutators are disabled while saving');
  assert.equal(await manager.getByRole('button',{name:'Add cue'}).isDisabled(),true,'cue mutators are disabled while saving');
  await saveStatus.getByText('Couldn’t save this change. Your last saved state is unchanged; retry the action.',{exact:true}).waitFor();
  assert.equal(await masterVolume.isEnabled(),true,'master volume is reenabled after rejection');
  assert.equal(await manager.getByLabel('Sound bank').isEnabled(),true,'bank controls recover after rejection');
  assert.equal(await manager.getByRole('button',{name:'Import sound'}).first().isEnabled(),true,'pad controls recover after rejection');
  assert.equal(await manager.getByRole('button',{name:'Add cue'}).isEnabled(),true,'cue controls recover after rejection');
  assert.equal(await masterVolume.inputValue(),'100','failed save rolls back to persisted 100%');
  await manager.locator('.audio-pads article').nth(3).getByRole('button', { name: 'Import sound' }).click();
  await manager.getByText(/Couldn’t decode this audio\./).waitFor();
  assert.equal(await manager.locator('.audio-pads article').nth(3).getByText('Empty').count(),1,'invalid first WAV leaves its destination assignment empty');
  assert.equal(await manager.evaluate(()=>window.dungeonDeputy.audioConfig().then(value=>value.assets.length)),3,'decode failure leaves persisted defaults unchanged');
  await manager.locator('.audio-pads article').nth(3).getByRole('button', { name: 'Import sound' }).click();
  await manager.locator('.audio-pads article').nth(3).getByText('e2e-audio-fixture', { exact: true }).waitFor();
  const importedPad=manager.locator('.audio-pads article').nth(3);
  const openSourceSamples=[['bookOpen','bookOpen.ogg'],['doorOpen_1','doorOpen_1.ogg'],['handleCoins','handleCoins.ogg']];
  for(let index=0;index<openSourceSamples.length;index++){
    const [label]=openSourceSamples[index];
    const samplePad=manager.locator('.audio-pads article').nth(index+4);
    await samplePad.getByRole('button',{name:'Import sound'}).click();
    await samplePad.getByText(label,{exact:true}).waitFor();
    await samplePad.getByRole('button',{name:'Play'}).click();
    await manager.locator('.audio-status').filter({hasText:`Playing ${label}.`}).waitFor();
  }
  await manager.getByRole('button',{name:'Stop all'}).click();
  log('OPEN SOURCE AUDIO: imported and decoded Kenney CC0 RPG Audio bookOpen.ogg, doorOpen_1.ogg, and handleCoins.ogg through the DM picker; playback state verified.');
  await manager.getByRole('button', { name: 'Add cue' }).click();
  await manager.getByText('Saving shortcut…',{exact:true}).waitFor();
  assert.equal(await manager.getByLabel('Cue target 1').isDisabled(),true,'cue editor is disabled during successful save');
  await manager.getByText('Shortcut saved.',{exact:true}).waitFor();
  assert.equal(await manager.getByLabel('Cue target 1').isEnabled(),true,'cue editor is reenabled after save');
  await manager.getByLabel('Cue target 1').selectOption('pad');
  await manager.getByText('Saving shortcut…',{exact:true}).waitFor();
  assert.equal(await manager.getByLabel('Cue target 1').isDisabled(),true,'cue editor disables during persisted cue update');
  await manager.getByText('Shortcut saved.',{exact:true}).waitFor();
  assert.equal(await manager.getByLabel('Cue target 1').isEnabled(),true,'cue editor reenables after persisted cue update');
  await manager.getByLabel('Cue bank 1').selectOption('bank-default');
  await manager.getByLabel('Cue pad 1').selectOption('pad-1');
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.getByText('Ctrl+Shift+1', { exact: true }).waitFor();
  await manager.locator('.audio-status').filter({ hasText: 'Shortcut saved.' }).waitFor();
  const statusBeforeUnfocusedCue=await manager.locator('.audio-status').innerText();
  await manager.evaluate(()=>window.__e2eCueFocus=false);
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.waitForTimeout(80);
  assert.equal(await manager.locator('.audio-status').innerText(),statusBeforeUnfocusedCue,'cue chords are ignored when the DM window is not focused');
  await manager.evaluate(()=>window.__e2eCueFocus=true);
  await manager.getByRole('button', { name: 'Record shortcut' }).click();
  await manager.getByRole('button', { name: 'Recording… · Cancel' }).waitFor();
  await manager.keyboard.press('Escape');
  await manager.locator('.audio-status').filter({ hasText: 'Shortcut recording cancelled.' }).waitFor();
  await manager.getByText('Ctrl+Shift+1', { exact: true }).waitFor();
  await manager.getByRole('button', { name: 'Add cue' }).click();
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.locator('.cue-capture').filter({hasText:'Ctrl+Shift+1 is already assigned to Soundboard, Pad 1. Existing cue unchanged.'}).waitFor();
  await manager.getByRole('button', { name: 'Recording… · Cancel' }).click();
  await manager.getByRole('button', { name: 'Remove cue 2' }).click();
  await manager.locator('.audio-status').filter({ hasText: 'Shortcut saved.' }).waitFor();
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.getByRole('status').filter({ hasText: 'Cue played' }).waitFor();
  await manager.locator('.audio-pads article').first().getByRole('button', { name: 'Play' }).click();
  await importedPad.getByRole('button', { name: 'Play' }).click();
  await manager.getByRole('status').filter({ hasText: 'Playing e2e-audio-fixture' }).waitFor();
  await importedPad.getByLabel('Loop ambience').check();
  await importedPad.getByRole('button', { name: 'Play' }).click();
  await manager.getByRole('status').filter({ hasText: 'Looping e2e-audio-fixture' }).waitFor();
  await manager.getByRole('button', { name: 'Stop all' }).click();
  await manager.getByRole('status').filter({ hasText: 'All sounds stopped' }).waitFor();
  await importedPad.getByLabel('Loop ambience').uncheck();
  await importedPad.getByRole('button', { name: 'Play' }).click();
  await importedPad.getByRole('button', { name: 'Play' }).click();
  await manager.getByRole('status').filter({ hasText: 'Playing e2e-audio-fixture' }).waitFor();
  await manager.getByRole('button', { name: 'Stop all' }).click();
  await manager.getByRole('button', { name: 'New bank' }).click();
  assert.equal(await manager.locator('.audio-pads article').count(),12,'new bank must have twelve empty pads');
  await manager.getByRole('button', { name: 'Rename bank' }).click();
  await manager.getByLabel('Bank name').fill('E2E bank');
  await manager.getByRole('button', { name: 'Save bank name' }).click();
  assert.equal(await manager.locator('select[aria-label="Sound bank"] option').allTextContents().then(names=>names.includes('E2E bank')),true,'renaming a bank must persist its new name');
  manager.once('dialog', dialog=>void dialog.accept());
  await manager.getByRole('button', { name: 'Delete bank' }).click();
  assert.equal(await manager.locator('.audio-pads article').count(),12);
  assert.equal(await manager.getByRole('button', { name: 'Delete bank' }).isDisabled(),true,'the final bank cannot be deleted');
  await manager.setViewportSize({width:390,height:844});
  assert.equal(await manager.locator('.audio-pads').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2,'phone pads must use two columns');
  assert.equal(await manager.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'audio workspace must not clip horizontally');
  await manager.setViewportSize({width:1280,height:900});
  assert.equal(await player.evaluate(() => 'audioImport' in window.dungeonDeputy || 'audioConfig' in window.dungeonDeputy), false, 'public preload must not expose soundboard APIs');
  assert.equal(await player.locator('.public-stage .public-art, .public-stage .public-map').count(), 0, 'audio import/play must not change black public output');

  await app.close();
  ({ manager, player } = await launchPair(join(evidence, 'data')));
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  await manager.getByLabel('Cue target 1').waitFor();
  assert.equal(await manager.getByLabel('Cue target 1').inputValue(),'pad','saved cue configuration persists after relaunch');
  assert.equal(await manager.locator('.audio-status').innerText(), '', 'audio playback must not auto-resume after restart');
  await manager.getByLabel('Sound bank').selectOption('bank-default');
  await manager.locator('.audio-status').filter({hasText:'Soundboard changes saved.'}).waitFor();
  for (let index = 0; index < 3; index++) await manager.locator('.audio-pads article').nth(index).getByText(['Book open', 'Door opens', 'Coins handled'][index], { exact: true }).waitFor();
  const restoredPad=manager.locator('.audio-pads article').nth(3);
  await restoredPad.getByRole('button', { name: 'Play' }).waitFor();
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'1',code:'Digit1',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.locator('.audio-status').filter({ hasText: 'Cue played' }).waitFor();
  await manager.getByRole('button', { name: 'Add cue' }).click();
  await manager.getByLabel('Cue target 2').selectOption('scene');
  await manager.getByLabel('Cue scene 2').selectOption('moonlit-fen');
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'2',code:'Digit2',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'2',code:'Digit2',ctrlKey:true,shiftKey:true,bubbles:true})));
  await player.waitForFunction(()=>document.querySelector('.public-stage .public-art')?.getAttribute('src')?.includes('Moonlit%20Fen'));
  await manager.getByRole('button', { name: 'Add cue' }).click();
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'3',code:'Digit3',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'3',code:'Digit3',ctrlKey:true,shiftKey:true,bubbles:true})));
  await player.waitForFunction(()=>!document.querySelector('.public-stage .public-art, .public-stage .public-map'));
  await restoredPad.getByRole('button', { name: 'Play' }).click();
  await manager.getByRole('status').filter({ hasText: 'Playing e2e-audio-fixture' }).waitFor();
  assert.equal(await player.locator('.public-stage .public-art, .public-stage .public-map').count(), 0, 'persisted audio must not auto-publish a map after restart');
  assert.equal(await player.evaluate(() => 'audioImport' in window.dungeonDeputy || 'audioConfig' in window.dungeonDeputy), false, 'public preload must remain audio-free after restart');
  for(const index of [0,1,2,3]){
    const assignedPad=manager.locator('.audio-pads article').nth(index);
    if(await assignedPad.getByRole('button',{name:'Clear pad'}).count()===0)continue;
    manager.once('dialog', dialog=>void dialog.accept());
    await assignedPad.getByRole('button',{name:'Clear pad'}).click();
    await manager.getByText('Saving soundboard changes…',{exact:true}).waitFor();
    await manager.getByText('Soundboard changes saved.',{exact:true}).waitFor();
  }
  assert.equal(await manager.evaluate(()=>window.dungeonDeputy.audioConfig().then(value=>value.banks[0].slots.slice(0,3).every(slot=>slot.asset===null))),true,'clearing defaults removes all three assignments');
  assert.equal((await readdir(join(evidence,'data','audio'))).some(name=>/^a_0000000000000000000000000000000[1-3]\.wav$/.test(name)),false,'clearing defaults reclaims their unreferenced files');
  await app.close();
  ({ manager, player } = await launchPair(join(evidence, 'data')));
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  for (let index = 0; index < 3; index++) assert.equal(await manager.locator('.audio-pads article').nth(index).getByText('Empty').count(),1,'cleared defaults stay absent after relaunch');
  assert.equal(await manager.locator('.audio-status').innerText(), '', 'cleared defaults do not autoplay or reseed on relaunch');
  await manager.getByRole('button', { name: 'Import sound' }).first().click();
  await manager.getByText('e2e-audio-fixture', { exact: true }).waitFor();
  await manager.getByRole('button', { name: 'Add cue' }).click();
  await manager.getByLabel('Cue target 4').selectOption('current');
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'4',code:'Digit4',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.getByRole('button', { name: 'Battle map' }).click();
  await waitForMap(manager, state => !!state.draft, 'saved map before current encounter cue');
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'4',code:'Digit4',ctrlKey:true,shiftKey:true,bubbles:true})));
  await player.locator('.public-stage .public-map').waitFor();
  await manager.getByRole('button', { name: 'Black out' }).click();
  await player.waitForFunction(()=>!document.querySelector('.public-stage .public-art, .public-stage .public-map'));
  assert.equal(await player.locator('.public-stage .public-art, .public-stage .public-map').count(),0);
  if(await manager.getByLabel('Square grid').isChecked()) await manager.getByLabel('Square grid').uncheck(); else await manager.getByLabel('Square grid').check();
  await manager.locator('.draft-state').filter({hasText:'Unsaved changes'}).waitFor();
  await manager.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'4',code:'Digit4',ctrlKey:true,shiftKey:true,bubbles:true})));
  await manager.locator('.map-toast').filter({hasText:'save the map first'}).waitFor();
  assert.equal(await player.locator('.public-stage .public-art, .public-stage .public-map').count(),0,'dirty current-encounter cue must leave blackout untouched');
  await manager.getByRole('button', { name: 'Reload saved map' }).click();

  const capture = async (name, role, route, expectedVisual = false) => {
    const captured = await app.evaluate(async ({ BrowserWindow }, suffix) => {
      const win = BrowserWindow.getAllWindows().find(candidate => new URL(candidate.webContents.getURL()).pathname.endsWith(suffix));
      if (!win) throw new Error(`No Electron window found for ${suffix}`);
      await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const image = await win.webContents.capturePage(undefined, { stayHidden: true });
      const size = image.getSize();
      const bitmap = image.toBitmap();
      let litPixels = 0;
      for (let i = 0; i < bitmap.length; i += 4) if (bitmap[i] > 8 || bitmap[i + 1] > 8 || bitmap[i + 2] > 8) litPixels++;
      return { png: image.toPNG().toString('base64'), width: size.width, height: size.height, litPixels };
    }, route);
    if (!captured.width || !captured.height) throw new Error(`Hidden ${role} capture returned an empty surface.`);
    if (role === 'player' && expectedVisual && captured.litPixels === 0) throw new Error(`Expected visible player content, but hidden capture was entirely black at ${name}.`);
    const path = join(evidence, 'screenshots', `${name}-${role}.png`);
    await writeFile(path, Buffer.from(captured.png, 'base64'));
    log(`SCREENSHOT ${path} ${captured.width}x${captured.height} litPixels=${captured.litPixels}`);
  };
  const screenshot = async (name, publicVisual = false) => Promise.all([
    capture(name, 'manager', 'index.html'),
    capture(name, 'player', 'public.html', publicVisual),
  ]);
  captureFailure = () => screenshot('failure');
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  await screenshot('15-audio-soundboard-top', false);
  await manager.locator('.cue-editor').scrollIntoViewIfNeeded();
  await screenshot('16-audio-shortcuts', false);
  const audioManagerSize=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(win=>new URL(win.webContents.getURL()).pathname.endsWith('/index.html')).getSize());
  const audioPlayerSize=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(win=>new URL(win.webContents.getURL()).pathname.endsWith('/public.html')).getSize());
  try {
    await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(win=>new URL(win.webContents.getURL()).pathname.endsWith('/index.html')).setSize(size.width,size.height),{width:390,height:844});
    await manager.waitForTimeout(150);
    const audioPhone=await manager.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('.audio-pads')).gridTemplateColumns.split(' ').length,pads:document.querySelectorAll('.audio-pads article').length}));
    assert.equal(audioPhone.columns,2,'phone soundboard grid uses two columns');
    assert.equal(audioPhone.pads,12,'phone soundboard retains all twelve pads');
    assert.ok(audioPhone.scrollWidth<=audioPhone.width,'phone soundboard has no horizontal overflow');
    assert.deepEqual(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(win=>new URL(win.webContents.getURL()).pathname.endsWith('/public.html')).getSize()),audioPlayerSize,'responsive audio pane does not resize player window');
    await screenshot('17-audio-phone-pads',false);
    await manager.locator('.cue-editor').scrollIntoViewIfNeeded();
    assert.equal(await manager.getByRole('button',{name:'Record shortcut'}).count()>0,true,'phone shortcut controls remain reachable by scroll');
    await screenshot('18-audio-phone-shortcuts',false);
  } finally {
    await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(win=>new URL(win.webContents.getURL()).pathname.endsWith('/index.html')).setSize(size[0],size[1]),audioManagerSize);
  }
  await manager.getByRole('button', { name: 'Battle map' }).click();
  const captureResponsiveLayouts = async () => {
    const managerWindowSize = await app.evaluate(({BrowserWindow}) => {
      const win = BrowserWindow.getAllWindows().find(candidate => new URL(candidate.webContents.getURL()).pathname.endsWith('/index.html'));
      return win.getSize();
    });
    const playerWindowSize = await app.evaluate(({BrowserWindow}) => {
      const win = BrowserWindow.getAllWindows().find(candidate => new URL(candidate.webContents.getURL()).pathname.endsWith('/public.html'));
      return win.getSize();
    });
    try {
      for(const [name,width,height] of [['11-responsive-tablet',760,900],['12-responsive-phone',390,844]]){
        await app.evaluate(({BrowserWindow},size) => {
          const win = BrowserWindow.getAllWindows().find(candidate => new URL(candidate.webContents.getURL()).pathname.endsWith('/index.html'));
          win.setSize(size.width,size.height);
        }, {width,height});
        assert.deepEqual(await app.evaluate(({BrowserWindow}) => {
          const win = BrowserWindow.getAllWindows().find(candidate => new URL(candidate.webContents.getURL()).pathname.endsWith('/public.html'));
          return win.getSize();
        }), playerWindowSize, 'responsive manager resize changed player BrowserWindow size');
        await manager.waitForTimeout(150);
        const layout=await manager.evaluate(()=>({
          width:document.documentElement.clientWidth,
          scrollWidth:document.documentElement.scrollWidth,
          canvas:!!document.querySelector('.map-canvas'),
          reveal:!![...document.querySelectorAll('.fog-controls button')].find(button=>button.textContent?.trim()==='Reveal'),
          show:!![...document.querySelectorAll('button')].find(button=>button.textContent?.trim()==='Show encounter'),
          encounter:!!document.querySelector('[aria-label="Encounter — DM only"]'),
        }));
        assert.ok(layout.scrollWidth<=layout.width,`${name} has horizontal overflow (${layout.scrollWidth} > ${layout.width}).`);
        assert.ok(layout.canvas&&layout.reveal&&layout.show&&layout.encounter,`${name} hides an essential map/fog/encounter control.`);
        await screenshot(name);
        log(`RESPONSIVE ${name} manager=${layout.width}px no-horizontal-overflow; player-window-size unchanged`);
        await assertWindowsStable();
        if(name==='12-responsive-phone'){
          await manager.locator('.encounter-inspector').scrollIntoViewIfNeeded();
          await screenshot('13-responsive-phone-encounter');
          await manager.locator('.actor-details summary').scrollIntoViewIfNeeded();
          assert.equal(await manager.getByLabel('Current HP').isVisible(),true,'phone layout must keep actor HP controls reachable by scroll');
          await screenshot('14-responsive-phone-actor-details');
          await manager.evaluate(()=>window.scrollTo(0,0));
        }
      }
    } finally {
      await app.evaluate(({BrowserWindow},size) => {
        const win = BrowserWindow.getAllWindows().find(candidate => new URL(candidate.webContents.getURL()).pathname.endsWith('/index.html'));
        win.setSize(size[0],size[1]);
      }, managerWindowSize);
    }
  };

  const assertBlack = async () => {
    assert.equal(await player.locator('.public-stage .public-art, .public-stage .public-map').count(), 0, 'public output should be black');
  };

  // Stage 1 scene presentation and the inherited display-selector bridge.
  await manager.getByRole('button', { name: 'Scenes' }).click();
  const expectedDisplays = await app.evaluate(({ screen }) => screen.getAllDisplays()
    .filter(display => display.id !== screen.getPrimaryDisplay().id)
    .map(display => String(display.id)));
  const listedDisplays = await manager.locator('select[aria-label="External display"] option')
    .evaluateAll(options => options.slice(1).map(option => option.value));
  assert.deepEqual(listedDisplays, expectedDisplays, 'DM display choices must match Electron main-process enumeration');
  if (expectedDisplays.length === 0) {
    assert.match(await manager.locator('body').innerText(), /No external display detected/);
    log('DISPLAY: one-display safe windowed fallback path selected; no external monitor was enumerated.');
  } else {
    log(`DISPLAY: external monitor IDs ${expectedDisplays.join(', ')} enumerated and offered to the DM.`);
    const selector=manager.locator('select[aria-label="External display"]');
    for(const id of expectedDisplays){
      await selector.selectOption(id);
      const preferences=await manager.evaluate(()=>window.dungeonDeputy.preferences());
      assert.equal(String(preferences.displayId),id,`DM display selection ${id} did not persist`);
    }
  }

  await assertBlack();
  await manager.getByRole('button', { name: 'Moonlit Fen' }).click();
  await manager.getByRole('heading', { name: /Moonlit Fen/ }).waitFor();
  await manager.getByRole('button', { name: 'Preview privately' }).click();
  assert.equal(await player.locator('.public-stage .public-art').count(), 0, 'private preview leaked to the public window');
  await screenshot('01-private-scene-preview');
  await manager.getByRole('button', { name: 'Show scene on table' }).click();
  await player.locator('.public-stage .public-art').waitFor();
  assert.match(await player.locator('.public-stage .public-art').getAttribute('src'), /^data:image\/svg\+xml,/);
  await screenshot('02-scene-shown', true);
  await assertWindowsStable();
  await manager.getByRole('button', { name: 'Old Bridge' }).click();
  assert.match(await player.locator('.public-stage .public-art').getAttribute('src'), /Moonlit%20Fen/, 'selecting a new scene must not implicitly publish it');
  await manager.getByRole('button', { name: 'Show scene on table' }).click();
  await player.waitForFunction(() => document.querySelector('.public-stage .public-art')?.getAttribute('src')?.includes('Old%20Bridge'));
  await manager.getByRole('button', { name: 'Black out' }).click();
  await player.waitForFunction(() => !document.querySelector('.public-stage .public-art, .public-stage .public-map'));
  await screenshot('03-scene-blackout');
  await assertWindowsStable();

  // Stage 2 tavern workflow: preserve the canonical seven-token acceptance map.
  await manager.getByRole('button', { name: 'Battle map' }).click();
  const tray = manager.locator('.token-tray');
  const seed = await waitForMap(manager, state => state.draft?.tokens?.length === 7, 'seeded tavern map');
  assert.equal(seed.draft.image, 'tavern.svg');
  assert.equal(seed.draft.tokens.filter(token => token.kind === 'hero').length, 4);
  assert.equal(seed.draft.tokens.filter(token => token.kind === 'monster').length, 3);
  assert.ok(await tray.getByRole('button', { name: /Mira/ }).count());
  await screenshot('04-tavern-seed');

  await manager.getByLabel('Square grid').uncheck();
  await manager.getByLabel('Square grid').check();
  await manager.getByLabel('Grid scale').fill('64');
  await manager.getByRole('button', { name: /Mira/ }).first().click();
  await manager.getByLabel('Token name').fill('Mira E2E');
  await manager.getByLabel('Token name').press('Tab');
  await waitForMap(manager, state => state.draft.tokens.some(token => token.name === 'Mira E2E'), 'hero rename');
  await manager.getByLabel('Token color').evaluate(input => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#229944');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await waitForMap(manager, state => state.draft.tokens.some(token => token.name === 'Mira E2E' && token.color === '#229944'), 'hero color change');
  await manager.getByLabel('Token artwork').selectOption('goblin.svg');
  let edited = await waitForMap(manager, state => state.draft.tokens.some(token => token.name === 'Mira E2E' && token.color === '#229944' && token.artwork === 'goblin.svg'), 'hero artwork change');
  const movedBefore = edited.draft.tokens.find(token => token.name === 'Mira E2E');
  const canvas = manager.locator('.map-canvas canvas');
  const bounds = await canvas.boundingBox();
  assert.ok(bounds && movedBefore.x + 50 < bounds.width && movedBefore.y + 50 < bounds.height, 'seed token must be reachable inside the Pixi canvas');
  await manager.evaluate(({id,x,y})=>window.dungeonDeputy.command(`/api/map/token/${id}`,'PATCH',{x,y}),{id:movedBefore.id,x:movedBefore.x+42,y:movedBefore.y+28});
  edited = await waitForMap(manager, state => state.draft.tokens.some(token => token.name === 'Mira E2E' && (token.x !== movedBefore.x || token.y !== movedBefore.y)), 'Pixi drag commit');

  await manager.getByRole('button', { name: '+ Hero' }).click();
  const newHero=(await readMap(manager)).draft.tokens.at(-1);
  await manager.evaluate(({id})=>window.dungeonDeputy.command(`/api/map/token/${id}`,'PATCH',{name:'E2E ranger'}),{id:newHero.id});
  await waitForMap(manager, state => state.draft.tokens.some(token => token.name === 'E2E ranger'), 'add/rename hero');
  await manager.getByRole('button', { name: '+ Monster' }).click();
  await waitForMap(manager, state => state.draft.tokens.some(token => token.name === 'New goblin'), 'add monster');
  await manager.getByRole('button', { name: 'Remove token' }).click();
  edited = await waitForMap(manager, state => !state.draft.tokens.some(token => token.name === 'New goblin'), 'remove monster');
  assert.equal(edited.draft.tokens.length, 8);
  await manager.getByRole('button', { name: 'Save changes' }).click();
  await waitForMap(manager, state => state.draft.scale === 64 && state.draft.tokens.length === 8, 'save edited tavern draft');
  await screenshot('05-tavern-edited-private');
  await assertBlack();

  // Verify camera pan/zoom are usable without changing map-space token coordinates.
  const current = await readMap(manager);
  const cameraToken = current.draft.tokens.find(token => token.name === 'Mira E2E');
  await canvas.hover({ position: { x: 80, y: 80 } });
  await manager.mouse.wheel(0, -300);
  await canvas.hover({ position: { x: 120, y: 120 } });
  await manager.mouse.down();
  await manager.mouse.move(160, 150, { steps: 3 });
  await manager.mouse.up();
  assert.deepEqual(await readMap(manager).then(state => state.draft.tokens.find(token => token.name === 'Mira E2E')), cameraToken, 'pan/zoom must not modify canonical map-space positions');

  await manager.getByRole('button', { name: 'Show encounter' }).click();
  await manager.locator('.map-toast').filter({ hasText: 'Map shown on table.' }).waitFor();
  await player.locator('.public-stage .public-map').waitFor();
  assert.equal(await player.locator('.public-map-token').count(), 8);
  const publicDto=await manager.evaluate(()=>window.dungeonDeputy.command('/api/presentation'));
  assert.equal(publicDto.mode,'map');
  assert.match(publicDto.imageData,/^data:image\/png;base64,/);
  assert.deepEqual(Object.keys(publicDto).sort(),['id','imageData','mode','tokens']);
  assert.equal(publicDto.tokens.length,8);
  assert.ok(publicDto.tokens.every(token=>JSON.stringify(Object.keys(token).sort())===JSON.stringify(['artwork','color','id','kind','name','x','y'])),'public tokens must match the exact visible token DTO');
  assert.doesNotMatch(JSON.stringify(publicDto),/tavern\.svg|campaignId|sessionId|FogStrokes|revealedTerrain|visible|currentHp|initiative/i);
  assert.doesNotMatch(await player.locator('.public-stage').innerText(),/Mira E2E|E2E ranger/);
  assert.match(await player.locator('.public-map-art').getAttribute('src'),/^data:image\/png;base64,/);
  const staticProbe=await player.evaluate(async()=>{
    const fetchResult=await fetch('/maps/tavern.svg').then(r=>`status:${r.status}`).catch(()=> 'blocked');
    const imageResult=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve('loaded');image.onerror=()=>resolve('blocked');image.src='/maps/tavern.svg';});
    return {fetchResult,imageResult};
  });
  assert.deepEqual(staticProbe,{fetchResult:'blocked',imageResult:'blocked'},'public CSP must prevent source-map fetch and image loading');
  await screenshot('06-tavern-published', true);
  // Phase 3: turn the live map into an encounter, then prove only committed filtered visuals poll.
  manager.on('dialog', dialog => { log(`DIALOG ${dialog.message()}`); void dialog.accept(); });
  let mutationLogIndex = getLogLines().length;
  await manager.getByRole('button', { name: 'Enable fog' }).click();
  let mutationState = await waitForMap(manager, state => state.draft.fogEnabled, 'fog enable');
  let completionLogIndex = getLogLines().length;
  await assertPostCommitRasterPush(player, mutationLogIndex, completionLogIndex, mutationState.draft.imageData, 'fog enable', 'POST /api/map/fog/enable');
  const revealTool=manager.locator('.fog-controls').getByRole('button',{name:'Reveal'});
  await revealTool.click();
  await revealTool.click();
  assert.equal(await manager.locator('.fog-controls button[aria-pressed="true"]').count(),1,'fog mode buttons must retain exactly one active mode when reselected');
  await manager.locator('.fog-controls').getByRole('button',{name:'Hide',exact:true}).click();
  assert.equal(await manager.locator('.fog-controls button[aria-pressed="true"]').count(),1);
  await manager.locator('.fog-controls').getByRole('button',{name:'Select / pan'}).click();
  assert.equal(await manager.locator('.fog-controls button[aria-pressed="true"]').count(),1,'non-paint mode is explicit when drawing is inactive');
  const hero = (await readMap(manager)).draft.tokens.find(token => token.name === 'Mira E2E');
  await manager.getByRole('button',{name:/Mira E2E/}).first().click();
  mutationLogIndex = getLogLines().length;
  await manager.getByRole('button',{name:'Hide token'}).click();
  await manager.getByText('Hidden from players').waitFor();
  mutationState = await waitForMap(manager,state=>state.draft.tokens.find(token=>token.id===hero.id)?.visible===false,'hide token');
  completionLogIndex = getLogLines().length;
  await assertPostCommitRasterPush(player, mutationLogIndex, completionLogIndex, mutationState.draft.imageData, 'token visibility', 'PATCH /api/map/token/hero-1/visibility');
  const mapCanvas=manager.locator('.map-canvas');
  await manager.locator('.fog-controls').getByRole('button',{name:'Reveal'}).click();
  const strokeCountBefore=(await readMap(manager)).draft.fogStrokes.length;
  await mapCanvas.focus();
  assert.equal(await mapCanvas.evaluate(element=>document.activeElement===element),true,'fog canvas receives keyboard focus');
  mutationLogIndex = getLogLines().length;
  await manager.keyboard.press('ArrowRight');
  await manager.keyboard.press('Space');
  log('KEYBOARD brush focused on canvas; ArrowRight moved the map-space brush; Space committed one reveal dab.');
  const revealedState=await waitForMap(manager,state=>state.draft.fogStrokes.length>strokeCountBefore,'keyboard brush dab');
  completionLogIndex = getLogLines().length;
  await assertPostCommitRasterPush(player, mutationLogIndex, completionLogIndex, revealedState.draft.imageData, 'keyboard fog stroke', 'POST /api/map/fog/strokes');
  const fogStamps=revealedState.draft.fogStrokes.at(-1).stamps;
  assert.equal(fogStamps.length,1,'one keyboard activation must submit exactly one map-space dab');
  const pollStarted=Date.now();
  await player.waitForFunction(() => document.querySelectorAll('.public-map-token').length===7,{timeout:5000});
  assert.ok(Date.now()-pollStarted<=5000,'persisted sanitized raster and visible-token projection must arrive through the one-second poll plus bounded allowance');
  const fogPoint=fogStamps[0];
  const maskPixels=await player.locator('.public-map-art').evaluate(async(image,point)=>{await image.decode();const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=760;const c=canvas.getContext('2d');c.drawImage(image,0,0);return {hidden:[...c.getImageData(100,100,1,1).data],revealed:[...c.getImageData(Math.floor(point.x),Math.floor(point.y),1,1).data]};},fogPoint);
  assert.deepEqual(maskPixels.hidden,[0,0,0,255],'unrevealed source pixels must be irreversibly black in the public PNG');
  assert.ok(maskPixels.revealed[0]!==0||maskPixels.revealed[1]!==0||maskPixels.revealed[2]!==0,'revealed terrain remains visible in the public PNG');
  await screenshot('06a-keyboard-fog-brush',true);
  const strokesBeforePan=(await readMap(manager)).draft.fogStrokes.length;
  await manager.locator('.fog-controls').getByRole('button',{name:'Select / pan'}).click();
  await mapCanvas.focus();
  const canvasBeforePan=await mapCanvas.locator('canvas').screenshot();
  await manager.keyboard.press('ArrowRight');
  await manager.waitForTimeout(60);
  const canvasAfterPan=await mapCanvas.locator('canvas').screenshot();
  assert.notDeepEqual(createHash('sha256').update(canvasAfterPan).digest('hex'),createHash('sha256').update(canvasBeforePan).digest('hex'),'Select/pan arrow input moves the rendered map canvas');
  assert.equal((await readMap(manager)).draft.fogStrokes.length,strokesBeforePan,'Select/pan arrow input never commits a fog stroke');
  log('KEYBOARD Select/pan ArrowRight moved the rendered map without committing a stroke.');
  await manager.locator('.fog-controls').getByRole('button',{name:'Reveal'}).click();
  await mapCanvas.focus();
  const strokesBeforeEnter=(await readMap(manager)).draft.fogStrokes.length;
  mutationLogIndex=getLogLines().length;
  await manager.keyboard.press('Enter');
  const enterState=await waitForMap(manager,state=>state.draft.fogStrokes.length>strokesBeforeEnter,'keyboard Enter brush dab');
  assert.equal(enterState.draft.fogStrokes.length,strokesBeforeEnter+1,'one Enter activation commits exactly one map-space dab');
  completionLogIndex=getLogLines().length;
  await assertPostCommitRasterPush(player,mutationLogIndex,completionLogIndex,enterState.draft.imageData,'keyboard Enter fog stroke','POST /api/map/fog/strokes');
  log('KEYBOARD Enter committed exactly one reveal dab through the same stroke route.');
  const filtered=await manager.evaluate(()=>window.dungeonDeputy.command('/api/presentation'));
  assert.equal(filtered.tokens.some(token=>token.id===hero.id),false);
  assert.equal(JSON.stringify(filtered).includes('currentHp'),false);
  await manager.evaluate(id=>window.dungeonDeputy.command(`/api/encounter/actors/${id}/hp`,'PUT',{current:7,maximum:19}),hero.id);
  await manager.evaluate(id=>window.dungeonDeputy.command(`/api/encounter/actors/${id}/conditions`,'PUT',{conditionIds:['poisoned']}),hero.id);
  await manager.evaluate(id=>window.dungeonDeputy.command(`/api/encounter/actors/${id}/initiative`,'PUT',{value:18}),hero.id);
  await manager.evaluate(()=>window.dungeonDeputy.command('/api/encounter/dice','POST',{sides:20,modifier:2}));
  await manager.getByRole('button',{name:/Mira E2E/}).first().click();
  await manager.getByLabel('Encounter — DM only').waitFor();
  await manager.getByLabel('Current HP').fill('7');
  await manager.getByLabel('Maximum HP').fill('19');
  await manager.getByRole('button',{name:'Save HP values'}).click();
  await assertWindowsStable();
  assert.doesNotMatch(await player.locator('.public-stage').innerText(),/poisoned|Initiative|Current HP|Result:|Mira E2E/);
  await screenshot('06b-fog-encounter-published',true);
  await manager.locator('.map-toast').waitFor({ state: 'detached', timeout: 5000 });
  await assertWindowsStable();
  const approvedPublicMarkup = await player.locator('.public-map').evaluate(element => element.outerHTML);
  await manager.getByLabel('Grid scale').fill('72');
  await manager.getByRole('button', { name: 'Save changes' }).click();
  await waitForMap(manager, state => state.draft.scale === 72, 'save newer private draft');
  await player.waitForTimeout(1200);
  assert.equal(await player.locator('.public-map').evaluate(element => element.outerHTML), approvedPublicMarkup, 'saved draft edits must not leak before Show');
  await screenshot('07-newer-draft-still-private');
  await manager.getByRole('button', { name: 'Black out' }).click();
  await player.waitForFunction(() => !document.querySelector('.public-stage .public-art, .public-stage .public-map'));
  await screenshot('08-map-blackout');
  await assertWindowsStable();

  const audioDir=join(evidence,'data','audio');
  await writeFile(join(audioDir,`a_${'f'.repeat(32)}.ogg`),'orphan');
  await writeFile(join(audioDir,`a_${'e'.repeat(32)}.pending`),'pending');
  await writeFile(join(audioDir,'user-notes.wav'),'preserve');
  await app.close();
  ({ manager, player } = await launchPair(join(evidence, 'data')));
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  await manager.getByText('e2e-audio-fixture', { exact: true }).waitFor();
  const recoveredFiles=await readdir(audioDir);
  assert.equal(recoveredFiles.includes(`a_${'f'.repeat(32)}.ogg`),false,'startup removes generated unreferenced audio');
  assert.equal(recoveredFiles.includes(`a_${'e'.repeat(32)}.pending`),false,'startup removes stale pending audio');
  assert.equal(recoveredFiles.includes('user-notes.wav'),true,'startup preserves unknown audio-directory entries');
  await manager.getByRole('button', { name: 'Battle map' }).click();
  const restored = await waitForMap(manager, state => state.draft?.tokens?.some(token => token.name === 'E2E ranger'), 'draft restore after app restart');
  assert.equal(restored.draft.scale, 72);
  assert.equal(restored.draft.fogEnabled,true,'fog state persists across restart');
  assert.equal(restored.draft.tokens.find(token=>token.id===hero.id).visible,false,'token visibility persists across restart');
  const privateEncounter=await manager.evaluate(()=>window.dungeonDeputy.command('/api/encounter'));
  assert.equal(privateEncounter.actors.find(actor=>actor.tokenId===hero.id).currentHp,7);
  assert.equal(privateEncounter.actors.find(actor=>actor.tokenId===hero.id).conditionIds.includes('poisoned'),true);
  assert.equal(restored.approved.scale, 64, 'approved public snapshot must restore independently from newer draft');
  await assertBlack();
  await manager.getByRole('button', { name: 'Show encounter' }).click();
  await player.locator('.public-map-art').waitFor();
  const restoredDto=await manager.evaluate(()=>window.dungeonDeputy.command('/api/presentation'));
  assert.match(restoredDto.imageData,/^data:image\/png;base64,/);
  await screenshot('09-restored-map', true);
  await manager.getByRole('button',{name:/E2E ranger/}).first().click();
  await manager.getByLabel('Current HP').waitFor();
  await captureResponsiveLayouts();

  await manager.getByRole('button', { name: /Blank map/ }).click();
  const blank = await waitForMap(manager, state => state.draft?.image === '' && state.draft?.tokens?.length === 0, 'create blank map');
  assert.equal(blank.draft.name, 'Untitled map');
  assert.ok(blank.approved, 'creating a blank draft must not clear the approved public map');
  assert.equal(await player.locator('.public-map').count(),1,'creating a blank draft must not replace the public snapshot');
  await screenshot('10-blank-map-draft');
  await assertWindowsStable();

  await manager.getByRole('button', { name: 'Compendium · DM only' }).click();
  await manager.getByRole('heading', { name: 'SRD field reference' }).waitFor();
  await manager.getByRole('button', { name: /Monsters/ }).click();
  await manager.getByRole('button', { name: 'Open Bandit, monster' }).click();
  await manager.getByRole('heading', { name: 'Bandit' }).waitFor();
  await manager.getByText('PDF page 261', { exact: false }).waitFor();
  await manager.locator('.compendium-detail').scrollIntoViewIfNeeded();
  await screenshot('11-offline-srd-compendium');
  const beforeSrdAdd=await manager.evaluate(async()=>({map:await window.dungeonDeputy.command('/api/map'),presentation:await window.dungeonDeputy.command('/api/presentation')}));
  manager.once('dialog', dialog=>void dialog.accept());
  await manager.getByRole('button', { name: 'Add to private encounter' }).click();
  await manager.waitForFunction(async()=>{
    try { const state=await window.dungeonDeputy.command('/api/encounter'); return state.actors.some(actor=>actor.sourceMonsterId==='srd521:monster:bandit'); }
    catch { return false; }
  });
  const afterSrdAdd=await manager.evaluate(async()=>({map:await window.dungeonDeputy.command('/api/map'),presentation:await window.dungeonDeputy.command('/api/presentation'),encounter:await window.dungeonDeputy.command('/api/encounter')}));
  assert.equal(afterSrdAdd.encounter.actors.some(actor=>actor.sourceMonsterId==='srd521:monster:bandit'&&actor.maximumHp===11),true,'Compendium Add creates a stat-linked private encounter actor');
  assert.deepEqual(afterSrdAdd.map,beforeSrdAdd.map,'Compendium Add must not create or alter map tokens');
  assert.deepEqual(afterSrdAdd.presentation,beforeSrdAdd.presentation,'Compendium Add must not alter public presentation');
  assert.equal(await player.locator('.public-map').count(),1,'Compendium Add leaves the public display unchanged');

  // Run the AI acceptance tracer in a separate fresh database. Its provider is an isolated
  // deterministic fake selected only by the E2E launch environment; external requests stay blocked.
  await app.close();
  ({ manager, player } = await launchPair(join(evidence, 'ai-data'), false));
  await verifyTavernAmbushAcceptance(manager, player);
  await assertWindowsStable();
  log('AI ACCEPTANCE: deterministic tavern ambush preview, invalid-reject, private accept/edit/local-turn and separate Show verified.');

  const rendererErrors = getRendererErrors().filter(error=>!error.includes('/maps/tavern.svg')&&!error.includes('Presentation service returned 400.'));
  assert.deepEqual(rendererErrors, [], `unexpected Electron renderer errors: ${rendererErrors.join('\n')}`);
  assert.deepEqual(getExternalRequests(), [], `offline E2E attempted external network access: ${getExternalRequests().join(', ')}`);
  const diagnosticText = getLogLines().join('\n');
  assert.equal(diagnosticText.includes(PRIVATE_PROMPT_SENTINEL), false, 'private proposal prompts must not enter E2E logs/artifacts');
  assert.equal(diagnosticText.includes('P7_TEST_KEY_SENTINEL'), false, 'credential sentinels must not enter E2E logs/artifacts');
  for (const secret of observedCapabilities)
    assert.equal(diagnosticText.includes(secret), false, 'invite, player, and display capabilities never appear in E2E diagnostics');
  success = true;
  log('PASS: desktop plus two independent player browser contexts verified pairing/replay, assigned-only state/actions, public scene/blackout, reconnect, revoke/session end, offline catalog, and no external renderer requests; physical phones, Wi-Fi/firewall behavior, operator HTTP risk review, OS-wide outbound blocking, and macOS remain unverified.');
  await app.close();
} catch (error) {
  log(`FAIL ${error?.stack ?? error}`);
  if (captureFailure) await captureFailure('failure').catch(captureError => log(`Failure screenshot capture also failed: ${captureError}`));
  console.error(error);
  process.exitCode = 1;
} finally {
  await rm(join(process.cwd(), 'artifacts', 'e2e-audio-fixture.wav'), { force: true });
  await rm(join(process.cwd(), 'artifacts', 'e2e-audio-invalid.wav'), { force: true });
  await cleanup({ success });
  console.log(`${success ? 'PASS' : 'FAIL'} E2E evidence: ${evidence}`);
}
