---
phase: 07-optional-ai-preparation-and-map-proposals
plan: 04
subsystem: ai-preparation
tags: [aspnetcore, private-drafts, map-geometry, encounters, acceptance]
dependency-graph:
  requires: [07-01, 07-02, 07-03]
  provides: [private-proposal-acceptance-api, bounded-map-geometry-storage, explicit-monster-selection]
  affects: [07-05, 07-06, 07-07, local-map, local-encounter]
tech-stack:
  added: []
  patterns: [revalidate-edited-proposal-at-acceptance, catalog-backed-monster-selection, private-map-draft-only]
key-files:
  created:
    - src/backend/AiPreparation/ProposalAcceptanceService.cs
    - src/backend.tests/AiProposalAcceptanceTests.cs
  modified:
    - src/backend/Maps/MapService.cs
    - src/backend/Encounters/EncounterService.cs
    - src/backend/Program.cs
    - src/backend.tests/MapApiTests.cs
    - src/backend.tests/ProposalValidatorTests.cs
    - src/renderer/src/ai/PreparationWorkspace.tsx
    - src/renderer/src/ai/preparationApi.ts
    - src/renderer/src/ai/preparation.test.mjs
decisions:
  - "AI acceptance is a separate authenticated API request and repeats proposal validation; generation remains read-only."
  - "Only explicit current local monster record IDs with supported catalog statistics are routed through EncounterService.AddMonster."
  - "Accepted monster actors and their map tokens plus bounded geometry are committed within one SQLite BEGIN IMMEDIATE transaction across the shared database."
  - "Geometry editing and deterministic no-network E2E were split into 07-06/07-07 to keep each plan within the ten-source-file limit."
metrics:
  duration: "approximately 55 minutes including required follow-up plans"
  completed: 2026-11-07
  status: complete
  commits: 0
  plan_head_before: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
  plan_head_after: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
actuals:
  tokens: 3200
  tasks: 2
  commits: 0
requirements-completed: [AI-01, AI-02]
---

# Phase 7 Plan 4: Explicit Private Proposal Acceptance Summary

Implemented and verified explicit proposal acceptance with one-transaction actor/token/geometry writes, an editable private map draft, local encounter operation, and publication only through separate Show.

## Accomplishments

- Added `/api/ai/accept`, a distinct request path from generation. The backend reruns the closed proposal validator and validates every selected current SRD record before mutating state.
- Current selected local catalog records and edited proposals are revalidated. `EncounterService.AddMonster` creates the authoritative actor snapshot; the actor token ID is reused as the private `MapToken` ID. Unsupported/missing records reject the full request. Only the existing supported catalog subset is offered.
- Added bounded persisted line/rectangle geometry to `MapDocument`; it is included only in private draft data and remains absent from the public map projection.
- Added an explicit UI accept button and independent monster-selection checkboxes. Acceptance errors preserve the edited preview; success explains that nothing was shown or published.
- Map/encounter writes now share one SQLite connection and `BeginTransaction(deferred: false)` (SQLite BEGIN IMMEDIATE). The deterministic lock order is map writer then encounter writer; injected failures on either the encounter write or the subsequent map write prove both documents roll back together.
- Fixed encounter reconciliation to avoid duplicating an AddMonster actor already represented by the same-ID map token.
- Follow-up Plans 07-06/07-07 add safe geometry rendering/edit/remove controls, fake-provider isolation, and actual Electron preview → invalid/valid accept → edit/run encounter → separate Show coverage.
- E2E removes provider secrets/configuration from child environments and blocks external network. No real key or provider request was used.

## Verification

- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~AiProposalAcceptanceTests|FullyQualifiedName~MapApiTests|FullyQualifiedName~ProposalValidatorTests"` — passed, 26 tests, including both map-write and encounter-write fault rollback.
- `node --test src/renderer/src/ai/preparation.test.mjs src/main.test.mjs src/renderer/src/map/MapCanvas.test.mjs` — passed, 29 tests.
- `npm test` — passed, 101 Node tests and 95 .NET tests.
- `npm run build` — passed, including TypeScript, Electron, Vite, and .NET backend.
- `node --test scripts/e2e/ai-preparation.test.mjs` — passed.
- `npm run test:e2e` — passed, including the actual Electron/backend tavern workflow through separate Show. Final evidence: `artifacts/e2e/2026-11-07T17-03-25.208Z-06e0a28e`.

## Follow-up Completion

- The dedicated `scripts/e2e/ai-preparation.test.mjs` is now executed by the full Electron runner and passes tavern proposal through preview, acceptance, token/geometry edits, local encounter turn, and separate Show using a deterministic fake provider.
- Accepted geometry renders and has editable/removable controls in the DM map editor; it persists privately and appears in the public raster only after separate Show.
- Encounter actor, same-ID token, and geometry write in one non-deferred transaction on the existing shared SQLite file. A deterministic map update failure after encounter persistence verifies rollback leaves both documents unchanged.
- Successful E2E acceptance proves the supported catalog bandit actor/token identity, token edit, and local initiative/turn flow.
- Phase 6 CHAR-02..04 physical phone/operator UAT remains unverified and is not changed by this plan.

## Deviations from Plan

**1. [Rule 1 - Bug] Prevent duplicate actors during same-ID token reconciliation**
- **Found during:** Successful acceptance integration test
- **Issue:** Existing reconciliation appended source monster actors even when their token IDs existed on the current map, duplicating actors after acceptance.
- **Fix:** Reconciliation appends only source actors not represented by current map tokens; actor/token identity and local turn tests pass.
- **Files modified:** `src/backend/Encounters/EncounterService.cs`, `src/backend.tests/AiProposalAcceptanceTests.cs`

**2. [Plan scope] Split work to respect source-file limit**
- Geometry editor/rendering is tracked in Plan 07-06; deterministic fake-provider/full Electron E2E is tracked in Plan 07-07. Both passed before this summary was completed.

## Task Commits

No commits or pushes were made, per explicit user instruction. Existing unrelated working-tree changes were preserved. HEAD remained `83dc60eef2c049e0d2b193cf7045eb2184344e6b`; measured plan commits: 0.

## Self-Check: PASSED

- Acceptance service/tests, geometry editor, fake-provider seam and E2E helper exist.
- Focused/full tests, build, and actual Electron/backend E2E passed as recorded.
- No real provider credential/network was used. Phase 6 CHAR-02..04 phone/operator UAT remains outstanding.

---
*Phase: 07-optional-ai-preparation-and-map-proposals*
*Completed: 2026-11-07*
