---
phase: 02-playable-digital-battle-map
plan: 04
subsystem: public-map
tags: [aspnet, react, electron, public-dto, map, blackout]
requires:
  - phase: 02-playable-digital-battle-map
    provides: Persisted private draft maps, approved snapshots, and existing public display renderer
provides:
  - Explicit authenticated Show transition snapshots the saved draft into approved public map state
  - Strictly allowlisted public map rendering and blackout persistence across map refreshes
  - npm test includes nested Pixi map lifecycle tests
affects: [phase-02-demo-docs, phase-06-signalr]
actuals:
  tokens: 5271
  tasks: 2
  commits: 2
commits: 2
plan_head_before: 5c63cb2ab12eeb438cd6ff1b6f6baabd556a6e3c
plan_head_after: fc07908c81f57dc9882df575acbdaf843599040d
tech-stack:
  added: []
  patterns: [camelCase public DTO allowlist, backend-owned publication, existing renderer polling]
key-files:
  created: []
  modified: [src/backend/Maps/MapService.cs, src/backend/PresentationState.cs, src/backend/Program.cs, src/backend.tests/MapApiTests.cs, src/renderer/src/PublicDisplay.tsx, src/renderer/src/contracts.mjs, src/renderer/src/contracts.test.mjs, src/renderer/src/public.css, src/main.ts, src/main.test.mjs, package.json]
key-decisions:
  - "Keep request/response polling; immediate SignalR updates remain Phase 6 (CHAR-04)."
  - "Show saves dirty draft controls before the backend snapshots approved visual state."
  - "Blackout changes active presentation separately from durable approved map state."
requirements-completed: []
coverage:
  - id: D1
    description: Explicit publication isolates the map snapshot from later draft edits; blackout remains active.
    requirement: MAP-02
    verification:
      - kind: integration
        ref: dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
        status: pass
    human_judgment: false
  - id: D2
    description: Public DTO allowlisting, nested canvas lifecycle, and existing-window regression are tested.
    requirement: MAP-01
    verification:
      - kind: unit
        ref: npm test (18 Node tests and 12 backend tests)
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: false
  - id: D3
    description: Physical second-display rendering of map and blackout behavior.
    verification: []
    human_judgment: true
    rationale: No physical display was exercised; automated window tests do not prove monitor behavior.
duration: 11 min
completed: 2026-10-28
status: complete
---

# Phase 2 Plan 4: Playable Digital Battle Map Summary

**Explicitly published map snapshots render in the existing public display with a fail-closed DTO, blackout override, and nested lifecycle-test coverage.**

## Performance
- **Duration:** 11 min
- **Started:** 2026-10-28 (exact time not separately captured)
- **Completed:** 2026-10-28T16:07:53Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Added an authenticated explicit Show transition; the saved draft's map art, grid, scale, and token values become a separate durable approved snapshot. Draft edits do not update that snapshot.
- Active public presentation supports allowlisted scenes, approved maps, or black state. Blackout supersedes the active map without deleting the approved snapshot.
- Added camelCase public-map validation/rendering for map art, optional grid, and approved tokens using bundled assets; malformed/unapproved state fails closed.
- Added Show on table and Black out controls. Show saves locally dirty map controls before publication.
- Extended the Electron window regression test and included src/renderer/src/map/*.test.mjs in npm test.

## Design Critique
- Proposal: retain the restrained command-desk hierarchy and keep publication actions in the compact table-display inspector. The public surface stays edge-to-edge art, subdued grid, and bundled tokens without editor chrome.
- Critique: a generic approval card or new accent system would turn the table surface into dashboard UI and conflict with Phase 1. The implementation uses two plain, explicit controls in the existing inspector; the public output stays visually minimal. No physical display was available for visual critique.

## Task Commits
1. Task 1: Implement explicit publish and backend-approved snapshot tests — 2d344f1 (feat)
2. Task 2: Render approved map in place on the existing player window — fc07908 (feat)

Plan metadata commit: pending.

## Verification
- dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release — passed (12 tests).
- npm test — passed (18 Node tests, including nested map lifecycle tests; 12 backend tests).
- npm run build — passed (TypeScript, Electron output, Vite, ASP.NET Core; no backend warnings/errors).
- Physical display behavior is unverified. Publish/blackout do not create/destroy/reload windows, toggle fullscreen, or call display placement.
- No SignalR or direct npm dependency added.

## TDD Gate Compliance
Process deviation: task tests were not authored and semantically accepted as a failing RED-first commit before implementation. Tests and source were committed together per task; canonical RED/GREEN compliance is not claimed. Final test suites pass.

## Decisions Made
- Treat API DTOs as ASP.NET Core camelCase, matching correction 5c63cb2.
- Only explicit Show publishes a snapshot; blackout changes active state, not approved storage.
- Retain request/response polling until Phase 6/CHAR-04.
- Keep asset IDs catalogued and add no dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended narrow Electron IPC route/method allowlist for map-token operations**
- Found during: Task 2
- Issue: Existing IPC path/method validation omitted token IDs and PATCH/DELETE, blocking map editor requests before they reached the authenticated backend.
- Fix: Added token-route IDs and existing verbs to the same sender-checked allowlist.
- Files: src/main.ts, src/main.test.mjs
- Verification: npm test and npm run build passed.
- Commit: fc07908

**2. [TDD process deviation] No semantic RED evidence or RED commit**
- Found during: Tasks 1–2
- Issue: Tests were combined with their implementations rather than validated/committed as RED first.
- Resolution: Documented; final tests pass, but history does not prove RED/GREEN.
- Files: src/backend.tests/MapApiTests.cs, src/renderer/src/contracts.test.mjs, src/main.test.mjs
- Commits: 2d344f1, fc07908

Total deviations: 1 correctness fix and 1 TDD process deviation. IPC route correction was required to operate the existing editor; no SignalR, package, or window lifecycle scope was added.

## Issues Encountered
An initial backend test run exposed type errors after broadening public state to object; it was corrected to a typed presentation DTO. A test equality assertion then failed on list reference equality and was changed to compare snapshot values. Final verification passes.

## Known Stubs
None identified in files changed by this plan.

## Next Phase Readiness
Plan 02-04 is complete; Plan 02-05 remains separate and was not started. Shared MAP-01/MAP-02 requirement completion remains pending other Phase 2 plans. Physical display remains unverified.

## Self-Check: PASSED
- All 13 changed deliverable files exist.
- Commits 2d344f1 and fc07908 are ancestors of HEAD.
- Measured range: 2 commits, 5c63cb2ab12eeb438cd6ff1b6f6baabd556a6e3c to fc07908c81f57dc9882df575acbdaf843599040d.
