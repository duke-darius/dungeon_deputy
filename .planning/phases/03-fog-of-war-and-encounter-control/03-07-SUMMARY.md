---
phase: 03-fog-of-war-and-encounter-control
plan: 07
subsystem: map-api-ui
tags: [fog-of-war, sqlite, sanitized-png, electron, playwright, accessibility]
requires:
  - phase: 03-05
    provides: sanitized PNG publication and strict public map projection
  - phase: 03-06
    provides: safe map canvas lifecycle and keyboard-responsive map editor
provides:
  - Atomic image-bearing fog enable, stroke, and token visibility commands
  - Commit-coupled map presentation refresh gated to active map mode
  - E2E hash assertions for public polls after UI mutations
  - Responsive manager window and keyboard canvas regressions
affects: [phase-03-verification, map-editor, presentation-polling]
actuals:
  tokens: 9037
  tasks: 4
   commits: 9
  plan_head_before: 37498634a5a560778556c54f2e2670094587e0a4
  plan_head_after: 0522b5e4f114f1a4fc4a797263a80ea9ede20a57
tech-stack:
  added: []
  patterns:
    - Validate and commit state plus sanitized PNG in one MapService write before refreshing active map presentation.
    - E2E logs SHA-256 digests of public imageData only; never log image payloads.
key-files:
  created: []
  modified:
    - src/backend/Maps/MapService.cs
    - src/backend/Program.cs
    - src/backend.tests/MapApiTests.cs
    - src/renderer/src/map/MapEditor.tsx
    - src/renderer/src/MapEditor.test.mjs
    - src/renderer/src/map/MapCanvas.lifecycle.test.mjs
    - src/main.ts
    - scripts/e2e.mjs
    - scripts/e2e/fixtures.mjs
    - .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md
key-decisions:
  - "Keep Show as the explicit cold-start publication path; live visual mutations never invoke a second publish request."
  - "Refresh public map state from the exact committed MapDocument, only when PresentationState is already in map mode."
patterns-established:
  - "Rasterize anticipated fog/token visual state in the manager before issuing its single mutation request."
  - "Compare every post-command public poll digest with persisted sanitized imageData and the latest player image."
requirements-completed: [ENCT-01, ENCT-03]
coverage:
  - id: D1
    description: Fog strokes, fog enable, and token visibility persist their supplied validated PNG atomically and update only active map presentation after commit.
    requirement: ENCT-01
    verification:
      - kind: integration
        ref: src/backend.tests/MapApiTests.cs#AuthenticatedHttpMapShowKeepsColdStartBlackAndPublishesOnlyAfterPersistedFogUpdate
        status: pass
      - kind: unit
        ref: "dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release"
        status: pass
    human_judgment: false
  - id: D2
    description: Manager visual mutation UI submits anticipated PNG payloads with no follow-up publish request.
    requirement: ENCT-03
    verification:
      - kind: unit
        ref: src/renderer/src/MapEditor.test.mjs#visual mutations rasterize anticipated map and send one image-bearing request
        status: pass
    human_judgment: false
  - id: D3
    description: UI-driven fog/token commands produce sanitized public polls matching persisted imageData; responsive manager screenshots and keyboard access regressions pass.
    requirement: ENCT-01
    verification:
      - kind: e2e
        ref: artifacts/e2e/2026-10-29T22-06-38.973Z-e24bef5d/
        status: pass
      - kind: unit
        ref: "npm test; npm run build"
        status: pass
    human_judgment: false
duration: 14min
completed: 2026-10-29
status: complete
commits: 5
---

# Phase 03 Plan 07: Atomic Live Fog and Visibility Summary

**Live fog and visibility commands now commit their sanitized raster and state together, then refresh only an active map presentation from that committed projection.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-10-29T21:55:39Z
- **Completed:** 2026-10-29T22:32:06Z
- **Tasks:** 4
- **Files modified:** 10 (including validation matrix)

## Accomplishments

- Fog enable, brush stroke, and token visibility endpoints require and validate supplied PNG data, persist it atomically with the state mutation, and use the committed map for active-map refresh. Failure/rejection leaves the database and presentation unchanged; cold-start remains black until explicit Show.
- Manager UI renders anticipated fog/token raster before its one mutation request and has no second Show/publish call on success.
- UI E2E executes keyboard brush and token visibility interactions, asserts the persisted raster digest for public polls after command completion, and checks the latest player image. It also captures tablet/phone manager layouts while restoring manager window dimensions and leaving the player window unchanged.
- Keyboard canvas accessibility/lifecycle and practical editor control styling assertions pass. The keyboard/accessibility implementation and responsive styles were already present in the user-authorized prior UI commit `3749863`; this plan added focused regression assertions and exercised their E2E screenshots.

## Task Commits

