import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setup, launch, cleanup, evidence, log, getRendererErrors, getLogLines } from './e2e/fixtures.mjs';
import { createHash } from 'node:crypto';

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
async function assertPostCommitRasterPoll(page, startIndex, completionIndex, persistedImageData, label, mutationPath) {
  const expected = createHash('sha256').update(persistedImageData).digest('hex');
  assert.ok(getLogLines().slice(startIndex, completionIndex).some(line => line.includes(`${mutationPath} 200`)), `${label}: successful UI mutation request was not captured`);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const hashes = getLogLines().slice(completionIndex).map(line => line.match(/\[E2E API\] GET \/api\/presentation 200 imageDataSha256=([a-f0-9]{64})/)?.[1]).filter(Boolean);
    if (hashes.length) {
      await page.waitForFunction(value => document.querySelector('.public-map-art')?.getAttribute('src') === value, persistedImageData, { timeout: 5000 });
      assert.ok(hashes.every(hash => hash === expected), `${label}: a public poll after mutation completion exposed a stale raster`);
      assert.equal(await page.locator('.public-map-art').getAttribute('src'), persistedImageData, `${label}: latest player raster differs from persisted map imageData`);
      return;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`${label}: no post-commit public presentation poll was observed`);
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
  await mkdir(join(process.cwd(), 'artifacts'), { recursive: true }); await writeFile(audioFixture, wav);
  process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE = audioFixture;
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
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  await manager.getByRole('button', { name: 'Import sound' }).first().click();
  await manager.getByText('e2e-audio-fixture', { exact: true }).waitFor();
  await manager.getByRole('button', { name: 'Battle map' }).click();
  await manager.getByRole('button', { name: 'Play', exact: true }).click();
  assert.equal(await player.evaluate(() => 'audioImport' in window.dungeonDeputy || 'audioConfig' in window.dungeonDeputy), false, 'public preload must not expose soundboard APIs');

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
  await assertPostCommitRasterPoll(player, mutationLogIndex, completionLogIndex, mutationState.draft.imageData, 'fog enable', 'POST /api/map/fog/enable');
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
  await assertPostCommitRasterPoll(player, mutationLogIndex, completionLogIndex, mutationState.draft.imageData, 'token visibility', 'PATCH /api/map/token/hero-1/visibility');
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
  await assertPostCommitRasterPoll(player, mutationLogIndex, completionLogIndex, revealedState.draft.imageData, 'keyboard fog stroke', 'POST /api/map/fog/strokes');
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
  await assertPostCommitRasterPoll(player,mutationLogIndex,completionLogIndex,enterState.draft.imageData,'keyboard Enter fog stroke','POST /api/map/fog/strokes');
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

  await app.close();
  ({ manager, player } = await launchPair(join(evidence, 'data')));
  await manager.getByRole('button', { name: 'Audio · DM only' }).click();
  await manager.getByText('e2e-audio-fixture', { exact: true }).waitFor();
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

  const rendererErrors = getRendererErrors().filter(error=>!error.includes('/maps/tavern.svg'));
  assert.deepEqual(rendererErrors, [], `unexpected Electron renderer errors: ${rendererErrors.join('\n')}`);
  success = true;
  log('PASS: Stage1 scene/display and Stage2 map/token persistence remain intact; Phase3 fog masks, authenticated encounter actions, restart blackout, explicit Show, polling, public privacy, and same-window E2E passed; paired screenshots/logs retained; physical hardware remains unverified.');
  await app.close();
} catch (error) {
  log(`FAIL ${error?.stack ?? error}`);
  if (captureFailure) await captureFailure('failure').catch(captureError => log(`Failure screenshot capture also failed: ${captureError}`));
  console.error(error);
  process.exitCode = 1;
} finally {
  await rm(join(process.cwd(), 'artifacts', 'e2e-audio-fixture.wav'), { force: true });
  await cleanup({ success });
  console.log(`${success ? 'PASS' : 'FAIL'} E2E evidence: ${evidence}`);
}
