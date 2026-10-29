# Phase 4: Soundboard, Scenes, and 12-Key Control — Research

**Researched:** 2026-10-29  
**Domain:** Offline Electron audio playback, local file import, keyboard cueing  
**Confidence:** MEDIUM (architecture grounded in current repo; browser/Electron APIs cited from official docs)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUD-01 | The DM can load user-provided sounds into a 12-pad soundboard with named banks, volume controls, looping ambience, one-shots, and stop-all. | Audio selection/import, Web Audio playback lifecycle, bounded local persistence, and 12-slot bank invariants below. |
| AUD-02 | The DM can map standard keyboard shortcuts to cues that play sounds, show/reveal/swap a scene, or blackout the display; mappings persist and do not disrupt ordinary typing unnecessarily. | Scoped keyboard handling, safe cue dispatch through existing DM command surface, persisted shortcut validation and focus exclusions below. |
</phase_requirements>

## User Constraints

- Phase 4 scope is local sound loading, exactly 12 pads per named bank, controls and persistent shortcuts.
- Include existing scene/map/fog and public/private boundaries; do not introduce SignalR or Phase 5+ features.
- Work offline/local-first. No new dependency unless unavoidable.
- No claims of platform verification except platforms actually tested.
- Best-effort research; do not ask questions.

## Summary