1. **Task 1: Atomically commit one brush stroke with its anticipated sanitized raster** - `678ec36` (feat)
2. **Task 2: Apply the same atomic visual command contract to fog enable and token visibility** - `708a039` (test)
3. **Task 3: Reproduce the UI race in E2E and register Wave 7 validation** - `280b1f6` (test)
4. **Task 4: Close keyboard access and residual map-editor UI audit findings** - `c3a43b1` (test)
5. **Task 1 verification supplement: Assert failed raster transaction is a database no-op** - `0522b5e` (test)

## Files Created/Modified

- `src/backend/Maps/MapService.cs` - atomic image-bearing command methods and validation.
- `src/backend/Program.cs` - commit-first, active-map-only projection refresh for all three mutation routes.
- `src/backend.tests/MapApiTests.cs` - supplied-raster, mode-gating, rejection, and transaction-failure coverage.
- `src/renderer/src/map/MapEditor.tsx` - anticipated raster payloads and single mutation requests.
- `src/renderer/src/MapEditor.test.mjs` - one-request raster, focus, and layout contracts.
- `src/renderer/src/map/MapCanvas.lifecycle.test.mjs` - keyboard name, bounds, and one-dab contracts.
- `src/main.ts` - E2E-only SHA-256 digest logging for presentation imageData.
- `scripts/e2e.mjs`, `scripts/e2e/fixtures.mjs` - actual UI race assertions, captured log snapshots, and responsive manager window screenshots.
- `.planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md` - Wave 7 rows and passing evidence.

## Decisions Made

- Kept explicit Show as the sole cold-start publication flow; mutation routes never publish a second time.
- Used the exact MapDocument returned by the successful service transaction as the active public projection; blackout/scene mode remains unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test bug] Corrected responsive E2E setup after blank-map scenario**
- **Found during:** Task 3
- **Issue:** The E2E attempted to select a token after intentionally replacing the current draft with an empty blank map, causing a 30-second timeout.
- **Fix:** Removed the invalid selection prerequisite; responsive assertions run against the blank map editor, and encounter controls remain reachable.
- **Files modified:** `scripts/e2e.mjs`
- **Verification:** `npm run test:e2e` passed with tablet/phone screenshots and size restoration.
- **Committed in:** `280b1f6`

**2. [Rule 1 - Test assertion] Scoped player-window size invariant to manager resize**
- **Found during:** Task 3
- **Issue:** BrowserWindow enumeration order changed and the player window could be resized by pre-existing display selection behavior, so a global launch-time size comparison was invalid.
- **Fix:** Compare player bounds immediately around each manager-only responsive resize.
- **Files modified:** `scripts/e2e.mjs`
- **Verification:** `npm run test:e2e` passed; player bounds remained stable during each manager resize.
- **Committed in:** `280b1f6`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 test fixes). **Impact:** Both fixed test assumptions discovered during full E2E iteration; implementation scope remained unchanged.

## Issues Encountered

- Initial focused tests caught static-call compilation and test-fixture PNG issues; corrected before commits and the full Release suite passed.
- TDD tasks were implemented and verified, but a dedicated failing RED test commit/evidence record was not produced before the implementation commit. This is recorded as a TDD workflow shortfall; plan-level runtime TDD gate was disabled (`tdd_mode: false`).

## TDD Gate Compliance

- Plan type is `execute`, not `tdd`, and configured `tdd_mode` was false.
- Task flags requested TDD, but the required RED → GREEN commit ordering/evidence was not followed. This remains a process deviation; tests pass, but this plan does not claim canonical TDD gate compliance.

## Verification

- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` - passed, 20 tests.
- `npm test` - passed, 39 Node tests and 20 xUnit tests.
- `npm run build` - passed, including production renderer/Electron and .NET Release build (0 warnings, 0 errors).
- `npm run test:e2e` - passed; evidence/screenshots: `artifacts/e2e/2026-10-29T22-06-38.973Z-e24bef5d/`.
- Final authorized rerun: `npm test` passed (40 Node tests + 20 xUnit tests); `npm run build` passed (0 backend warnings/errors); `npm run test:e2e` passed with evidence at `artifacts/e2e/2026-10-29T22-31-44.927Z-72813109/`. Public presentation hashes synchronized after all three mutations, revealed terrain at the sampled stroke point was nonblack, hidden terrain remained black, and tablet/phone/encounter/actor-details screenshots were captured.

## Known Stubs

None found in files created or modified by this plan.

## Next Phase Readiness

- Wave 7 validation rows 03-07-01 through 03-07-04 pass. Ready for Phase 03 verification.
- Physical display/HDMI and macOS verification remain unverified as documented in the phase validation strategy.

## Self-Check: PASSED

- All 11 summary-listed created/modified paths exist.
- All five task commits are ancestors of the current plan head; the authorized UI iteration commit `c259471` is also included in the measured plan history.
- Measured plan history count includes the five task commits, plan-summary commits, and the authorized UI iteration; `commits` and `plan_head_after` are finalized after the documentation commit.
