import { app, BrowserWindow, ipcMain, screen, dialog, type Display } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, stat, rename, rm, readdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chooseExternalDisplay } from './display-policy.mjs';
// @ts-ignore JS policy is exercised by Node TAP tests.
import { saveTestPolicy, createFailOnce } from './renderer/src/audio/saveTestPolicy.mjs';
// @ts-ignore Shared JS policy is covered by Node TAP tests.
import { copyBounded, createSerialLock, reconcileManagedFiles, stageWithinAudioQuota, commitStagedAudioConfig, AUDIO_ID_PATTERN } from './renderer/src/audio/importPolicy.mjs';
// @ts-ignore JS model is exercised by Node TAP tests.
import { defaultAudioConfig, validateAudioConfig, MAX_FILE_BYTES, MAX_TOTAL_BYTES, DEFAULT_AUDIO_SAMPLES, isPristineAudioConfig, seedDefaultAudioConfig } from './renderer/src/audio/model.mjs';

type Role = 'dm' | 'public';
type Preferences = { sceneId: string; displayId: number | null };
const sceneIds = new Set(['ashen-road', 'moonlit-fen', 'old-bridge']);
const fallback: Preferences = { sceneId: 'ashen-road', displayId: null };
const windows = new Map<Role, BrowserWindow>();
let backend: ChildProcess | undefined;
let backendUrl = '';
let backendToken = '';
let prefs: Preferences = fallback;
let quitting = false;
let activeDisplayId: number | null = null;
let displayStateInitialized = false;
let audioConfig: any = defaultAudioConfig();
const pendingAudioIds = new Map<string, {format: string; size: number}>();
const withAudioLock = createSerialLock();
let invalidFixtureConsumed = false;
let e2eAudioFixtureIndex = 0;
const e2e = process.env.DUNGEON_DEPUTY_E2E === '1';
const e2eAudioFixtures: string[] = (() => {
  if (!e2e || app.isPackaged || !process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES) return [];
  try {
    const value = JSON.parse(process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES);
    return Array.isArray(value) && value.length <= 8 && value.every((item: unknown) => typeof item === 'string' && item.length <= 2048)
      ? value.map((item: string) => resolve(item))
      : [];
  } catch { return []; }
})();
const { DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS: _audioDelaySetting, DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST: _audioFailSetting, DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE: _audioFixture, DUNGEON_DEPUTY_E2E_AUDIO_FIXTURES: _audioFixtures, DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE: _invalidAudioFixture, DUNGEON_DEPUTY_E2E_AUDIO_FAIL_IMPORT_FIRST: _failAudioImport, ...backendEnvironment } = process.env;
const audioSaveTestPolicy = saveTestPolicy({
  e2e,
  isPackaged: app.isPackaged,
  delayMs: process.env.DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS === undefined ? undefined : Number(process.env.DUNGEON_DEPUTY_E2E_AUDIO_SAVE_DELAY_MS),
  failFirst: process.env.DUNGEON_DEPUTY_E2E_AUDIO_SAVE_FAIL_FIRST === '1',
});
const failFirstAudioSave = createFailOnce(audioSaveTestPolicy.failFirst);
const e2eDataRoot = process.env.DUNGEON_DEPUTY_DATA_DIR;
const e2eBackendRoot = process.env.DUNGEON_DEPUTY_BACKEND_ROOT;
const e2eDevUrl = process.env.DUNGEON_DEPUTY_DEV_URL;
const devServerUrl = e2e ? e2eDevUrl : 'http://127.0.0.1:5173';
if (e2e) {
  if (!e2eDataRoot || !e2eBackendRoot || !e2eDevUrl || new URL(e2eDevUrl).hostname !== '127.0.0.1') throw new Error('E2E mode requires isolated data/backend roots and a loopback renderer URL.');
  app.setPath('userData', resolve(e2eDataRoot));
}

