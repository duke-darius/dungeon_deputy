---
phase: 02-playable-digital-battle-map
plan: 03
subsystem: map-editor
tags: [pixijs, sqlite, react, aspnet, svg, map-tokens]
requires:
  - phase: 02-playable-digital-battle-map
    provides: Private/approved map persistence, loopback token-auth API, Pixi canvas foundation
provides:
  - Validated persisted token add/edit/remove commands
  - Taverns token editor, local hero/goblin artwork, and pointer lifecycle regression tests
affects: [phase-02-demo-docs, phase-02-map]
actuals:
  tokens: 7685
  tasks: 2
  commits: 2
commits: 2
plan_head_before: c30acccdae87e5b0cd7a46f5b3d5e326b1c511df
plan_head_after: 2f0e7d7db90ed7ca2dad3c2687fafc9421c288f4
tech-stack:
  added: []
  patterns: [token API validates bundled artwork IDs, pointer lifecycle policy tested through MapCanvas wiring]
key-files:
  created: [assets/tokens/hero.svg, assets/tokens/goblin.svg, src/renderer/src/map/canvasPolicy.mjs, src/renderer/src/map/MapCanvas.lifecycle.test.mjs]
  modified: [src/backend/Maps/MapService.cs, src/backend/Program.cs, src/backend.tests/MapApiTests.cs, src/renderer/src/map/MapEditor.tsx, src/renderer/src/map/MapCanvas.tsx, src/renderer/src/map/types.ts, assets/maps/tavern.svg]
key-decisions:
  - "Keep draft token mutations behind authenticated routes and preserve the independent approved snapshot."
  - "Use only locally bundled hero/goblin artwork identifiers; add no npm dependency."
requirements-completed: [MAP-02, MAP-03]
coverage:
  - id: D1
    description: DM token CRUD and token properties persist in the private SQLite-backed draft.
    requirement: MAP-02
    verification:
      - kind: integration
        ref: dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
        status: pass
    human_judgment: false
  - id: D2
    description: Pixi lifecycle and pointerupoutside behavior are covered by dependency-free tests.
    requirement: MAP-02
    verification:
      - kind: unit
        ref: node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs
        status: pass
    human_judgment: false
metrics:
  duration: 8min
  completed: 2026-10-28
status: complete
---

# Phase 2 Plan 3: Playable Digital Battle Map Summary

**Validated token editing in the private tavern draft with persisted commands, original offline token art, and pointer-up-outside drag commits.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-28 (execution start time was not separately captured)
- **Completed:** 2026-10-28T15:56:32Z
- **Tasks:** 2
- **Files modified/created:** 12

## Accomplishments
- Added validated backend commands for adding, editing, and removing bounded map tokens, retaining transactional persistence and separate draft/approved state.
- Added an inspector and token tray for adding heroes/monsters, selecting tokens, changing name/color/artwork, and removal. Token drag writes one backend mutation on release, including `pointerupoutside`.
- Added original tavern, hero, and goblin SVG artwork with embedded CC0 rights/source comments. No package added.
- Added dependency-free lifecycle/pointer tests for async unmount, remount/cleanup, outside release, and pan/zoom coordinate inversion.

## Frontend Design: Two-Pass Contract

**Pass 1 proposal:** Palette: command ink `#202523`, slate `#344247`, chalk `#e8e0d1`, oxidized teal `#4d837d`, brass `#b58d51`, and restrained goblin moss `#718b68`. Typography: existing system sans for controls and Georgia for scene titles, with all labels left-aligned. Layout: narrow scene rail, broad map canvas and toolbar, compact token inspector at right, token tray below.

```text
┌────────────┬───────────────────────────────────────┬──────────────┐
│ Scenes     │ Save / grid / scale                   │ Table state  │
│            │                                       │ Token fields │
│            │          TACTILE MAP                  │ Name / color │
│            │                                       │ Artwork      │
│            │ Token tray · add hero · add monster   │ Remove       │
└────────────┴───────────────────────────────────────┴──────────────┘
```

**Pass 2 critique and revision:** Rejected generic cream-and-serif as incompatible with the Stage 1 command desk; rejected all-dark neon as synthetic and unlike the established oxidized-teal/brass identity; rejected card-grid chrome because the map itself should be the focal surface. Kept the constrained inherited palette, left-aligned labels, quiet rails, and no gradients/new fonts. The moss is used only as a token/art accent rather than a new interface color system.

## Task Commits

1. **Task 1: Implement tested token and approval state transitions** — `77a961b` (`feat`)
2. **Task 2: Expose the seven-token tavern editor and token inspector** — `2f0e7d7` (`feat`)

**Plan metadata:** pending SDK metadata commit.

## Verification

- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` — passed (10 tests).
- `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs` — passed (4 tests).
- `npm test` — passed (12 discovered Node tests and 10 backend tests). **Important:** the current script does not include nested `src/renderer/src/map` tests; the lifecycle file was run separately as shown above. It is not claimed as part of `npm test`.
- `npm run build` — passed; Vite output includes the packaged renderer assets and backend build completed with 0 warnings/errors.

## TDD Gate Compliance

The plan task specified TDD. The backend transition test was added alongside the implementation rather than committed as a pre-implementation RED test, and the lifecycle suite's initial failure was a mistaken destroy-count expectation, not a behavioral RED. Therefore a valid semantic RED commit/evidence was not produced; this is a documented TDD discipline deviation, not a claim of RED/GREEN sequence compliance. All final target tests pass.

## Decisions Made

- API token mutations operate only on the private draft. Existing public approval snapshots are untouched until an explicit publication action.
- Art is selected by two approved local keys (`hero.svg`, `goblin.svg`), never arbitrary paths.
- The app's existing fullscreen display remains untouched; no toggle or realtime transport was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pointer-up-outside previously discarded token movement**
- **Found during:** Task 2
- **Issue:** Existing outside-release handler nulled the drag without persisting final coordinates.
- **Fix:** Route both release events through the same final-position commit callback.
- **Files modified:** `src/renderer/src/map/MapCanvas.tsx`, `src/renderer/src/map/canvasPolicy.mjs`
- **Verification:** Lifecycle test dispatches `pointerupoutside` and asserts commit callback receives the final pointer position.
- **Committed in:** `2f0e7d7`

**2. [TDD process deviation] RED-first commits were not completed**
- **Found during:** Tasks 1-2
- **Issue:** Tests were not recorded in dedicated failing-test commits with accepted semantic RED evidence.
- **Resolution:** Final backend and renderer tests are passing; this procedural deviation remains disclosed.
- **Impact:** No feature behavior omitted; history does not establish a canonical RED/GREEN sequence.

---

**Total deviations:** 1 correctness auto-fix; 1 process deviation.
**Impact on plan:** Scope stayed within token editing and its canvas lifecycle; no SignalR, Stage 3 behavior, packages, or publication-window changes.

## Known Stubs

None identified in the files changed by this plan.

## Next Phase Readiness

Plan 02-03 is complete. Do not infer that nested map tests are covered by `npm test` until Plan 02-04 updates its glob. No Plan 02-04 or 02-05 work was started.

---
*Phase: 02-playable-digital-battle-map*
*Completed: 2026-10-28*

## Self-Check: PASSED

- Summary and all listed artwork/test deliverables exist.
- Task commits `77a961b` and `2f0e7d7` are ancestors of HEAD.
