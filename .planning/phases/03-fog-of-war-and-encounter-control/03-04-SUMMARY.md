---
phase: 03-fog-of-war-and-encounter-control
plan: 04
subsystem: map-visibility
tags: [fog-of-war, pixi, public-projection, http-tests]
requires:
  - phase: 03-fog-of-war-and-encounter-control
    provides: persisted fog strokes, public map allowlist, and authenticated mutation routes
provides:
  - Ordered opaque fog mask shared by DM and public renderer
  - Source-art-safe public map projection with hidden-token filtering
  - Pointer cancellation and authenticated persistence/publication coverage
affects: [03-02, 03-03]
actuals:
  tokens: 7081
  tasks: 3
  commits: 5
commits: 5
plan_head_before: 15cd3f19546e1b53d6aaeefb3e84df1619b7afb0
plan_head_after: 69a24a5b21066955fe427f106b4b76d6ccd1097d
tech-stack:
  added: []
  patterns: [deterministic pixel-center fog mask, authenticated HTTP publication lifecycle tests]
key-files:
  created: [src/renderer/src/map/fogMask.mjs, src/renderer/src/map/fogMask.d.mts, src/renderer/src/map/fogMask.test.mjs]
  modified: [src/renderer/src/map/MapCanvas.tsx, src/renderer/src/map/MapCanvas.lifecycle.test.mjs, src/renderer/src/map/canvasPolicy.mjs, src/renderer/src/PublicDisplay.tsx, src/renderer/src/contracts.mjs, src/renderer/src/contracts.d.mts, src/backend/Maps/MapService.cs, src/backend.tests/MapApiTests.cs, .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md, scripts/e2e.mjs]
key-decisions:
  - "Mask each pixel by its center and apply reveal/hide operations in persisted order; black opaque is the initial state."
  - "Public fog DTO carries only the allowlisted built-in asset identifier, filtered visual strokes, and visible tokens."
patterns-established:
  - "Fog alpha mask is a pure bounded rasterization shared by private and public renderers."
  - "Persist map changes before mutating active public presentation; exercise failures through real HTTP and SQLite."
requirements-completed: [ENCT-01, ENCT-03]
coverage:
  - id: D1
    description: Ordered mask reveals source art and later Hide operations re-cover it on both displays.
    requirement: ENCT-01
    verification:
      - kind: unit
        ref: src/renderer/src/map/fogMask.test.mjs
        status: pass
      - kind: unit
        ref: src/renderer/src/contracts.test.mjs#public map keeps approved source asset and ordered operations
        status: pass
    human_judgment: false
  - id: D2
    description: Authenticated fog API preserves black cold start and does not publish when SQLite persistence fails.
    requirement: ENCT-03
    verification:
      - kind: integration
        ref: src/backend.tests/MapApiTests.cs#AuthenticatedHttpMapShowKeepsColdStartBlackAndPublishesOnlyAfterPersistedFogUpdate
        status: pass
    human_judgment: false
  - id: D3
    description: Brush cancellation, outside-up, tool changes, and save failure clear gesture state without affecting map interactions.
    requirement: ENCT-01
    verification:
      - kind: unit
        ref: src/renderer/src/map/MapCanvas.lifecycle.test.mjs
        status: pass
    human_judgment: false
metrics:
  duration: 24m
  completed_date: 2026-10-29
  commits: 5
status: complete
---

# Phase 03 Plan 04: Ordered Fog Mask and Safe Publication Summary

**Deterministic opaque masks reveal only approved terrain pixels, while authenticated fog persistence and brush lifecycle tests protect public presentation.**

## Performance

- **Duration:** approximately 24 minutes
- **Started:** 2026-10-29
- **Completed:** 2026-10-29
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Added dependency-free raster mask generation using pixel-center circle inclusion; persisted reveal/hide ordering deterministically re-covers terrain.
- Rendered map art beneath the fog mask in DM and public displays, retained only allowlisted source art and ordered fog strokes in public projection, and kept hidden tokens filtered.
- Covered pointer cancel/upoutside, brush switching and API failure cleanup; added actual authenticated HTTP checks for missing/invalid tokens, black cold start, explicit Show, SQLite persistence failure, and publication after success.

## Task Commits

1. **Task 1: Render DM terrain through a deterministic ordered fog mask** - `69a5749`.
2. **Task 2: Mask public source art and enforce token and brush lifecycle visibility** - `91ed65b`.
3. **Task 3: Prove authenticated persistence-before-publication and record closure coverage** - `27a564a`.
4. **Task 2 follow-up: reset brush after terminal gestures** - `b72ac12`.
5. **E2E selector alignment** - `69a24a5`.

