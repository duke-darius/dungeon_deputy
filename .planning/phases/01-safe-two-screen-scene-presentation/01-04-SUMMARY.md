---
phase: 01-safe-two-screen-scene-presentation
plan: 04
subsystem: desktop-shell
tags: [electron, forge, ipc, kestrel, dotnet, displays]
requires:
  - phase: 01-safe-two-screen-scene-presentation
    provides: React DM and public renderers, scene contracts, local presentation API
provides:
  - Electron-managed self-contained backend and isolated DM/public windows
  - Main-process-only authenticated backend communication with role-limited IPC
  - Validated preferences and hot-plug safe display fallback
  - Forge packaging and Windows resource/backend smoke validation
affects: [01-05, packaging, desktop-security]
actuals:
  tokens: 6931
  tasks: 2
  commits: 3
commits: 3
plan_head_before: 2d0bd932d07b6c34f2816aa2ab4038d3c02ae06b
plan_head_after: 024f29cc9b1a382e3ec7251970cb65cdf5212f31
tech-stack:
  added: []
  patterns: [sender-validated IPC, per-run backend bearer token, Electron Forge extra resources]
key-files:
  created: [src/main.ts, src/preload.ts, forge.config.ts, scripts/package-smoke.mjs, scripts/dev.mjs]
  modified: [package.json, src/backend/Program.cs, src/renderer/src/api.ts, src/renderer/src/App.tsx]
key-decisions:
  - "Renderer API access is mediated through narrow IPC; backend commands require a random per-run token."
  - "Public window exposes only public-presentation retrieval; DM-only commands are withheld from its bridge."
  - "Invalid or lost display assignments fall back to a movable, windowed player preview, never the DM dashboard."
patterns-established:
  - "Electron main owns backend lifecycle, display enumeration, window placement, and all private HTTP calls."
  - "Forge resources retain RID-qualified backend and renderer distribution directories under process.resourcesPath."
requirements-completed: [DISP-01, DISP-02, DISP-04, DISP-05]
coverage:
  - id: D1
    description: "Authenticated main-process IPC separates DM controls from public presentation retrieval."
    requirement: DISP-01
    verification:
      - kind: unit
        ref: src/main.test.mjs#public preload exposes only public presentation retrieval
        status: pass
      - kind: integration
        ref: npm test (backend integration tests)
        status: pass
    human_judgment: false
  - id: D2
    description: "Validated display preferences recover to a safe windowed public preview after topology changes."
    requirement: DISP-02
    verification:
      - kind: unit
        ref: src/main.test.mjs#main owns Electron display and backend lifecycle securely
        status: pass
    human_judgment: true
    rationale: "Physical display hot-plug behavior and visual separation need manual multi-monitor confirmation."
  - id: D3
    description: "Windows Forge package contains renderer scenes and a self-contained backend that starts with token enforcement."
    verification:
      - kind: integration
        ref: npm run package:smoke
        status: pass
    human_judgment: false
  - id: D4
    description: "macOS x64 and arm64 self-contained backend outputs and ZIP packages are configured."
    verification: []
    human_judgment: true
    rationale: "macOS packaging and runtime cannot be physically verified on this Windows host."
duration: 9min
completed: 2026-10-28
status: complete
---

# Phase 1 Plan 4: Desktop Shell and Packaging Summary

**Electron now owns the two-window lifecycle, token-authenticated loopback backend, validated display recovery, and Forge packaging with offline scene/backend resources.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-28T11:44:00Z (approximate)
- **Completed:** 2026-10-28T11:53:02Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added secure Electron main/preload wiring with sandbox, context isolation, disabled Node integration, URL restrictions, sender checks, and role-limited IPC.
- Main process starts, readiness-checks, and owns the shutdown of a self-contained .NET backend on loopback; a cryptographically random token protects all non-health endpoints.
- Added persisted preference validation, display enumeration, safe single-display preview, and revalidation on display hot-plug/metric events.
- Configured Electron Forge Squirrel.Windows and ZIP/Darwin packaging; emitted Electron JS explicitly and added cross-platform RID publish, dev supervision, and package smoke scripts.
- Windows package smoke verified the assembled app includes renderer scenes and RID backend; the published packaged backend starts and rejects unauthenticated API requests.

## Task Commits

