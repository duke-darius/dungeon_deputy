---
phase: 03-fog-of-war-and-encounter-control
plan: 02
subsystem: api
tags: [aspnet-core, sqlite, encounter, xunit]
requires:
  - phase: 03-01
    provides: Authenticated map-token state and per-user SQLite persistence
  - phase: 03-04
    provides: Current map/fog state and public presentation privacy boundary
provides:
  - Private SQLite encounter actor state with validated HP, conditions, initiative, turn order and dice history
  - Authenticated encounter API endpoints for DM encounter operations
  - xUnit coverage for persistence, validation, turn progression, dice and public privacy
affects: [03-03, encounter-ui, api]
actuals:
  tokens: 8087
  tasks: 2
  commits: 3
  plan_head_before: ed78ae53fe9c57e513b1acb3a6ec3c9bade32d29
  plan_head_after: 65939e7383f4ac8b8be953d1c800d733ceff948d
tech-stack:
  added: []
  patterns: [separate private encounter document in existing per-user SQLite database, validation before transactional writes, injectable dice source]
key-files:
  created:
    - src/backend/Encounters/EncounterService.cs
    - src/backend.tests/EncounterServiceTests.cs
    - src/backend.tests/TestAssembly.cs
    - src/backend.tests/EncounterApiTests.cs
    - .planning/phases/03-fog-of-war-and-encounter-control/03-02-red-evidence.json
    - .planning/phases/03-fog-of-war-and-encounter-control/03-02-route-red.test.mjs
  modified:
    - src/backend/Program.cs
key-decisions:
  - "Keep actor combat state and dice history in its own private SQLite document; map tokens provide actor identity only."
  - "Use a stable condition catalog seam, closed supported dice set, and bounded validation without adding packages."
patterns-established:
  - "Encounter mutations serialize under a service write gate and persist only validated state in a SQLite transaction."
requirements-completed: [ENCT-02, ENCT-03]
coverage:
  - id: D1
    description: DM encounter actor controls, initiative, turns and dice are persisted and validated by the authenticated backend.
    requirement: ENCT-02
    verification:
      - kind: integration
        ref: src/backend.tests/EncounterApiTests.cs#EncounterStateAndCommandsArePrivateAuthenticatedAndDurable
        status: pass
    human_judgment: false
  - id: D2
    description: Encounter state and dice remain private and survive backend/service restart.
    requirement: ENCT-03
    verification:
      - kind: integration
        ref: src/backend.tests/EncounterApiTests.cs#PrivateActorAndDiceStateSurviveReopeningTheDatabase
        status: pass
      - kind: unit
        ref: src/backend.tests/EncounterServiceTests.cs#EncounterDocumentSurvivesServiceRecreation
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-10-29
status: complete
---

# Phase 03 Plan 02: Encounter Control Summary

**Authenticated encounter operations now persist private actor and dice state in SQLite, with validated initiative ordering and turn progression.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-29T19:43:00Z
- **Completed:** 2026-10-29T19:50:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added a separate encounter document keyed to current map token IDs; new/removed tokens reconcile without copying combat data into public map contracts.
- Added bounded HP, curated condition IDs, manual and d20 initiative, explicit tie ordering, wraparound turn advancement, and standard dice with private persisted history.
- Added authenticated API routes and tests for authorization, invalid requests, persistence across database reopen, dice ranges, and public projection separation.

## Task Commits

1. RED: Encounter API contract and accepted TAP evidence — 24ca751 (test)
2. Task 1: Private encounter service and domain transitions — 8fb107c (feat)
3. Task 2: Authenticated encounter commands and HTTP validation — 65939e7 (feat)

Plan metadata: pending state/summary commit.

## Files Created/Modified
- src/backend/Encounters/EncounterService.cs — SQLite-backed private encounter domain and validated state transitions.
- src/backend/Program.cs — authenticated encounter API route registrations.
- src/backend.tests/EncounterServiceTests.cs — domain transition and restart persistence tests.
- src/backend.tests/EncounterApiTests.cs — HTTP auth, validation, ordering, dice and public-boundary tests.
- src/backend.tests/TestAssembly.cs — serializes API tests using process-wide environment configuration.
- .planning/phases/03-fog-of-war-and-encounter-control/03-02-red-evidence.json and route-red.test.mjs — accepted TAP RED evidence for the authenticated endpoint returning 404 before implementation.

## RED-GREEN-REFACTOR

- RED: The authenticated GET /api/encounter target failed as expected with 404 before implementation. The persisted Node TAP report was accepted by the GSD classifier as RED_EVIDENCE_OK; semantic inspection confirms the failure was the intended 404-versus-200 assertion after the authenticated request reached the backend. The unsupported raw .NET console report was not rerun or reclassified.
- GREEN: The private EncounterService, SQLite document, and authenticated API handlers made domain/API tests pass.
- REFACTOR: No separate refactor commit was needed.

## Verification

- dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release — passed: 20 passed, 0 failed.
- npm test — passed: 29 Node tests and 20 .NET tests, 0 failures.

## Decisions Made
- Used an isolated private encounter document instead of extending public map/token DTOs.
- Set validation bounds to 9,999 HP, ±1,000 initiative/modifier, 100 actors and 100 retained dice results; no dependency added.

## Deviations from Plan

1. [Rule 2 - Test reliability] Serialized xUnit tests that mutate process environment configuration.
- Found during: Task 1 verification
- Issue: API integration tests sharing process-wide token/data-directory environment variables raced under parallel execution.
- Fix: Disabled xUnit test parallelization for the test assembly to make auth and persistence fixtures deterministic.
- Files modified: src/backend.tests/TestAssembly.cs
- Verification: Full .NET suite passed with 20 tests.
- Committed in: 8fb107c

Total deviations: 1 auto-fixed (Rule 2).
Impact on plan: Necessary to avoid cross-test environment contamination; no product scope or dependency changes.

## Issues Encountered
- Initial full-suite run exposed the shared-environment test race; serialized the tests as noted above.
- Confirmed DungeonDeputy.Api.Tests.csproj default compile glob includes the new test sources, so no project file edit was required.

## Next Phase Readiness
- Encounter backend contracts are ready for the Phase 03 dashboard integration.
- No known blockers for Plan 03.

---
Phase: 03-fog-of-war-and-encounter-control
Completed: 2026-10-29

## Self-Check: PASSED

- SUMMARY exists at the required phase path.
- Task commits 24ca751, 8fb107c, and 65939e7 are ancestors of HEAD.
