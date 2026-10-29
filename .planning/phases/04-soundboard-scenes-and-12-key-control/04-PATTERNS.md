# Phase 4: Soundboard, Scenes, and 12-Key Control - Pattern Map

**Mapped:** 2026-10-29  
**Files analyzed:** 9 likely implementation/test surfaces inferred from phase requirements  
**Analogs found:** 8 / 9 (keyboard-cue filtering has no existing analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/main.ts` | controller / persistence | file-I/O, request-response | `src/main.ts` | role-match |
| `src/preload.cts` | middleware / bridge | request-response | `src/preload.cts` | role-match |
| `src/renderer/src/api.ts` or private preload typings | utility / API | request-response | `src/renderer/src/api.ts` | role-match |
| `src/renderer/src/audio/*` (new playback/model modules) | service / utility | streaming, lifecycle | `src/renderer/src/map/MapCanvas.tsx` lifecycle | partial |
| `src/renderer/src/map/MapEditor.tsx` or new dashboard workspace | component | request-response, event-driven | `src/renderer/src/map/MapEditor.tsx` | role-match |
| `src/renderer/src/styles.css` | component styling | transform | `src/renderer/src/styles.css` | role-match |
| `src/main.test.mjs` | test | request-response, file-I/O | `src/main.test.mjs` | role-match |
| `src/renderer/src/*test.mjs` | test | transform / lifecycle | `src/renderer/src/MapEditor.test.mjs`, `src/renderer/src/map/MapCanvas.lifecycle.test.mjs` | role-match |
| `scripts/e2e.mjs`, `scripts/e2e/fixtures.mjs` | test | request-response, persistence | same files | role-match |

The names above are expected surfaces, not a prescribed decomposition. Phase requirements AUD-01/AUD-02, and locked privacy/limits in `04-CONTEXT.md:13-37`, drive these roles. No audio, global shortcut, or hardware driver package is permitted. Do not expose privileged sound/import APIs from the public window.

## Pattern Assignments

### `src/main.ts` (Electron main controller, file-I/O + request-response)

**Analog:** `src/main.ts`

**Imports and user-data persistence** (`src/main.ts:1-5,30-43`): uses Electron APIs and `node:fs/promises`; user data is rooted at `app.getPath('userData')`. `validPreferences(value: unknown)` validates unknown input and falls back safely; loading catches malformed/missing JSON and saving creates the directory then writes JSON with mode `0o600`. For assets, copy only a native-picker-selected file to generated app-owned names; persist safe metadata/opaque IDs, never renderer paths. Settings persistence should retain the current defensive validation/failure posture; research recommends atomic writes for new config.

```typescript
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
```

**Sender/auth boundary and errors** (`src/main.ts:70-107`): `allowedSender(role,event)` verifies both the expected BrowserWindow's `webContents` and exact frame URL. Existing invoke handlers reject unauthorized calls with `Error('Denied')`; each new audio operation should be distinct, DM-only, and validate each payload. The current generic `dm:command` regex is a limited backend allowlist, not suitable as arbitrary filesystem/audio IPC. Native dialog + import belongs in main; cancellation and invalid selections must return a controlled result/error. Preserve `contextIsolation`, `sandbox`, and `nodeIntegration:false` at `src/main.ts:134-144`.

```typescript
function allowedSender(role: Role, event: Electron.IpcMainInvokeEvent) {
  const win = windows.get(role);
  return !!win && event.sender === win.webContents && event.senderFrame?.url === win.webContents.getURL();
}
ipcMain.handle('dm:preferences', async (event, value?: unknown) => {
  if (!allowedSender('dm', event)) throw new Error('Denied');
  if (value !== undefined) { prefs = validPreferences(value); await savePreferences(); }
  return prefs;
});
```

### `src/preload.cts` and private API typing (bridge, request-response)

**Analog:** `src/preload.cts:1-12`, `src/renderer/src/api.ts:1-24`

Bridge methods are narrow named calls to `ipcRenderer.invoke`; public gets only presentation retrieval, while private DM additionally receives command/preferences/display methods (`preload.cts:3-12`). Follow this role split: add import/config methods only to DM API. Never expose `ipcRenderer`, arbitrary channel names, paths, or filesystem access. Update corresponding declarations (in `api.ts`/window type convention) with strict typed arguments and opaque asset response; public shape stays unchanged.

```typescript
const api = publicWindow
  ? Object.freeze({ getPresentation: () => ipcRenderer.invoke('public:presentation') })
  : Object.freeze({
      command: (path: string, method = 'GET', body?: unknown) => ipcRenderer.invoke('dm:command', path, method, body),
      preferences: (value?: unknown) => ipcRenderer.invoke('dm:preferences', value),
      displays: () => ipcRenderer.invoke('display:list'),
      getPresentation: () => ipcRenderer.invoke('dm:command', '/api/presentation', 'GET'),
    });
contextBridge.exposeInMainWorld('dungeonDeputy', api);
```

### Audio model/service and renderer lifecycle

**Closest analog:** `src/renderer/src/map/MapCanvas.tsx` and `src/renderer/src/map/MapCanvas.lifecycle.test.mjs` (not a Web Audio analog; lifecycle/resource cleanup only).

The codebase has no audio graph, asset picker, or keyboard shortcut dispatcher to copy. Use the MapCanvas lifecycle style: own imperative browser resources in renderer refs and ensure cleanup on component unmount; do not place playback/file privileges in main/public APIs. Web Audio must be created/resumed from a direct user gesture, use a shared master gain and per-source gain, instantiate a fresh one-shot source each time, and disconnect/remove each source on ended/stop-all. These are phase/research constraints, not existing project code. Keep audio assets/config persisted but playback ephemeral across restarts. Add pure model tests for exactly 12 slots and validation; add lifecycle tests for loops/one-shots/stop-all and cleanup.

### `src/renderer/src/map/MapEditor.tsx` (dashboard UI and approved cues)

**Analog:** `src/renderer/src/map/MapEditor.tsx`

**Workspace and state bootstrapping** (`MapEditor.tsx:7-29,51-71,225-270`): workspace is a narrow union (`'scenes' | 'map'`) selected via `aria-pressed` buttons. Data is loaded on mount; async work is caught and surfaced with the timed status notifier (`31-39`). Extend the workspace idiom or compose a separate component, keeping audio-local state private to the DM renderer.

**Cue dispatch/safety** (`MapEditor.tsx:73-91,153-182,205-213,238-269`): scene preview selection calls `/api/selection/${id}` and saves preference, while publication is a separate explicit `showScene()` `/api/show/${sceneId}` action. Map show rasterizes the draft and calls `publishMapRaster`; blackout uses `/api/blackout`. Shortcut targets should dispatch these same trusted methods/actions, not directly mutate public presentation or skip the approved raster/fog path. In particular, selecting a scene is not showing it, and map cue cannot publish a private draft.

```typescript
const showScene = async () => {
  try {
    setPublicPresentation(await command(`/api/show/${sceneId}`, 'POST') as Presentation);
    notify('Scene shown on table.');
  } catch {
    notify(RETRY_MESSAGE, 6000);
  }
};
const blackout = async () => {
  try {
    await command('/api/blackout', 'POST');
    setPublicPresentation({ mode: 'black', sceneId: null });
    notify('Table display blacked out.');
  } catch {
    notify(RETRY_MESSAGE, 6000);
  }
};
```

**Persistence/feedback:** UI preferences go through typed preload API; command failures use `RETRY_MESSAGE` and the polite status region rather than swallowing silently. Keep cue edits/selection distinct from explicit public actions.

### `src/renderer/src/styles.css` (component styling, transform)

**Analog:** `src/renderer/src/styles.css:159-180,153-156`

Build workspace styling in the existing `.map-desk` scope and token variables (`--desk-ink`, `--desk-slate`, `--desk-line`, `--desk-chalk`, `--desk-brass`, `--desk-teal`, `--desk-coral`). Maintain responsive breakpoints at `1050/820/580px` and focus-visible controls; existing map toolbar/fog controls use usable 44px targets (`167-170`). Existing `.work-mode`, `.scene-mode`, and `.scene-actions` are convenient layout precedents (`91-98,138-145`); avoid styling public.css for DM-only controls.

### Main/unit/UI/E2E tests

**Analogs:** `src/main.test.mjs`, `src/renderer/src/MapEditor.test.mjs`, `scripts/e2e.mjs`, `scripts/e2e/fixtures.mjs`

- Main tests load source with `readFile(new URL(...))` and assert security/property invariants using Node `node:test` (`src/main.test.mjs:1-16,37-46`). Add assertions that public preload shape excludes import/audio methods and main checks DM sender.
- UI tests use source-contract tests (`MapEditor.test.mjs:1-4,18-27,38-60`) and should assert 12-pad invariant, shortcut/focus rules, cue separation and no public data leakage. Prefer pure-module tests where behavior can be exercised, not only regex assertions.
- E2E fixture provisions a unique ignored artifacts directory and isolated app-data root, launches Electron with E2E env (`scripts/e2e/fixtures.mjs:8-15,36-65`). Use this rather than real user data; deterministic local audio fixture, cleanup and restart testing should follow this isolation.
- Current E2E scene test verifies private preview vs explicit Show and blackout (`scripts/e2e.mjs:172-189`); canvas keyboard expectations are exercised at `295-333`. Extend these for input/editing and canvas precedence. Note E2E must prove app state/permissions, not physical speaker output.

## Shared Patterns

### Private/public authorization
**Sources:** `src/main.ts:70-73,85-106`; `src/preload.cts:3-12`; `src/main.test.mjs:37-40`  
**Apply to:** Main IPC and preload methods. Distinct `dm` sender gate, private-only API object, public remains presentation-only. Never include audio metadata, local paths, shortcut maps or imported sound names in public DTOs.

### Persistence
**Source:** `src/main.ts:30-43`  
**Apply to:** bank/pad/cue metadata and imported assets. Resolve under `app.getPath('userData')`; validate unknown persisted values; recover safely on missing/corrupt data; generated opaque identifiers and path containment for media files. E2E uses isolated roots.

### Cues and error feedback
**Source:** `src/renderer/src/map/MapEditor.tsx:31-39,73-91,153-182,205-213`  
**Apply to:** scene/map/blackout cue operations. Reuse established actions and explicit publication path; catch failures and emit actionable status. No private draft/fog bypass.

### Focus/keyboard behavior
**Source:** `scripts/e2e.mjs:295-333` (existing canvas semantics only)  
No app-wide key filtering pattern currently exists. New in-app bindings must ignore editable fields/contenteditable and IME, avoid repeat/defaultPrevented conflicts, and preserve focused canvas Arrow/Space/Enter behavior. Add explicit tests; do not use `globalShortcut`.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| Audio import service / picker | service/controller | file-I/O | Current main has no native asset import or audio-specific IPC. Main IPC and userData persistence are nearest safety/persistence patterns. |
| Web Audio soundboard playback | service | streaming/lifecycle | No audio playback code; MapCanvas lifecycle tests only inform resource ownership/cleanup. |
| Shortcut recording/normalization/focus filter | utility/component | event-driven | No app-level shortcut subsystem; map canvas has keyboard interactions but no general cue binding. |

## Metadata

**Analog search scope:** `src/main.ts`, `src/preload.cts`, `src/renderer/src`, `scripts/e2e*`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`  
**Tracked-source gate:** All source analogs were verified by `git ls-files`; no generated `dist/`, `out/`, or ignored mirror paths are cited.  
**Pattern extraction date:** 2026-10-29
