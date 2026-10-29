import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setup, launch, cleanup, evidence, log, getRendererErrors } from './e2e/fixtures.mjs';

let success = false;
let app;
let pages = [];
let captureFailure;
let windowBaseline;

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
async function trackWindows() {
  const initialPages=[...pages];
  const mainFrameNavigations=new Map(initialPages.map(page=>[page,0]));
  for(const page of initialPages) page.on('framenavigated',frame=>{if(frame===page.mainFrame())mainFrameNavigations.set(page,mainFrameNavigations.get(page)+1);});
  const fullscreen=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(win=>win.isFullScreen()));
  windowBaseline={pages:initialPages,urls:initialPages.map(page=>page.url()),mainFrameNavigations,fullscreen};
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
  await setup();
  await mkdir(join(evidence, 'screenshots'), { recursive: true });

  const launchPair = async (dataPath) => {
    const result = await launch(dataPath);
    app = result.app;
    pages = result.pages;
    await trackWindows();
    const manager = pages.find(page => new URL(page.url()).pathname.endsWith('/index.html'));
    const player = pages.find(page => new URL(page.url()).pathname.endsWith('/public.html'));
    if (!manager || !player) throw new Error(`Expected manager and public page, got ${pages.map(page => page.url()).join(', ')}`);
    return { manager, player };
  };

  let { manager, player } = await launchPair(join(evidence, 'data'));

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
  assert.match(await player.locator('.public-stage .public-art').getAttribute('src'), /moonlit-fen\.svg/);
  await screenshot('02-scene-shown', true);
  await assertWindowsStable();
  await manager.getByRole('button', { name: 'Old Bridge' }).click();
  assert.match(await player.locator('.public-stage .public-art').getAttribute('src'), /moonlit-fen\.svg/, 'selecting a new scene must not implicitly publish it');
  await manager.getByRole('button', { name: 'Show scene on table' }).click();
  await player.waitForFunction(() => document.querySelector('.public-stage .public-art')?.getAttribute('src')?.includes('old-bridge.svg'));
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
  assert.equal(publicDto.image,'tavern.svg');
  assert.equal(publicDto.tokens.length,8);
  assert.equal(publicDto.campaignId,undefined,'public DTO must not expose campaign/session metadata');
  assert.doesNotMatch(await player.locator('.public-stage').innerText(),/Mira E2E|E2E ranger/);
  await screenshot('06-tavern-published', true);
  // Phase 3: turn the live map into an encounter, then prove only committed filtered visuals poll.
  manager.on('dialog', dialog => { log(`DIALOG ${dialog.message()}`); void dialog.accept(); });
  await manager.getByRole('button', { name: 'Enable fog' }).click();
  await waitForMap(manager, state => state.draft.fogEnabled, 'fog enable');
  const hero = (await readMap(manager)).draft.tokens.find(token => token.name === 'Mira E2E');
  await manager.getByRole('button',{name:/Mira E2E/}).first().click();
  await manager.getByRole('button',{name:'Hide token'}).click();
  await waitForMap(manager,state=>state.draft.tokens.find(token=>token.id===hero.id)?.visible===false,'hide token');
  const fogStamps=[{x:320,y:280,radius:115}];
  await manager.evaluate(stamps => window.dungeonDeputy.command('/api/map/fog/strokes','POST',{mode:'reveal',stamps}),fogStamps);
  await player.waitForFunction(() => document.querySelector('.public-map-fog-mask'), {timeout:5000});
  await player.waitForFunction(() => document.querySelectorAll('.public-map-token').length===7,{timeout:5000});
  const maskPixels=await player.locator('.public-map-fog-mask').evaluate(canvas=>{const c=canvas.getContext('2d');return {hidden:[...c.getImageData(100,100,1,1).data],revealed:[...c.getImageData(320,280,1,1).data]};});
  assert.deepEqual(maskPixels.hidden,[8,10,9,255],'unrevealed source terrain remains fully opaque black');
  assert.equal(maskPixels.revealed[3],0,'revealed source terrain is exposed through transparent mask only');
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
  await manager.getByRole('button',{name:'Save HP'}).click();
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

  await app.close();
  ({ manager, player } = await launchPair(join(evidence, 'data')));
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
  await player.waitForFunction(() => document.querySelector('.public-map')?.getAttribute('style')?.includes('72px'));
  await screenshot('09-restored-map', true);

  await manager.getByRole('button', { name: /Blank map/ }).click();
  const blank = await waitForMap(manager, state => state.draft?.image === '' && state.draft?.tokens?.length === 0, 'create blank map');
  assert.equal(blank.draft.name, 'Untitled map');
  assert.ok(blank.approved, 'creating a blank draft must not clear the approved public map');
  assert.equal(await player.locator('.public-map').count(),1,'creating a blank draft must not replace the public snapshot');
  await screenshot('10-blank-map-draft');
  await assertWindowsStable();

  const rendererErrors = getRendererErrors();
  assert.deepEqual(rendererErrors, [], `unexpected Electron renderer errors: ${rendererErrors.join('\n')}`);
  success = true;
  log('PASS: Stage1 scenes/display UI and Stage2 tavern/map/token/SQLite E2E; two hidden Electron windows, screenshot bundles, no renderer errors; physical hardware remains unverified.');
  await app.close();
} catch (error) {
  log(`FAIL ${error?.stack ?? error}`);
  if (captureFailure) await captureFailure('failure').catch(captureError => log(`Failure screenshot capture also failed: ${captureError}`));
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup({ success });
  console.log(`${success ? 'PASS' : 'FAIL'} E2E evidence: ${evidence}`);
}
