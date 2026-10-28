---
phase: 02-playable-digital-battle-map
plan: 02
subsystem: map-editor
tags: [pixijs, sqlite, electron, react, map-editor]
requires:
  - phase: 02-playable-digital-battle-map
    provides: Approved PixiJS 8.22.0 and existing authenticated loopback Electron/backend path
provides:
  - Private tavern/blank map editor with PixiJS camera and grid controls
  - SQLite draft and independent approved-map persistence with seven seeded actors
  - Canonical per-user Electron data directory passed to the backend
affects: [phase-02-map-token-interactions, map-api, presentation]
actuals:
  tokens: 10233
  tasks: 3
  commits: 4
commits: 4
plan_head_before: bfccba0eae668da3a72af4a90269a37eba84e615
plan_head_after: e8a16f2103a4568d8831c33f5f4c91fd8abc3a53
tech-stack:
  added: [Microsoft.Data.Sqlite 10.0.14]
  patterns: [Parameter-bound direct SQL, database-backed draft/public snapshot separation, React-owned asynchronous Pixi canvas]
key-files:
  created: [src/backend/Maps/MapService.cs, src/backend.tests/MapApiTests.cs, src/renderer/src/map/MapCanvas.tsx, src/renderer/src/map/MapEditor.tsx, src/renderer/src/map/camera.mjs, assets/maps/tavern.svg]
  modified: [src/backend/Program.cs, src/main.ts, src/main.test.mjs, src/renderer/src/App.tsx, src/renderer/src/styles.css]
key-decisions:
  - "Persist editable draft and approved map projections in separate SQLite tables; draft writes cannot change the approved snapshot."
  - "Use only the per-user Electron data folder and fail backend startup with actionable guidance when absent."
  - "Do not expose a public map approval control in this tracer; publication remains a distinct backend operation."
patterns-established:
  - "Map tokens use map-space coordinates; camera transforms stay independent of viewport size."
  - "All map routes pass through the existing per-run token middleware and sender-checked Electron bridge."
requirements-completed: [MAP-01, MAP-03]
coverage:
  - id: D1
    description: "Open a persisted tavern or blank map draft with seven demo actors and save it to per-user SQLite."
    requirement: MAP-01
    verification:
      - kind: integration
        ref: "src/backend.tests/MapApiTests.cs#DraftAndApprovedSnapshotRemainIndependentAcrossDatabaseReopen"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Canvas interaction and map editor usability need visual review."
  - id: D2
    description: "Map camera coordinate conversion, cursor-anchored zoom, and zoom limits are covered by deterministic tests."
    requirement: MAP-01
    verification:
      - kind: unit
        ref: "src/main.test.mjs#map camera coordinates invert under pan and zoom"
        status: pass
      - kind: unit
        ref: "src/main.test.mjs#cursor anchored zoom preserves its map coordinate and clamps"
        status: pass
    human_judgment: false
  - id: D3
    description: "Draft persistence and separately stored approved snapshot survive a database reopen without draft edits publishing."
    requirement: MAP-03
    verification:
      - kind: integration
        ref: "src/backend.tests/MapApiTests.cs#DraftAndApprovedSnapshotRemainIndependentAcrossDatabaseReopen"
        status: pass
    human_judgment: false
duration: 14min
completed: 2026-10-28
status: complete
---

# Phase 2 Plan 2: Private Map Editor Summary

**PixiJS map editing backed by authenticated per-user SQLite, with durable draft state kept independent from the approved snapshot.**

## Performance

- **Duration:** approximately 14 minutes
- **Started:** 2026-10-28T15:35:00Z
- **Completed:** 2026-10-28T15:49:19Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments

- Replaced the DM scene desk with a Stage 2 private editor: tavern art, blank map action, grid toggle/scale, Pixi canvas pan/zoom, seven demo tokens, save, and reload.
- Added validated direct-SQL SQLite persistence, separate `map_draft` and `approved_map` records, and restart round-trip coverage.
- Electron now resolves and passes its per-user data directory into the owned backend while retaining loopback and per-run authentication boundaries.

## Task Commits

1. **Task 1: Trace persisted tavern map editing from DM action through SQLite** - `4290f6d` (feat)
2. **Task 2: Test and constrain map scale and camera transforms** - `71caadf` (test)
3. **Task 3: Pass the per-user data directory into the owned backend** - `0eb367f` (fix)
4. **Correctness hardening:** eager storage-path startup check and stricter DTO validation - `e8a16f2` (fix)

