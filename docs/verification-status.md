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
| `npm test` | **Passed: 22 Node tests and 12 .NET tests** | Includes nested `src/renderer/src/map/*.test.mjs`, camelCase public projection contract, map camera/lifecycle, stable player-window regression, isolated package-smoke staging, deterministic development startup, and Pixi CSP/async cleanup regressions. |
| `npm run build` | **Passed** | TypeScript, Electron output, Vite renderer, and .NET Release backend; backend build reported 0 warnings and 0 errors. |
| `npm run package:smoke` | **Passed on Windows x64** | Stages its backend in a unique build directory (safe to run while the development backend is open), packages the app, runs the published `win-x64` backend with a temporary per-run user-data folder and unique token, exercises authenticated tavern draft Save and explicit Show, mutates draft without republishing, stops/restarts the actual packaged backend, verifies draft and approved snapshots independently restore, then explicitly Shows the edited draft. No SQL is used to fake app behavior. |
| Unauthorized map request | **Passed in package smoke** | `/api/map` without the per-run token returns HTTP 401. |
| macOS x64 / arm64 | **Unverified** | No macOS host was used. |
| Physical HDMI / external display and fullscreen behavior | **Unverified** | Automated same-window regression is covered by tests; no physical display was exercised. |

One Electron Forge Node deprecation warning about child-process shell arguments appeared during package smoke; packaging and all assertions completed successfully. No dependencies were installed for Plan 02-05. Human visual/functional acceptance remains pending; see [Phase 2 demo](phase-2-demo.md).
