import { app, BrowserWindow, ipcMain, screen, type Display } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chooseExternalDisplay } from './display-policy.mjs';

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
function api(path: string, method = 'GET') {
  return fetch(`${backendUrl}${path}`, { method, headers: { 'X-Dungeon-Token': backendToken, Accept: 'application/json' } });
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
  const path = app.isPackaged ? join(process.resourcesPath, `backend-${backendRid}`, executable) : join(app.getAppPath(), 'artifacts', `backend-${backendRid}`, executable);
  backend = spawn(path, [], { env: { ...process.env, DUNGEON_DEPUTY_PORT: String(port), DUNGEON_DEPUTY_TOKEN: backendToken }, stdio: 'ignore', windowsHide: true });
  backend.once('exit', () => { if (!quitting) { for (const win of windows.values()) if (!win.isDestroyed()) void win.webContents.executeJavaScript("document.body.style.background='black'"); app.quit(); } });
  await waitForBackend(backend);
}
function allowedSender(role: Role, event: Electron.IpcMainInvokeEvent) {
  const win = windows.get(role);
  return !!win && event.sender === win.webContents && event.senderFrame?.url === win.webContents.getURL();
}
function installIpc() {
  for (const channel of ['dm:command', 'dm:preferences', 'display:list', 'public:presentation']) {
    ipcMain.removeHandler(channel);
  }
  ipcMain.handle('dm:command', async (event, path: unknown, method: unknown) => {
    if (!allowedSender('dm', event) || typeof path !== 'string' || !/^\/api\/(scenes|presentation|selection\/[a-z-]+|show\/[a-z-]+|blackout)$/.test(path) || !['GET', 'POST'].includes(String(method))) throw new Error('Denied');
    const response = await api(path, String(method));
    if (!response.ok) throw new Error(`Presentation service returned ${response.status}.`);
    return response.status === 204 ? null : response.json();
  });
  ipcMain.handle('dm:preferences', async (event, value?: unknown) => {
    if (!allowedSender('dm', event)) throw new Error('Denied');
    if (value !== undefined) { prefs = validPreferences(value); await savePreferences(); safeTopology(); }
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
    return response.json();
  });
}
function load(win: BrowserWindow, route: string) {
  if (app.isPackaged) void win.loadFile(join(process.resourcesPath, 'dist', route));
  else void win.loadURL(`http://127.0.0.1:5173/${route}`);
}
function createWindows() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = chooseExternalDisplay(displays, primary.id, prefs.displayId);
  if (prefs.displayId !== null && !external) { prefs.displayId = null; void savePreferences(); }
  if (external && prefs.displayId === null) { prefs.displayId = external.id; void savePreferences(); }
  activeDisplayId = external?.id ?? null;
  displayStateInitialized = true;
  const dm = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { preload: join(app.getAppPath(), 'dist/main/preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  windows.set('dm', dm); dm.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  dm.webContents.on('will-navigate', (e, url) => { const allowed = app.isPackaged ? url.startsWith('file:') : url.startsWith('http://127.0.0.1:5173/'); if (!allowed) e.preventDefault(); });
  load(dm, 'index.html'); dm.once('ready-to-show', () => dm.show());
  const target: Display = external ?? primary;
  const pub = new BrowserWindow({ x: external ? target.bounds.x : primary.bounds.x + 80, y: external ? target.bounds.y : primary.bounds.y + 80, width: external ? target.bounds.width : 960, height: external ? target.bounds.height : 540, frame: true, fullscreen: !!external, show: false, backgroundColor: '#000000', webPreferences: { preload: join(app.getAppPath(), 'dist/main/preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, additionalArguments: ['--window-role=public'] } });
  windows.set('public', pub); pub.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pub.webContents.on('will-navigate', (e, url) => { const allowed = app.isPackaged ? url.startsWith('file:') : url.startsWith('http://127.0.0.1:5173/'); if (!allowed) e.preventDefault(); });
  load(pub, 'public.html'); pub.once('ready-to-show', () => pub.show());
}
function safeTopology() {
  const all = screen.getAllDisplays(); const primary = screen.getPrimaryDisplay();
  const publicWindow = windows.get('public'); if (!publicWindow || publicWindow.isDestroyed()) return;
  const selected = chooseExternalDisplay(all, primary.id, prefs.displayId);
  if (prefs.displayId !== null && !selected) { prefs.displayId = null; void savePreferences(); }
  const nextDisplayId = selected?.id ?? null;
  if (displayStateInitialized && nextDisplayId !== activeDisplayId) void api('/api/blackout', 'POST').catch(() => {});
  activeDisplayId = nextDisplayId;
  if (selected && prefs.displayId === null) { prefs.displayId = selected.id; void savePreferences(); }
  if (!selected) {
    publicWindow.setFullScreen(false); publicWindow.setBounds({ x: primary.bounds.x + 80, y: primary.bounds.y + 80, width: 960, height: 540 });
    return;
  }
  publicWindow.setFullScreen(false); publicWindow.setBounds(selected.bounds); publicWindow.setFullScreen(true);
}
app.whenReady().then(async () => {
  screen.getAllDisplays(); await loadPreferences(); installIpc(); await startBackend(); createWindows();
  screen.on('display-added', safeTopology); screen.on('display-removed', safeTopology); screen.on('display-metrics-changed', safeTopology);
}).catch(error => { console.error(error); app.quit(); });
app.on('before-quit', () => { quitting = true; if (backend && backend.exitCode === null) backend.kill(); });
app.on('window-all-closed', () => app.quit());
