# Phase 1 verification status

Evidence recorded for the current Windows host after the integration corrections described below. These results are not equivalent to physical multi-monitor or macOS acceptance.

| Check | Result | Scope / caveat |
|---|---|---|
| Node tests via `npm test` | **Passed: 10/10** | Built-in Node tests, including fullscreen stability on scene changes. |
| .NET tests via `npm test` | **Passed: 6/6** | Correct project: `src/backend.tests/DungeonDeputy.Api.Tests.csproj`; includes per-run token enforcement for `/health`. |
| Standalone .NET test command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Exact test project; do not use `src/backend/DungeonDeputy.Api.csproj` as the test project. |
| `npm run build` | **Passed** | Frontend, Electron, and backend build. |
| `npm run package:backend -- win-x64` | **Passed** | Self-contained Windows x64 backend publish. |
| `npm run package:smoke` | **Passed on Windows** | Packages resources and probes the backend. Not a physical second-display test. |
| Browser accessibility snapshot | **Observed** | Dashboard content present; no console errors after graceful API fallback. |
| Browser screenshot | **Unavailable** | Screenshot tool required a visible desktop tab; no screenshot captured. |
| Physical HDMI / second-display flow | **Unverified** | No physical hot-plug or second-display workflow performed. |
| macOS x64 | **Unverified** | Packaging/platform/hardware not tested. |
| macOS arm64 | **Unverified** | Packaging/platform/hardware not tested. |

## Integration corrections included in the tested state

- Kept the fallback public window frameable/windowed.
- Excluded the primary monitor from the external-display selector.
- Blacked out public output when the selected monitor changes.
- Protected the health endpoint with the backend token.
- Refreshed the display list in the dashboard.
- Compiled the sandboxed Electron preload as CommonJS `.cjs` and verified the emitted runtime file before launch/package.
- Limited fullscreen repositioning to actual display-topology changes; scene selection and blackout no longer trigger fullscreen toggles or window recreation.
- Reapplied bounds on same-display metrics changes without leaving fullscreen.
- Made the development launcher wait for the strict Vite origin before opening Electron; it logs renderer console/load/process errors to the launch terminal and retains an HTML startup fallback.
- Removed the unsupported `frame-ancestors` meta directive. Pixi's CSP-safe `pixi.js/unsafe-eval` static-polyfill import runs before renderer initialization without enabling `unsafe-eval` in CSP.
- Deferred Pixi destruction until async initialization and canvas setup settle, avoiding ResizePlugin cleanup before its resize callback exists.

Tests were rerun after these corrections. No new npm dependencies were added.

## Acceptance status

**Phase 1 approved by the user on 2026-10-28.** This approval completes the review checkpoint and authorizes proceeding to Phase 2 planning/implementation. It does not change the evidence above: physical HDMI/second-display hot-plug behavior and macOS x64/arm64 remain unverified, and no such tests are claimed.

## Phase 2 automated evidence (Windows x64 host)

| Check | Result | Scope / caveat |
|---|---|---|
| `npm test` | **Passed: 23 Node tests and 13 .NET tests** | Includes nested `src/renderer/src/map/*.test.mjs`, camelCase public projection contract, map camera/lifecycle, stable player-window regression, isolated package-smoke staging, deterministic development startup, Pixi CSP/async cleanup regressions, and concurrent token-edit persistence. |
| `npm run build` | **Passed** | TypeScript, Electron output, Vite renderer, and .NET Release backend; backend build reported 0 warnings and 0 errors. |
| `npm run package:smoke` | **Passed on Windows x64** | Stages its backend in a unique build directory (safe to run while the development backend is open), packages the app, runs the published `win-x64` backend with a temporary per-run user-data folder and unique token, exercises authenticated tavern draft Save and explicit Show, mutates draft without republishing, stops/restarts the actual packaged backend, verifies draft and approved snapshots independently restore, then explicitly Shows the edited draft. No SQL is used to fake app behavior. |
| `npm run test:e2e` | **Passed on Windows x64** | Actual Electron manager/player windows drive Stage 1 scene selection/private preview/explicit Show/blackout and display enumeration/fallback, plus Stage 2 tavern/blank map, grid, scale, token add/move/rename/recolor/artwork/remove, pan/zoom, save, private draft vs approved public snapshot, blackout, and app restart restoration. It captures paired hidden/offscreen-window screenshots at each major checkpoint, asserts that shown scenes/maps produce non-black screenshots and blackouts produce black output, and logs Electron/renderer/API diagnostics. Last passing run: `artifacts/e2e/2026-10-29T10-16-39.785Z-2a4e3778/`; the successful isolated data/backend staging is cleaned automatically. No renderer console/page/request failures were reported. |
| `npm run test:e2e` process/display caveat | **Passed, physical hardware unverified** | Uses isolated E2E data and a per-run packaged backend; reuses only a validated project Vite server and does not terminate a pre-existing server/app. E2E windows are hidden/windowed to avoid taking over the desktop; the test asserts stable window identities, no navigation/recreation and unchanged fullscreen state. Electron enumerated two non-primary display targets on this host; selector equality and preference persistence were exercised. This does not establish physical HDMI/hot-plug or real fullscreen behavior on a dedicated player display. |
| Unauthorized map request | **Passed in package smoke** | `/api/map` without the per-run token returns HTTP 401. |
| macOS x64 / arm64 | **Unverified** | No macOS host was used. |
| Physical HDMI / external display and fullscreen behavior | **Unverified** | Automated same-window regression is covered by tests; no physical display was exercised. |