Use the existing React/Electron architecture and browser Web Audio APIs, with no audio package. Keep the UI, audio playback, and shortcuts in the private DM renderer; a single `AudioContext`/master gain graph can support looping ambience and overlapping one-shots, with a tracked source registry so stop-all can reliably stop and dispose active nodes. Import should be initiated by a narrow main-process native picker IPC, then copy/read only user-selected supported files into app-owned user data; renderer never supplies arbitrary filesystem paths. Persist bank/pad metadata, shortcut mappings, and imported assets under user data, with schema validation, explicit size/duration/count limits, and graceful missing-file handling. Limits are design choices requiring confirmation, not established product requirements. [CITED: https://github.com/electron/electron/blob/main/docs/api/dialog.md] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode]

Keep cue actions DM-only: use current private `MapEditor` scene/fog/blackout operations and existing trusted IPC/backend APIs. Never send sounds, shortcut metadata, draft data, or cue commands to the public renderer. The scene UI currently only previews privately on selection and requires explicit Show; preserve that distinction. Add shortcuts as opt-in scoped bindings while the dashboard is active, and suppress them when focus is in editable controls/contenteditable or when composing text. Avoid Electron global shortcuts for this requirement: they capture keys outside the app, can fail silently on collision, and are unnecessary for “during play” in-app control. [VERIFIED: src/renderer/src/map/MapEditor.tsx:238-250] “Choosing a scene only changes your private preview.” [VERIFIED: src/main.ts:70-73] `function allowedSender(role: Role, event: Electron.IpcMainInvokeEvent)` [CITED: https://github.com/electron/electron/blob/main/docs/api/global-shortcut.md]

**Primary recommendation:** Add an Audio workspace and typed, narrow audio/import IPC to the existing private-window boundary; persist only validated app-owned file references and cue metadata, then implement configurable in-app shortcuts with input/focus filtering and test full restart/play/stop/public-privacy behavior.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pad/bank editor and in-app shortcuts | Browser / Client (private DM renderer) | Electron Main | UI state and keyboard events belong to the private renderer; main grants only picker/import capability. |
| Audio playback, gain, loop and active-source lifecycle | Browser / Client (private DM renderer) | — | Web Audio provides playback graph and per-source lifetime control without a package. |
| File selection, asset import, metadata persistence | Electron Main / local storage | Browser / Client | Main owns filesystem privileges; renderer should receive opaque asset IDs and safe metadata. |
| Scene/show/reveal/blackout cues | API / Backend and private renderer | Electron Main | Existing authenticated commands own session state; private UI dispatches; public projection remains allowlisted. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | existing pinned `45.1.0` | Native file picker and narrow IPC bridge | Existing host and security boundary; no new package. [VERIFIED: package.json:34] `"electron": "45.1.0"` |
| Web Audio API | Chromium runtime; no npm package | Concurrent sounds, loop source, gain and stopping | Native browser audio graph; `AudioBufferSourceNode` supports loop and one-shot source lifecycle. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode] |
| React / TypeScript | existing pinned `19.3.1` / `7.0.2` | DM board and shortcut configuration UI | Existing application stack. [VERIFIED: package.json:23,36] `"react": "19.3.1"`; `"typescript": "7.0.2"` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Audio API | `<audio>` elements | Simpler for basic playback, but coordinating many simultaneous sources, shared master gain, and deterministic stop-all is less centralized. [ASSUMED] |
| In-app shortcuts | Electron `globalShortcut` | System-wide capture is broader than the requirement; registration can fail if OS/app owns a key, and macOS media keys can require accessibility authorization. Avoid unless user explicitly asks for global background operation. [CITED: https://github.com/electron/electron/blob/main/docs/api/global-shortcut.md] |

**Installation:** None. Do not add dependencies for this phase.

## Architecture Patterns

### Recommended data and playback flow
```text
DM clicks Import → narrow preload method → main validates DM sender → native open dialog
   → main validates/copies supported file under app userData → returns opaque asset metadata
   → private renderer stores pad/bank reference and persists validated settings

Pad click / accepted shortcut → cue dispatcher → Web Audio buffer/source → per-source gain → master gain → local output
                         ├→ current scene/show/blackout command (DM-only existing API)
                         └→ reveal cue uses existing selected map/fog operation; no public/private bypass
Stop All → stop tracked source nodes + clear registry; imported files and mappings remain persisted
```

### File import and storage
- Use `dialog.showOpenDialog` in main with `openFile`/`multiSelections` and an extension filter. A filter is UX, not a security validator; re-check suffix, regular-file status, actual byte size and supported decode before accepting. Never accept renderer-provided absolute paths. [CITED: https://github.com/electron/electron/blob/main/docs/api/dialog.md]
- Copy into a dedicated app-owned audio directory with generated opaque IDs and safe generated filenames; persist ID, display name, format/size/duration metadata and pad assignment, not an executable path from renderer. Use atomic writes and avoid overwriting existing IDs. [ASSUMED]
- Design small configurable bounds before implementation (per-file bytes, total imported bytes, duration, number of banks/assets, decoded memory); reject over-limit/invalid files with actionable UI feedback. Values are not specified by requirements and must remain planner/user-confirmable. [ASSUMED]
- Recommended MVP allow-list: WAV, MP3, Ogg Vorbis, and FLAC only after confirming actual Chromium/Electron decode support on target Windows and macOS; codec/container support varies by platform/build, so don’t promise it from extension alone. Prefer probe via `decodeAudioData` and expose exact tested formats. [ASSUMED]
- A file moved/deleted after import should not break startup: surface missing asset in pad, preserve assignment, allow relink/remove; never silently clear user data. [ASSUMED]

### Playback lifecycle and limits
- Create/resume the audio context from a direct user gesture to avoid autoplay restrictions; reuse one context, decode on demand/cache within explicit memory bounds, and serialize or de-duplicate concurrent decode requests. [ASSUMED]
- Route each source through source gain (pad volume) and shared master gain; choose whether volume is global or bank/pad in plan/UI, since the requirement only says “volume controls.” [CITED: https://developer.mozilla.org/en-US/docs/Web/API/GainNode] [ASSUMED]
- For ambience use a tracked `AudioBufferSourceNode` with `loop = true`; for one-shots use a fresh source per trigger. AudioBufferSourceNodes are single-use: on `ended`, disconnect and remove from registry. Stop-all stops every tracked source, including loops and one-shots, and is idempotent. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode] [ASSUMED]
- Permit one ambience bed plus bounded overlapping one-shots (exact cap is unspecified); reject or retire according to an explicit policy rather than allowing unbounded sources/buffer allocations. [ASSUMED]
- App shutdown stops nodes and closes/releases context where practical. Audio playback itself is ephemeral and must not auto-resume after restart; configuration/assets persist. [ASSUMED]

### Keyboard cue handling
- Implement app-window key handling only (not `globalShortcut`). Normalize a documented shortcut representation; reject duplicate/conflicting bindings, unsupported keys, and bare printable-key shortcuts by default. Provide clear edit/record, conflict message, clear/reset, and persisted mapping UI. [ASSUMED]
- Ignore events from `input`, `textarea`, `select`, `[contenteditable="true"]`, role=textbox, and active IME composition; do not intercept modifier shortcuts commonly used for editing. Check `defaultPrevented`, repeat and composition state. [ASSUMED]
- Ensure canvas-specific navigation/brush handlers do not double-run cue actions: current map canvas keyboard workflow intentionally uses focused canvas and Space/Enter/arrow controls (see `scripts/e2e.mjs:295-333`); define precedence and test it. [VERIFIED: scripts/e2e.mjs:295-333] `await manager.keyboard.press('ArrowRight');` ... `await manager.keyboard.press('Space');` ... `await manager.keyboard.press('Enter');`
- Shortcut payload references a typed cue target (pad ID or approved action + scene/map identifier), not arbitrary URL/path/API string. Scene selection alone is private; only explicit show action publishes. Reveal should invoke validated existing fog semantics, not fabricate public state or shortcut around conceal confirmation. [VERIFIED: src/renderer/src/map/MapEditor.tsx:238-250] “Choosing a scene only changes your private preview.”

### Existing Electron boundary and project integration
- Current BrowserWindows use `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; preload exposes separate private/public API objects. Preserve this and add dedicated methods, never expose `ipcRenderer`, filesystem, or arbitrary channel/path invocation. [VERIFIED: src/main.ts:134-144] `contextIsolation: true, sandbox: true, nodeIntegration: false` [VERIFIED: src/preload.cts:4-11] `const api = publicWindow` ... `contextBridge.exposeInMainWorld('dungeonDeputy', api);`
- Main currently validates sender per role, and DM command path allowlisting is explicit. Add audio IPC as separately typed/validated channels, role-check DM sender, and validate every argument/schema. Do not route asset bytes through the public presentation DTO. [VERIFIED: src/main.ts:70-84] `if (!allowedSender('dm', event) ... throw new Error('Denied');`
- Private map/scenes are in `MapEditor`; existing `showScene`, fog and blackout are implemented at lines 80-89, 205-209 and 238-299. Integrate a new workspace or panel without moving map mutation authority into public renderer. [VERIFIED: src/renderer/src/map/MapEditor.tsx:80-89] `setPublicPresentation(await command(`/api/show/${sceneId}`, 'POST') as Presentation);` [VERIFIED: src/renderer/src/map/MapEditor.tsx:205-209] `await command('/api/blackout', 'POST');`

## Don't Hand-Roll
| Problem | Don’t Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Audio mixing/looping | Timer-driven file replay/custom mixer | Native Web Audio nodes and explicit source registry | Audio graph handles timing/gain and standard source loop behavior. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode] |
| Native file selection | Renderer file path text input or unrestricted file IPC | Electron `dialog.showOpenDialog` behind validated main IPC | User-selected paths remain privileged; main can validate and copy only authorized selection. [CITED: https://github.com/electron/electron/blob/main/docs/api/dialog.md] |
| Cue dispatch | Shortcut handler that mutates public presentation directly | Shared typed cue dispatcher invoking existing DM operations | Preserves explicit approval and filtered public projection. [VERIFIED: scripts/e2e.mjs:172-189] `Preview privately` then `Show scene on table` then blackout. |

## Common Pitfalls
- **Extensions masquerade as supported codec:** reject decode failures and document only formats physically tested; MIME/suffix checks alone are insufficient. [ASSUMED]
- **Unbounded decoded audio memory / node accumulation:** file and aggregate limits; bounded active voices; remove/disconnect nodes on `ended` and stop-all. [ASSUMED]
- **One-shot node reused:** instantiate new source per playback, as Web Audio sources are single-use. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode]
- **Keys disrupt typing or canvas tools:** filter editable/focused/composition cases, honor existing map keyboard behavior, prevent duplicate event dispatch, and test key entry in name/HP fields. [ASSUMED]
- **Duplicate binding ambiguity:** validate uniqueness before save and at load; corrupt/legacy mappings should disable conflicting entries and explain rather than silently select a winner. [ASSUMED]
- **IPC becomes filesystem escape hatch:** picker-only main API, sender checks, opaque asset IDs, path containment checks and restrictive limits. [CITED: https://github.com/electron/electron/blob/main/docs/tutorial/security.md]
- **Audio/config leaks to table display:** private preload API only; verify public window has no audio/import methods and no public payload includes paths or pad data. [VERIFIED: src/preload.cts:4-11] `const api = publicWindow` ... `contextBridge.exposeInMainWorld('dungeonDeputy', api);`
- **Scene shortcut publishes on selection:** preserve private preview vs explicit Show and safe blackout behavior. [VERIFIED: src/renderer/src/map/MapEditor.tsx:238-250] “Choosing a scene only changes your private preview.”

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in test runner; Playwright Core Electron E2E; .NET tests for backend |
| Config file | `package.json` scripts |
| Quick run command | `node --test src/main.test.mjs src/renderer/src/*.test.mjs src/renderer/src/map/*.test.mjs scripts/e2e/*.test.mjs` |
| Full suite command | `npm test`; Electron E2E: `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUD-01 | Precisely 12 pads per bank; assignment, volume, loop/one-shot overlap, stop-all, import validation, persistence/restart | unit + E2E | `npm test`; `npm run test:e2e` | ❌ add pure model/audio lifecycle tests + extend `scripts/e2e.mjs` |
| AUD-02 | persistent unique cue mapping; actions execute; typing/input/focus/IME and map brush unaffected | unit + E2E | `npm test`; `npm run test:e2e` | ❌ add shortcut normalization/filter tests + UI E2E |

### E2E approach
- Extend existing real Electron/Playwright scenario in `scripts/e2e.mjs` and existing isolated user data launch fixtures (`scripts/e2e/fixtures.mjs`). Add small deterministic audio fixtures in temporary test data (or generated short WAV), never rely on external files/network.
- Exercise native dialog/import via a test-only seam or deterministic IPC fixture: allowed file import, cancellation, invalid extension/oversize/decode rejection, asset ID path containment. Keep test-only seam inaccessible outside E2E mode.
- Assert exact 12 slots per bank, metadata/shortcut survives app close/relaunch, removed/missing asset state is recoverable, duplicate shortcut rejected, and stop-all stops loop plus simultaneous one-shots. Browser automation may assert audio state via test-safe observable state rather than physical sound output; speaker/output hardware is not proven by E2E.
- Trigger show/blackout/reveal cues and assert private action only until explicit publish; assert public window remains without DM controls, local asset URLs/paths and shortcut values. Preserve current public DTO allowlist/raster checks.
- Verify text entry into token-name/HP and contenteditable inputs is unchanged; focused map canvas keeps Arrow/Space/Enter behavior; shortcuts fire only in intended dashboard scope and not while IME composition/editing. Add timeout cleanup so failed tests cannot leave sources playing.
- For physical smoke, report per-platform only after actually testing Windows/macOS output devices and supported codecs; no such platform proof is established by this research.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (single local DM; existing backend token remains private) | Do not expose token or privileged audio operations to public renderer. |
| V3 Session Management | No | No network login/session introduced. |
| V4 Access Control | Yes | DM-only sender-checked IPC; public preload stays read-only. |
| V5 Input Validation | Yes | Validate import count, file type/decode/size, pad index, volume range, bank names, IDs, shortcuts and cue target. |
| V6 Cryptography | No new cryptography | Don’t introduce custom encryption for local files. |

Threat controls: arbitrary path IPC → picker-originated selection and app-owned copy; malicious/oversized media → bounded import and decode, errors handled; shortcut conflicts/abuse → in-app-only, explicit binding uniqueness and focus guards; private session leakage → never serialize assets/shortcut values into public projection. [ASSUMED]

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MVP audio stays in private renderer using native Web Audio, without additional packages. | Summary/Stack | Playback capability or lifecycle limitations may force a native module/package. |
| A2 | Imported assets can be copied into app user data and remain available after restart. | File import | Packaging/platform file access policy may require different storage or macOS bookmark handling. |
| A3 | WAV/MP3/Ogg/FLAC are candidates, but actual support depends on packaged Chromium/platform. | File import | User media may fail despite matching extension; defer advertised support until tested. |
| A4 | Explicit safe bounds and one ambience plus capped one-shots are suitable, but no values/policy are requirement-locked. | Playback | Wrong caps can frustrate users or exhaust resources. |
| A5 | Shortcuts are in-app only and should avoid bare printable keys. | Keyboard | If user expects global/background shortcuts, architecture/permissions differ. |

## Open Questions
1. What concrete asset limits and overlap/ambience policy provide acceptable memory use without constraining typical DM audio? Keep limits conservative and surfaced; user confirmation needed before locking values.
2. Which audio formats should be advertised after packaged Windows and macOS decode testing? Preserve upload-time decode validation until evidence exists.
3. Is volume global, per-bank, per-pad, or a combination? Requirement says volume controls but does not specify scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Electron | Main picker/IPC and E2E host | ✓ in project dependencies | `45.1.0` [VERIFIED: package.json:34] `"electron": "45.1.0"` | None needed |
| Playwright Core | Existing Electron E2E workflow | ✓ in project dev dependencies | `1.64.1` [VERIFIED: package.json:35] `"playwright-core": "1.64.1"` | Existing unit tests |

**External provider/device verification:** Audio device availability and codec support on Windows/macOS were not probed; hardware/platform playback remains an explicit test limitation. App has no required network service for this phase. [ASSUMED]

## Sources

### Primary (official documentation)
- Electron dialog API: https://github.com/electron/electron/blob/main/docs/api/dialog.md — file selection, paths, filters, multi-selection and macOS security-scoped bookmarks.
- Electron security tutorial: https://github.com/electron/electron/blob/main/docs/tutorial/security.md — validate IPC sender and expose narrow bridge methods.
- Electron globalShortcut API: https://github.com/electron/electron/blob/main/docs/api/global-shortcut.md — collision failures and platform caveats.
- MDN `AudioBufferSourceNode`: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode — start/loop and source behavior.
- MDN `GainNode`: https://developer.mozilla.org/en-US/docs/Web/API/GainNode — gain graph control.

### In-repository evidence (opened this session)
- `.planning/ROADMAP.md:78-87`, `.planning/REQUIREMENTS.md:28-31`, `.planning/PROJECT.md:42-49`, `.planning/STATE.md:81-110`, `.planning/config.json:21-51`.
- `package.json:6-19,21-37`; `src/main.ts:70-107,126-144`; `src/preload.cts:1-12`; `src/renderer/src/api.ts:1-24`; `src/renderer/src/map/MapEditor.tsx:80-89,205-209,238-299`; `scripts/e2e.mjs:147-189,295-333,363-394`.

## Metadata

**Confidence breakdown:** Standard stack HIGH for existing pinned stack / MEDIUM for browser codec behavior; architecture MEDIUM (official API patterns plus repo); pitfalls MEDIUM (official IPC and Web Audio lifecycle, resource/UX bounds are assumptions).  
**Research date:** 2026-10-29  
**Valid until:** 2026-11-28; re-check Electron docs before implementation if major Electron version changes.