The five commits are measured from `15cd3f19546e1b53d6aaeefb3e84df1619b7afb0` through `69a24a5b21066955fe427f106b4b76d6ccd1097d`.

## Files Created/Modified

- `src/renderer/src/map/fogMask.mjs`, `.d.mts`, `.test.mjs` - deterministic opaque alpha mask and pixel assertions.
- `src/renderer/src/map/MapCanvas.tsx`, `canvasPolicy.mjs`, `MapCanvas.lifecycle.test.mjs` - DM mask rendering and gesture lifecycle handling.
- `src/renderer/src/PublicDisplay.tsx`, `contracts.mjs`, `contracts.d.mts`, `contracts.test.mjs`, `public.css` - strict public mask rendering and DTO validation.
- `src/backend/Maps/MapService.cs`, `src/backend.tests/MapApiTests.cs` - filtered source art and authenticated persistence/publication integration coverage.
- `.planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md` - task-specific verification matrix and executed statuses.
- `scripts/e2e.mjs` - updated stale Show encounter selectors to the current UI label.

## Decisions Made

- Fog is a pure alpha mask rasterized with pixel-center circle inclusion; reveal/hide operations apply in saved array order.
- Public DTO only carries a built-in map asset identifier and vetted strokes; hidden tokens and private encounter fields remain excluded.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced stale public-image suppression and corrected E2E UI selector**
- **Found during:** Tasks 2 and 3.
- **Issue:** The existing projection blanked source art when fog was enabled, and existing Phase 2 E2E selectors used an obsolete button label, so the existing E2E did not complete.
- **Fix:** Retained the allowlisted `tavern.svg` key behind the public opaque mask and aligned the E2E click selectors with the existing “Show encounter” control.
- **Files modified:** `src/backend/Maps/MapService.cs`, `scripts/e2e.mjs`.
- **Verification:** Renderer contract tests, backend integration tests, and `npm run test:e2e` passed.
- **Committed in:** `91ed65b`, `69a24a5`.

**2. [Rule 3 - Blocking] Added missing Pixi cancellation lifecycle registration**
- **Found during:** Task 2.
- **Issue:** Pointer lifecycle helper did not register or remove `pointercancel`, and brush-mode changes were omitted from redraw dependencies.
- **Fix:** Added symmetric event registration/removal, cancellation cleanup, and brush-mode redraw cleanup.
- **Files modified:** `src/renderer/src/map/canvasPolicy.mjs`, `src/renderer/src/map/MapCanvas.tsx`.
- **Verification:** `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs`; production build passed.
- **Committed in:** `91ed65b`, `b72ac12`.

### TDD Gate Compliance

The plan's TDD-tagged tasks have focused passing behavior tests, but the execution did not produce separate RED-evidence/test commits before GREEN implementation commits. This is a process deviation; no RED evidence is claimed. Focused renderer and backend tests were run after implementation and all passed.

**Total deviations:** 2 auto-fixed plus TDD sequencing deviation.
**Impact on plan:** All three behavior objectives are implemented and validated. No packages were installed and no new runtime dependency was introduced.

## Verification

- `node --test src/renderer/src/map/fogMask.test.mjs` - passed (2 tests).
- `node --test src/renderer/src/contracts.test.mjs` - passed (7 tests).
- `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs` - passed (8 tests).
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` - passed (16 tests).
- `npm run build` - passed (TypeScript, Electron, Vite, backend).
- `npm test` - passed (29 Node tests and 16 xUnit tests).
- `npm run test:e2e` - passed after the existing selector was aligned to “Show encounter”.

## Issues Encountered

- Initial E2E run timed out on the stale `Show on table` selector. Updated both map-show references to the current UI control and reran successfully.

## User Setup Required

None.

## Next Phase Readiness

- Fog rendering and public publication lifecycle are covered for Plans 03-02/03-03.
- Phase validation remains globally incomplete: other phase tasks and the Phase 3 integrated fog E2E flow remain owned by the other plans.
- `.planning/STATE.md` and `.planning/state.json` had pre-existing orchestrator modifications at execution start; `.idea/` and `tabletop_dm_gsd_brief.md` were left untouched.

---
*Phase: 03-fog-of-war-and-encounter-control*
*Completed: 2026-10-29*

## Self-Check: PASSED

- Summary, validation matrix, and new mask artifacts exist.
- All five plan commits are ancestors of the current HEAD.
- Pre-existing `.planning/STATE.md`, `.planning/state.json`, `.idea/`, and `tabletop_dm_gsd_brief.md` changes were preserved.