One Electron Forge Node deprecation warning about child-process shell arguments appeared during package smoke; packaging and all assertions completed successfully. `playwright-core@1.64.1` is the only additional direct test dependency for Electron E2E; it does not download a browser. Phase 2 was explicitly approved by the user before Phase 3 began. Physical display/macOS caveats remain; see [Phase 2 demo](phase-2-demo.md).

## Phase 3 verification status (Windows x64 host)

| Check | Result | Scope / caveat |
|---|---|---|
| `npm test` | **Passed: 40 Node tests and 21 .NET tests** | Includes ordered fog-mask pixel tests, brush pointer cancel/tool/failure cleanup, keyboard brush and Select/pan behavior, sanitized PNG public projection, serialized commit-to-presentation concurrency, atomic initiative reorder, nullable HP behavior, encounter service and HTTP authorization/persistence tests, plus prior Phase 1/2 regressions. |
| `npm run build` | **Passed** | TypeScript, Electron, Vite, and .NET Release backend; backend build reported 0 warnings and 0 errors. |
| `npm run test:e2e` | **Passed** | Actual two-window Electron app plus isolated backend. Covers scenes, map editing, fog enable/Reveal/Hide, token visibility, private HP/conditions/initiative/dice, restart-black-before-Show, sanitized explicit Show, one-second polling, black mask pixels, public source denial, keyboard Space/Enter brushing and Select/pan arrow navigation, responsive tablet/phone reachability, and same-window lifecycle. Latest run: `artifacts/e2e/2026-10-29T23-30-46.101Z-d7076d68/`. The only blocked request is the intentional CSP probe for `/maps/tavern.svg`; no unexpected renderer failures. |
| `npm run package:smoke` | **Passed on Windows x64** | Packaged backend authenticated draft/approved persistence, public DTO allowlist, independent restart restore, cold-start black, and explicit re-Show. One Electron Forge Node shell-argument deprecation warning appeared; assertions passed. |
| Physical HDMI / full-screen display behavior | **Unverified** | Hidden/offscreen automation proves rendered projection and same-window behavior, not physical GPU/monitor readability or hot-plug. |
| macOS x64 / arm64 | **Unverified** | No macOS host was used. |

Phase 3 implementation and automated verification cover ENCT-01/02/03 within the local-first desktop scope. Follow [Phase 3 demo](phase-3-demo.md) for the visible workflow and manual display caveats. The Almanac, player clients, SignalR, line-of-sight, and complex spell automation remain deferred as planned.

## Phase 4 verification status (Windows x64 host)

| Check | Result | Scope / caveat |
|---|---|---|
| `npm test` | **Passed: 64 Node tests and 21 .NET tests** | Covers picker-only audio IPC and storage policy, 12-slot bank model, byte/quota serialization, Web Audio lifecycle, shortcut normalization/focus/IME guards, safe cue dispatch, Phase 3 regressions and E2E harness fixtures. |
| `npm run build` | **Passed** | Renderer TypeScript, Electron, Vite and .NET Release backend; 0 .NET warnings/errors. |
| `npm run test:e2e` | **Passed** | Actual Electron manager/player windows. Covers invalid-first decode cleanup then valid import, pad/bank/volume/loop/one-shot/stop-all, persistence/no auto-resume, cue save pending/failure rollback/recovery/restart, scene/current-map/blackout cues, unfocused shortcut suppression, typing/canvas behavior, 12-pad responsive phone view and public privacy. Evidence: latest successful `artifacts/e2e/2026-10-30T03-15-06.765Z-f69ddeda/`. |
| `npm run package:smoke` | **Passed on Windows x64** | Packaged backend authentication, SQLite persistence/restart, public allowlist and blackout behavior. Forge emitted a non-fatal Node shell-argument deprecation warning. |
| Windows audio decode | **Verified for generated WAV in Electron E2E** | Browser state confirms decode/start/loop/stop behavior; it does not prove physical speakers emitted audible output. |
| MP3/Ogg, physical speaker/audio-device routing, macOS | **Unverified** | Candidate formats are accepted only when the installed runtime decodes them; no macOS or hardware output test was run. |

Phase 4 implements AUD-01 and AUD-02 without new dependencies or global OS shortcuts. Audio assets, banks, shortcuts and controls remain DM-private. Follow [Phase 4 audio guide](phase-4-audio.md); physical audio output and unsupported codecs remain explicit manual limits.