1. **Task 1: Wire secure Electron windows and owned backend lifecycle** - `5122a65` (feat)
2. **Task 2: Implement display topology, preferences, and Forge resource packaging** - `755e17d` (build)
3. **Task 2 follow-up: Resolve assembled Forge resource paths** - `024f29c` (fix)

## Files Created/Modified

- `src/main.ts`, `src/preload.ts` - Electron lifecycle, windows, IPC authorization, backend process and preferences.
- `forge.config.ts`, `tsconfig.electron.json` - Forge makers/resources and emitted main/preload JavaScript.
- `scripts/package-backend.mjs`, `scripts/package-smoke.mjs`, `scripts/dev.mjs` - RID publishing and no-extra-dependency process/package checks.
- `src/main.test.mjs` - Electron security/lifecycle boundary checks.
- `src/backend/Program.cs`, `src/backend.tests/PresentationStateTests.cs` - Token middleware and authenticated integration test setup.
- `src/renderer/src/api.ts`, `src/renderer/src/App.tsx`, `src/renderer/index.html`, `src/renderer/public.html` - IPC client/display selector and restrictive CSP.
- `package.json` - build, test, dev, package and start commands.

## Decisions Made

- Renderer-to-backend HTTP was replaced with main-process fetches and sender-checked IPC to remove CORS and renderer access to the private API.
- The public bridge is purpose-limited to presentation retrieval; DM command/preferences/display capabilities are not exposed there.
- Display assignment fallback is windowed and movable; public output starts black and no fallback moves it onto DM content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical security] Closed renderer-to-private-backend access with IPC and a per-run token**
- **Found during:** Task 1
- **Issue:** The existing renderer called backend HTTP directly, exposing private controls/state to renderer-origin requests without authentication.
- **Fix:** Main-process fetch mediation, sender-validated DM/public IPC handlers, role-limited preload bridge, and constant-time token middleware. Updated the backend integration test client accordingly.
- **Files modified:** `src/main.ts`, `src/preload.ts`, `src/renderer/src/api.ts`, `src/backend/Program.cs`, `src/backend.tests/PresentationStateTests.cs`
- **Verification:** `npm test`, `npm run build`, and package smoke token rejection/acceptance checks passed.
- **Committed in:** `5122a65`

**2. [Rule 1 - Packaging path bug] Matched runtime lookup to Forge's actual resource layout**
- **Found during:** Task 2
- **Issue:** Forge preserves extra-resource directory names (`backend-win-x64` and `dist`), not the initially assumed generic `backend` and `renderer` paths.
- **Fix:** Updated app resource resolution and smoke checks to assert the actual assembled package layout and launch its backend.
- **Files modified:** `src/main.ts`, `scripts/package-smoke.mjs`
- **Verification:** `npm run package:smoke` passed on Windows.
- **Committed in:** `024f29c`

---

**Total deviations:** 2 auto-fixed (Rule 2: 1, Rule 1: 1)
**Impact on plan:** Both changes were necessary to preserve the private/public security boundary and make the packaged app launch its resources correctly. No new npm dependencies were added.

## Issues Encountered

- Forge pre-package hook did not receive target architecture as assumed; changed its validation to the current host RID and limited smoke packaging to the available host.
- The UI was not visually opened in a desktop session; no visual or physical monitor hot-plug claim is made.

## Platform Verification

- Windows x64: Forge package assembled; resource layout checked; packaged self-contained backend started and authenticated API behavior verified.
- macOS x64 and arm64: configured for RID publish and Darwin ZIP maker, but not physically verified on this Windows host.
- Physical multi-monitor placement/hot-plug: not visually verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 can use `npm run dev`, `npm run start`, `npm run package:smoke`, and the Forge `package`/`make` commands.
- Phase 1 remains incomplete until Plan 05 and end-of-phase human review; Stage 2 was not started.

## Self-Check: PASSED

- Summary exists at the required phase path.
- Task commits `5122a65`, `755e17d`, and `024f29c` are ancestors of plan head `024f29c`.
- Commits measured from plan ledger: 3; plan head before: `2d0bd932d07b6c34f2816aa2ab4038d3c02ae06b`; plan head after: `024f29cc9b1a382e3ec7251970cb65cdf5212f31`.

---
*Phase: 01-safe-two-screen-scene-presentation*
*Completed: 2026-10-28*