## Files Created/Modified

- `src/backend/Maps/MapService.cs` - SQLite schema, idempotent seed, parameterized draft save/load, separate public snapshot.
- `src/backend/Program.cs` - startup data-directory validation and authenticated map API.
- `src/backend.tests/MapApiTests.cs` - seed, validation, draft/public independence, and database reopen tests.
- `src/renderer/src/map/MapCanvas.tsx` - async Pixi lifecycle, drawing, grid, pan/zoom, token movement.
- `src/renderer/src/map/MapEditor.tsx` - private map editor and persistence controls.
- `src/renderer/src/map/camera.mjs` - pure coordinate and zoom functions.
- `src/renderer/src/map/types.ts` - map/token transport types.
- `src/main.ts`, `src/preload.cts`, `src/renderer/src/api.ts` - owned process storage path and narrowly allowed map routes/body bridge.
- `src/renderer/src/App.tsx`, `src/renderer/src/styles.css` - Stage 2 map-focused command desk.
- `assets/maps/tavern.svg` - bundled offline original tavern art with XML license attribution.

## Decisions Made

- Draft and approved public state live in independent SQLite tables; only an explicit backend publication operation copies draft to approved state.
- The renderer cannot select filesystem paths; Electron is the source of the user-data directory.
- No SignalR, realtime updates, public map approval UI, or player-window recreation/toggling was added.
- Design direction continued the slate/ink, oxidized green, and brass Stage 1 palette with the map canvas as the main visual surface; critique removed dashboard-card treatment and retained compact side rails and controls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical validation] Hardened map DTO validation and made data-path enforcement eager**
- **Found during:** Task 1 (map backend integration)
- **Issue:** Malformed token colors/duplicate IDs and missing storage configuration could bypass planned correctness boundaries or defer failure until the first map request.
- **Fix:** Validate finite bounded coordinates, hex colors, unique token IDs and field bounds; initialize/check the per-user store during backend startup.
- **Files modified:** `src/backend/Maps/MapService.cs`, `src/backend/Program.cs`, `src/backend.tests/MapApiTests.cs`, `src/backend.tests/PresentationStateTests.cs`
- **Verification:** `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release`, `npm test`, and `npm run build` passed.
- **Committed in:** `e8a16f2`

**2. [Rule 3 - Blocking integration] Added JSON body forwarding to the existing sender-checked IPC command**
- **Found during:** Task 1 (map API wiring)
- **Issue:** The existing IPC bridge only carried route and verb, so the renderer could not save map DTOs.
- **Fix:** Forward optional JSON body through the existing authenticated command route and allow only fixed map paths/verbs.
- **Files modified:** `src/main.ts`, `src/preload.cts`, `src/renderer/src/api.ts`
- **Verification:** `npm test` and `npm run build` passed.
- **Committed in:** `4290f6d`

---

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 3)
**Impact on plan:** Required to meet validation and end-to-end save requirements; no additional dependencies or later-phase scope were added.

## TDD Gate Compliance

The implementation and tests pass, but the canonical RED → GREEN sequence was not recorded: no pre-implementation failing-test commit or machine-validated RED evidence exists. The test commits in this plan are post-implementation verification, not RED evidence. This is a process deviation; no evidence was fabricated.

## Issues Encountered

- PixiJS documentation lookup was unavailable because Context7 reported quota exhaustion. Installed PixiJS v8.22.0 package declarations were inspected directly to resolve the supported `Assets.load` API.
- Existing `npm test` glob excludes nested map test suites as noted in the execution brief; map persistence coverage ran through the existing .NET test command.

## User Setup Required

None - Electron provisions the per-user application data directory automatically.

## Next Phase Readiness

- Private map draft and SQLite persistence are available for subsequent token interaction and publication work.
- The approved-map snapshot is persisted independently, but player-display rendering/approval interaction remains outside this tracer task.
- Visual verification of the editor in Electron remains for human review.

---
*Phase: 02-playable-digital-battle-map*
*Completed: 2026-10-28*

## Self-Check: PASSED

- SUMMARY file exists at the planned path.
- Task commits `4290f6d`, `71caadf`, `0eb367f`, and `e8a16f2` are ancestors of HEAD.
