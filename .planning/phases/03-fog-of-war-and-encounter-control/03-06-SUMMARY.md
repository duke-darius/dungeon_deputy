---
phase: 03-fog-of-war-and-encounter-control
plan: 06
subsystem: ui-api
tags: [pixi, react, aspnet, sqlite, fog-of-war, encounter]
requires:
  - phase: 03-fog-of-war-and-encounter-control
    provides: Persisted sanitized map raster, encounter state, authenticated mutations, and public-safe display projection
provides:
  - Generation-guarded Pixi redraws and pointercancel cleanup without stroke submission
  - Authenticated atomic full-list initiative reorder with validated exact actor membership
  - Independent nullable current/max HP through editor, API, and SQLite JSON persistence
affects: [encounter-editor, map-canvas, phase-03-verification]
actuals:
  tokens: 9123
  tasks: 2
  commits: 4
commits: 4
plan_head_before: 304a968e900ba4d18841df2e50a752ab51efc2be
plan_head_after: ffd59accd8272d608356f1739c53f0d0b7dc06a1
tech-stack:
  added: []
  patterns: [monotonic async redraw generation, full-set transactional reorder, independently nullable HP]
key-files:
  created: [src/renderer/src/MapEditor.test.mjs]
  modified: [src/renderer/src/map/MapCanvas.tsx, src/renderer/src/map/canvasPolicy.mjs, src/renderer/src/map/canvasPolicy.d.mts, src/renderer/src/map/MapCanvas.lifecycle.test.mjs, src/renderer/src/map/MapEditor.tsx, src/renderer/src/api.ts, src/backend/Encounters/EncounterService.cs, src/backend/Program.cs, src/backend.tests/EncounterApiTests.cs, src/backend.tests/EncounterServiceTests.cs, .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md]
key-decisions:
  - "Initiative reordering accepts a complete ordered actor ID list, requiring exact membership and uniqueness before writing any tie-break positions."
  - "Unset current and maximum HP are independently represented by null; comparison is enforced only when both are set."
requirements-completed: [ENCT-01, ENCT-02, ENCT-03]
coverage:
  - id: D1
    description: Stale asynchronous canvas redraw work is ignored and pointercancel destroys the preview without submitting a stroke.
    requirement: ENCT-01
    verification:
      - kind: unit
        ref: node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: false
  - id: D2
    description: Initiative reorder is authenticated, exact-set validated and transactional; blank HP persists independently as null.
    requirement: ENCT-02
    verification:
      - kind: integration
        ref: dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
        status: pass
      - kind: unit
        ref: npm test (32 Node tests and 20 xUnit tests)
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-10-29
status: complete
---

# Phase 03 Plan 06: Canvas Lifecycle and Encounter Control Summary

**Pixi redraw generations reject stale texture completions, initiative tie movement is a single atomic authenticated reorder, and blank HP values stay independently null through SQLite persistence.**

## Performance

- **Duration:** 10 min (approximate)
- **Started:** 2026-10-29T20:50:00Z
- **Completed:** 2026-10-29T21:00:49Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added a monotonically increasing redraw generation and freshness guards after texture awaits and before adding sprites or applying camera state.
- Routed pointercancel through shared cancellation cleanup, detached/destroyed preview graphics, reset gesture state, and discarded stamps without invoking onStroke.
- Replaced two-request tie swaps with authenticated POST /api/encounter/initiative/order. The service validates the complete unique actor set and bounded list size before one transaction; rejected input leaves stored order unchanged.
- Updated editor/API to submit one reorder request and consume the authoritative actor response.
- Kept blank current and maximum HP independently null in UI serialization, API validation, and SQLite JSON persistence.
- Updated 03-06 validation rows for wave 6 with separate commands, failure conditions, and pending status as required.

## Task Commits

1. Task 1 RED tests — f89e866 (test).
2. Task 1 implementation — 7c6018e (fix).
3. Task 1 preview-removal follow-up — ffba0cf (fix).
4. Task 2 implementation and tests — ffd59ac (feat).

Plan metadata: pending final documentation commit.

## Files Created/Modified

- src/renderer/src/map/MapCanvas.tsx, canvasPolicy.mjs, canvasPolicy.d.mts, MapCanvas.lifecycle.test.mjs — guarded redraw and explicit cancellation cleanup.
- src/renderer/src/map/MapEditor.tsx, src/renderer/src/api.ts, src/renderer/src/MapEditor.test.mjs — authoritative one-call reorder, null HP serialization, and regressions.
- src/backend/Encounters/EncounterService.cs, src/backend/Program.cs — atomic reorder endpoint and nullable HP validation/persistence.
- src/backend.tests/EncounterApiTests.cs, src/backend.tests/EncounterServiceTests.cs — authentication, invalid-order no-mutation, and nullable persistence coverage.
- .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md — pending 03-06 wave-6 evidence rows.

## Decisions Made

- A reorder payload must contain every current actor exactly once; array positions become unique bounded tie-break positions in one atomic write.
- HP values are independently optional; current <= maximum applies only when both are non-null.
- Public raster boundary is unchanged: sanitized imageData, no source import in PublicDisplay, black cold start, and existing polling/window behavior remain as established by Plan 03-05.

## Deviations from Plan

### TDD sequencing note

Task 1 followed RED then GREEN: f89e866 recorded two behavior failures, followed by implementation commits 7c6018e and ffba0cf. Task 2 implementation and regression tests were not separated into a pre-implementation RED commit; tests were added alongside implementation and passed during verification. This TDD sequencing deviation did not skip behaviors or coverage.

Total deviations: 1 process deviation. No package installs or public raster changes.

## Issues Encountered

- Initial backend run exposed an unauthenticated test client without a usable base address and a service test expectation inconsistent with explicit ordering. The test was corrected to use the factory client and assert expected ordering; subsequent runs passed.
- Initial renderer build exposed stale .d.mts declarations for lifecycle helpers; declarations were updated and production build passed.

## Verification

- node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs — passed, 10 tests.
- dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release — passed, 20 tests.
- npm test — passed, 32 Node tests and 20 xUnit tests.
- npm run build — passed; TypeScript, Electron, Vite, and .NET backend production build succeeded.
- Validation matrix rows remain pending by plan instruction; rows were not relabeled pass.

## Known Stubs

None.

## Next Phase Readiness

WR-01 through WR-04 are implemented and covered. Review updated wave-6 validation rows during phase verification. Plan 03-05 sanitized public image boundary and window/polling behavior were left untouched.

## TDD Gate Compliance

- Task 1: RED regression-test commit precedes implementation; lifecycle suite passed afterward.
- Task 2: RED commit missing; implementation and tests were committed together. Documented above for review.

## Self-Check: PASSED

- Task commits f89e866, 7c6018e, ffba0cf, and ffd59ac are ancestors of HEAD.
- All task implementation and test files are present.

---
*Phase: 03-fog-of-war-and-encounter-control*
*Completed: 2026-10-29*