export function validPreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return fallback;
  const p = value as Partial<Preferences>;
  return { sceneId: typeof p.sceneId === 'string' && sceneIds.has(p.sceneId) ? p.sceneId : fallback.sceneId,
    displayId: Number.isSafeInteger(p.displayId) && Number(p.displayId) >= 0 ? Number(p.displayId) : null };
}
async function loadPreferences() {
  try { prefs = validPreferences(JSON.parse(await readFile(join(app.getPath('userData'), 'preferences.json'), 'utf8'))); }
  catch { prefs = fallback; }
}
async function savePreferences() {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(join(app.getPath('userData'), 'preferences.json'), JSON.stringify(prefs), { mode: 0o600 });
}
const audioRoot = () => join(app.getPath('userData'), 'audio');
const audioConfigPath = () => join(app.getPath('userData'), 'audio-config.json');
const audioSeedMarkerPath = () => join(app.getPath('userData'), 'audio-defaults-seeded.json');
const defaultAudioSource = (filename: string) => app.isPackaged
  ? join(process.resourcesPath, 'audio-defaults', filename)
  : join(app.getAppPath(), 'assets/audio-defaults', filename);
function pcmWavDuration(bytes: Buffer) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return null;
  let format: Buffer | undefined;
  let dataLength = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) return null;
    const id = bytes.toString('ascii', offset, offset + 4);
    if (id === 'fmt ') format = bytes.subarray(start, start + size);
    if (id === 'data') dataLength += size;
    offset = start + size + (size & 1);
  }
  if (!format || format.length < 16 || format.readUInt16LE(0) !== 1 || format.readUInt16LE(14) !== 16 || dataLength < 1) return null;
  const byteRate = format.readUInt32LE(8);
  const duration = byteRate ? dataLength / byteRate : 0;
  return Number.isFinite(duration) && duration > 0 && duration <= 600 ? duration : null;
}
async function loadAudioConfig() {
  let configExists = true;
  let legacyPristine = false;
  try {
    const stored = JSON.parse(await readFile(audioConfigPath(), 'utf8'));
    audioConfig = validateAudioConfig(stored);
    legacyPristine = isPristineAudioConfig(stored);
  }
  catch (error: any) { if (error?.code !== 'ENOENT') configExists = true; else configExists = false; audioConfig = defaultAudioConfig(); }
  await mkdir(audioRoot(), { recursive: true });
  let seedMarked = true;
  try { await access(audioSeedMarkerPath()); } catch { seedMarked = false; }
  if (!seedMarked && (!configExists || legacyPristine)) {
    try { await seedBundledAudioDefaults(); }
    catch (error) { console.error('Bundled audio defaults could not be installed; startup will continue without them.', error); }
  }
  await reconcileManagedFiles(audioRoot(), audioConfig.assets.map((a: {id:string}) => a.id), {
    readdir: async (directory: string) => readdir(directory),
    remove: async (name: string) => rm(join(audioRoot(), name), { force: true }),
  });
}
async function seedBundledAudioDefaults() {
  const candidate = audioConfig;
  const copied: string[] = [];
  const staged: string[] = [];
  const temporaryConfig = `${audioConfigPath()}.${randomBytes(8).toString('hex')}.tmp`;
  const temporaryMarker = `${audioSeedMarkerPath()}.${randomBytes(8).toString('hex')}.tmp`;
  let configCommitted = false;
  try {
    const metadata: any[] = [];
    for (const sample of DEFAULT_AUDIO_SAMPLES) {
      const source = defaultAudioSource(sample.filename);
      const sourceInfo = await stat(source);
      if (!sourceInfo.isFile() || sourceInfo.size <= 44 || sourceInfo.size > MAX_FILE_BYTES) throw new Error('Bundled audio sample is missing or outside the audio size limit.');
      const bytes = await readFile(source);
      const duration = pcmWavDuration(bytes);
      if (duration === null) throw new Error('Bundled audio sample is not valid bounded PCM WAV.');
      const temp = join(audioRoot(), `${sample.id}.${sample.format}.${randomBytes(8).toString('hex')}.tmp`);
      staged.push(temp);
      const size = await copyBounded(source, temp, MAX_FILE_BYTES);
      if (size !== sourceInfo.size) throw new Error('Bundled audio sample changed during copy.');
      const finalPath = join(audioRoot(), `${sample.id}.${sample.format}`);
      await rename(temp, finalPath);
      staged.splice(staged.indexOf(temp), 1);
      copied.push(finalPath);
      metadata.push({ ...sample, size, duration });
    }
    const seeded = seedDefaultAudioConfig(candidate, metadata);
    await writeFile(temporaryConfig, JSON.stringify(seeded), { mode: 0o600, flag: 'wx' });
    await writeFile(temporaryMarker, JSON.stringify({ version: 1, seeded: true }), { mode: 0o600, flag: 'wx' });
    await rename(temporaryConfig, audioConfigPath());
    configCommitted = true;
    audioConfig = seeded;
    await rename(temporaryMarker, audioSeedMarkerPath());
  } catch (error) {
    if (configCommitted) {
      await writeFile(temporaryConfig, JSON.stringify(candidate), { mode: 0o600, flag: 'wx' }).then(() => rename(temporaryConfig, audioConfigPath())).catch(() => {});
      audioConfig = candidate;
    }
    await Promise.all([...staged, temporaryConfig, temporaryMarker, ...copied].map(path => rm(path, { force: true }).catch(() => {})));
    throw error;
  }
}
async function saveAudioConfig(value: unknown) {
  if (audioSaveTestPolicy.delayMs > 0) await new Promise(resolve => setTimeout(resolve, audioSaveTestPolicy.delayMs));
  if (failFirstAudioSave()) throw new Error('Soundboard save failed. Your previous settings were restored; try again.');
  await withAudioLock(async () => {
    const previousConfig = audioConfig;
    const validated = validateAudioConfig(value);
    if (JSON.stringify(validated) !== JSON.stringify(value)) throw new Error('Invalid soundboard configuration.');
    const references = new Set(validated.banks.flatMap((b: any) => b.slots.map((s: any) => s.asset).filter(Boolean)));
    const next = { ...validated, assets: validated.assets.filter((a: {id:string}) => references.has(a.id)) };
    const previousIds = new Set(audioConfig.assets.map((a: {id:string}) => a.id));
    const additions = next.assets.filter((a: {id:string}) => !previousIds.has(a.id));
    for (const asset of additions) {
      const pending = pendingAudioIds.get(asset.id);
      if (!pending || pending.size !== asset.size || pending.format !== asset.format) throw new Error('Audio import metadata does not match the staged file.');
    }
    const temp = `${audioConfigPath()}.${randomBytes(8).toString('hex')}.tmp`;
    const promoted: string[] = [];
    await mkdir(app.getPath('userData'), { recursive: true });
    await commitStagedAudioConfig({
      config: next,
      tempPath: temp,
      writePrepared: (path: string, value: unknown) => writeFile(path, JSON.stringify(value), { mode: 0o600, flag: 'wx' }),
      promote: async () => {
        for (const asset of additions) {
          await rename(join(audioRoot(), `${asset.id}.pending`), join(audioRoot(), `${asset.id}.${asset.format}`));
          promoted.push(asset.id);
        }
      },
      replace: (path: string) => rename(path, audioConfigPath()),
      rollbackPromotion: async () => {
        for (const asset of additions) if (promoted.includes(asset.id)) await rename(join(audioRoot(), `${asset.id}.${asset.format}`), join(audioRoot(), `${asset.id}.pending`));
      },
      remove: (path: string) => rm(path, { force: true }),
      releaseReservation: () => { for (const asset of additions) pendingAudioIds.delete(asset.id); },
      setConfig: (value: unknown) => { audioConfig = value; },
    });
    for (const asset of previousConfig.assets) if (!next.assets.some((a: {id:string}) => a.id === asset.id)) await rm(join(audioRoot(), `${asset.id}.${asset.format}`), { force: true }).catch(() => {});
  });
}
function api(path: string, method = 'GET', body?: unknown) {
  return fetch(`${backendUrl}${path}`, { method, headers: { 'X-Dungeon-Token': backendToken, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function waitForBackend(child: ChildProcess) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error('Presentation backend exited before becoming ready.');
    try { if ((await api('/health')).ok) return; } catch { /* startup race */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  child.kill();
  throw new Error('Presentation backend did not become ready in time.');
}
async function startBackend() {
  const port = 18000 + Math.floor(Math.random() * 40000);
  backendUrl = `http://127.0.0.1:${port}`;
  backendToken = randomBytes(32).toString('hex');
  const executable = process.platform === 'win32' ? 'DungeonDeputy.Api.exe' : 'DungeonDeputy.Api';
  const backendRid = process.platform === 'win32' ? 'win-x64' : process.platform === 'darwin' ? `osx-${process.arch}` : 'linux-x64';
  const path = e2e ? join(resolve(e2eBackendRoot!), executable) : app.isPackaged ? join(process.resourcesPath, `backend-${backendRid}`, executable) : join(app.getAppPath(), 'artifacts', `backend-${backendRid}`, executable);
  const dataDirectory = e2e ? resolve(e2eDataRoot!, 'backend-data') : resolve(app.getPath('userData'), 'data');
  await mkdir(dataDirectory, { recursive: true });
  backend = spawn(path, [], { env: { ...backendEnvironment, DUNGEON_DEPUTY_PORT: String(port), DUNGEON_DEPUTY_TOKEN: backendToken, DUNGEON_DEPUTY_DATA_DIR: dataDirectory }, stdio: 'ignore', windowsHide: true });
  backend.once('exit', () => { if (!quitting) { for (const win of windows.values()) if (!win.isDestroyed()) void win.webContents.executeJavaScript("document.body.style.background='black'"); app.quit(); } });
  await waitForBackend(backend);
}
function allowedSender(role: Role, event: Electron.IpcMainInvokeEvent) {
  const win = windows.get(role);
  return !!win && event.sender === win.webContents && event.senderFrame?.url === win.webContents.getURL();
}
function installIpc() {
  for (const channel of ['dm:command', 'dm:preferences', 'display:list', 'public:presentation', 'audio:config', 'audio:import', 'audio:bytes', 'audio:discard']) {
    ipcMain.removeHandler(channel);
  }
  ipcMain.handle('audio:config', async (event, value?: unknown) => {
    if (!allowedSender('dm', event)) throw new Error('Denied');
    if (value !== undefined) await saveAudioConfig(value);
    return audioConfig;
  });
  ipcMain.handle('audio:import', async event => {
    if (!allowedSender('dm', event)) throw new Error('Denied');
    const failInvalid = e2e && !app.isPackaged && process.env.DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE && process.env.DUNGEON_DEPUTY_E2E_AUDIO_FAIL_IMPORT_FIRST === '1' && !invalidFixtureConsumed;
    const fixturePath = failInvalid
      ? process.env.DUNGEON_DEPUTY_E2E_AUDIO_INVALID_FIXTURE
      : e2eAudioFixtures.length
        ? e2eAudioFixtures[e2eAudioFixtureIndex++ % e2eAudioFixtures.length]
        : process.env.DUNGEON_DEPUTY_E2E_AUDIO_FIXTURE;
    const selected = e2e && !app.isPackaged && fixturePath
      ? { canceled: false, filePaths: [resolve(fixturePath)] }
      : await dialog.showOpenDialog(windows.get('dm')!, { properties: ['openFile'], filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'oga', 'opus'] }] });
    if (selected.canceled || selected.filePaths.length !== 1) return null;
    const source = selected.filePaths[0];
    const ext = source.split('.').pop()?.toLowerCase();
    if (!['wav', 'mp3', 'ogg', 'oga', 'opus'].includes(ext ?? '')) throw new Error('Unsupported audio file type.');
    const format = ['oga', 'opus'].includes(ext!) ? 'ogg' : ext!;
    const id = `a_${randomBytes(16).toString('hex')}`;
    const pendingPath = join(audioRoot(), `${id}.pending`);
    const size = await stageWithinAudioQuota({
      lock: withAudioLock,
      committedBytes: async () => {
        const info = await stat(source);
        if (!info.isFile() || info.size <= 0) throw new Error('Choose a non-empty audio file.');
        return audioConfig.assets.reduce((n: number, a: {size: number}) => n + a.size, 0);
      },
      reservedBytes: () => [...pendingAudioIds.values()].reduce((n, pending) => n + pending.size, 0),
      maxFileBytes: MAX_FILE_BYTES,
      maxTotalBytes: MAX_TOTAL_BYTES,
      tempPath: pendingPath,
      copy: async (budget: number) => {
        await mkdir(audioRoot(), { recursive: true });
        const copied = await copyBounded(source, pendingPath, budget);
        if (copied > MAX_FILE_BYTES) throw new Error('Audio file must be 25 MiB or smaller.');
        return copied;
      },
      reserve: (copied: number) => pendingAudioIds.set(id, { format, size: copied }),
      remove: (path: string) => rm(path, { force: true }),
    });
    const result = { id, name: source.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, '').slice(0, 80), format, size, duration: 0 };
    if (failInvalid) invalidFixtureConsumed = true;
    return result;
  });
  ipcMain.handle('audio:bytes', async (event, id: unknown) => {
    if (!allowedSender('dm', event) || typeof id !== 'string' || !/^a_[a-f0-9]{32}$/.test(id)) throw new Error('Denied');
    return withAudioLock(async () => {
      const asset = audioConfig.assets.find((a: {id: string; format: string; size: number}) => a.id === id);
      const pending = pendingAudioIds.get(id);
      if (!asset && !pending) throw new Error('Unknown audio asset.');
      const bytes = await readFile(join(audioRoot(), `${id}.${asset?.format ?? 'pending'}`)).catch(() => { throw new Error('Audio file is missing.'); });
      const expected = asset?.size ?? pending!.size;
      if (bytes.length !== expected || bytes.length > MAX_FILE_BYTES) throw new Error('Audio file failed size validation.');
      return Uint8Array.from(bytes);
    });
  });
  ipcMain.handle('audio:discard', async (event, id: unknown) => {
    if (!allowedSender('dm', event) || typeof id !== 'string' || !AUDIO_ID_PATTERN.test(id)) throw new Error('Denied');
    return withAudioLock(async () => {
      const pending = pendingAudioIds.get(id);
      if (!pending) return false;
      await rm(join(audioRoot(), `${id}.pending`), { force: true });
      await rm(join(audioRoot(), `${id}.${pending.format}`), { force: true });
      pendingAudioIds.delete(id);
      return true;
    });
  });
  ipcMain.handle('dm:command', async (event, path: unknown, method: unknown, body?: unknown) => {
    if (!allowedSender('dm', event) || typeof path !== 'string' || !/^\/api\/(scenes|presentation|selection\/[a-z-]+|show\/[a-z-]+|blackout|map|map\/draft|map\/blank|map\/show|map\/show-encounter|map\/fog\/(?:enable|strokes)|map\/token(?:\/[a-zA-Z0-9-]+(?:\/(?:visibility|hp|conditions|initiative(?:\/roll)?|tie-break))?)?|encounter(?:\/actors\/[a-zA-Z0-9-]+\/(?:hp|conditions|initiative(?:\/roll)?|tie-break)|\/turn\/end|\/dice)?)\/?(?:\?.*)?$/.test(path) || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method))) throw new Error('Denied');
    const response = await api(path, String(method), body);
    if (e2e) console.info(`[E2E API] ${String(method)} ${path} ${response.status}`);
    if (!response.ok) throw new Error(`Presentation service returned ${response.status}.`);
    return response.status === 204 ? null : response.json();
  });
  ipcMain.handle('dm:preferences', async (event, value?: unknown) => {
    if (!allowedSender('dm', event)) throw new Error('Denied');
    if (value !== undefined) {
      const previousDisplayId = prefs.displayId;
      prefs = validPreferences(value);
      await savePreferences();
      if (prefs.displayId !== previousDisplayId) safeTopology();
    }
    return prefs;
  });
  ipcMain.handle('display:list', (event) => {
    if (!allowedSender('dm', event)) throw new Error('Denied');
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().filter(d => d.id !== primaryId).map(d => ({ id: d.id, label: `Display ${d.id}`, bounds: d.bounds }));
  });
  ipcMain.handle('public:presentation', async event => {
    if (!allowedSender('public', event)) throw new Error('Denied');
    const response = await api('/api/presentation');
    if (!response.ok) throw new Error('Presentation unavailable.');
    const presentation = await response.json();
    if (e2e) console.info(`[E2E API] GET /api/presentation ${response.status} imageDataSha256=${createHash('sha256').update(presentation.imageData ?? '').digest('hex')}`);
    return presentation;
  });
}
function load(win: BrowserWindow, route: string) {
  const loading = app.isPackaged
    ? win.loadFile(join(process.resourcesPath, 'dist', route))
    : win.loadURL(`${devServerUrl}/${route}`);
  void loading.catch(error => console.error(`[renderer:${route}] Failed to load:`, error));
}
function logRendererFailures(role: 'dm' | 'public', win: BrowserWindow) {
  win.webContents.on('console-message', details => {
    if (details.level === 'error') console.error(`[renderer:${role}] ${details.message} (${details.sourceId}:${details.lineNumber})`);
  });
  win.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame) console.error(`[renderer:${role}] Load failed (${code}): ${description} ${url}`);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[renderer:${role}] Process exited (${details.reason}, ${details.exitCode})`);
  });
}
function createWindows() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = chooseExternalDisplay(displays, primary.id, prefs.displayId);
  if (prefs.displayId !== null && !external) { prefs.displayId = null; void savePreferences(); }
  if (external && prefs.displayId === null) { prefs.displayId = external.id; void savePreferences(); }
  activeDisplayId = external?.id ?? null;
  displayStateInitialized = true;
  const dm = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { preload: join(app.getAppPath(), 'dist/main/preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, offscreen: e2e } });
  logRendererFailures('dm', dm);
  windows.set('dm', dm); dm.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  dm.webContents.on('will-navigate', (e, url) => { const allowed = app.isPackaged ? url.startsWith('file:') : url.startsWith(`${devServerUrl}/`); if (!allowed) e.preventDefault(); });
  load(dm, 'index.html'); if (!e2e) dm.once('ready-to-show', () => dm.show());
  const target: Display = external ?? primary;
  const pub = new BrowserWindow({ x: external ? target.bounds.x : primary.bounds.x + 80, y: external ? target.bounds.y : primary.bounds.y + 80, width: e2e ? 960 : external ? target.bounds.width : 960, height: e2e ? 540 : external ? target.bounds.height : 540, frame: true, fullscreen: !e2e && !!external, show: false, backgroundColor: '#000000', webPreferences: { preload: join(app.getAppPath(), 'dist/main/preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, additionalArguments: ['--window-role=public'], offscreen: e2e } });
  logRendererFailures('public', pub);
  windows.set('public', pub); pub.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pub.webContents.on('will-navigate', (e, url) => { const allowed = app.isPackaged ? url.startsWith('file:') : url.startsWith(`${devServerUrl}/`); if (!allowed) e.preventDefault(); });
  load(pub, 'public.html'); if (!e2e) pub.once('ready-to-show', () => pub.show());
}
function safeTopology(metricsDisplayId?: number) {
  const all = screen.getAllDisplays(); const primary = screen.getPrimaryDisplay();
  const publicWindow = windows.get('public'); if (!publicWindow || publicWindow.isDestroyed()) return;
  const selected = chooseExternalDisplay(all, primary.id, prefs.displayId);
  if (prefs.displayId !== null && !selected) { prefs.displayId = null; void savePreferences(); }
  const nextDisplayId = selected?.id ?? null;
  if (displayStateInitialized && nextDisplayId === activeDisplayId) {
    if (selected && metricsDisplayId === selected.id) publicWindow.setBounds(selected.bounds);
    else if (!selected && metricsDisplayId === primary.id) publicWindow.setBounds({ x: primary.bounds.x + 80, y: primary.bounds.y + 80, width: 960, height: 540 });
    return;
  }
  if (displayStateInitialized && nextDisplayId !== activeDisplayId) void api('/api/blackout', 'POST').catch(() => {});
  activeDisplayId = nextDisplayId;
  if (selected && prefs.displayId === null) { prefs.displayId = selected.id; void savePreferences(); }
  if (!selected) {
    publicWindow.setFullScreen(false); publicWindow.setBounds({ x: primary.bounds.x + 80, y: primary.bounds.y + 80, width: 960, height: 540 });
    return;
  }
  publicWindow.setBounds(selected.bounds);
  if (!e2e && !publicWindow.isFullScreen()) publicWindow.setFullScreen(true);
}
app.whenReady().then(async () => {
  screen.getAllDisplays(); await loadPreferences(); await loadAudioConfig(); installIpc(); await startBackend(); createWindows();
  screen.on('display-added', () => safeTopology()); screen.on('display-removed', () => safeTopology());
  screen.on('display-metrics-changed', (_event, display) => safeTopology(display.id));
}).catch(error => { console.error(error); app.quit(); });
app.on('before-quit', () => { quitting = true; if (backend && backend.exitCode === null) backend.kill(); });
app.on('window-all-closed', () => app.quit());
