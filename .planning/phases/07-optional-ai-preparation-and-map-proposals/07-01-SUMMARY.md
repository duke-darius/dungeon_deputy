---
phase: 07-optional-ai-preparation-and-map-proposals
plan: 01
subsystem: api
tags: [aspnetcore, openai-responses, httpclient, privacy, electron]
requires:
  - phase: 06-srd-characters-and-local-player-sheets
    provides: Authenticated local DM API and curated SRD catalog
provides:
  - Backend-only, fakeable Responses API adapter for private NPC proposals
  - Safe local AI status and consent-gated DM NPC endpoint
  - Narrow Electron-to-backend AI environment allowlist
affects: [07-02, 07-03, 07-04, 07-05]
actuals:
  tokens: 5100
  tasks: 2
  commits: 0
  commits: 0
plan_head_before: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
plan_head_after: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
tech-stack:
  added: []
  patterns: [backend-only provider client, strict structured output, per-request consent, child-process environment allowlist]
key-files:
  created:
    - src/backend/AiPreparation/AiPreparationService.cs
    - src/backend/AiPreparation/AiContracts.cs
    - src/backend.tests/AiPreparationApiTests.cs
    - src/backend.tests/AiPreparationServiceTests.cs
  modified:
    - src/backend/Program.cs
    - src/main.ts
    - src/main.test.mjs
key-decisions:
  - "Keep provider settings in an explicit child-process allowlist and require DUNGEON_DEPUTY_AI_ENABLED=1 plus both provider values."
  - "Generation returns a bounded transient NPC proposal only; it has no campaign mutation path."
requirements-completed: [AI-01, AI-03]
coverage:
  - id: D1
    description: "Consent-gated backend NPC generation uses fixed Responses endpoint, strict schema and bounded sanitized responses."
    requirement: AI-01
    verification:
      - kind: integration
        ref: "src/backend.tests/AiPreparationServiceTests.cs; dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~AiPreparation"
        status: pass
    human_judgment: false
  - id: D2
    description: "Local AI status is value-safe, routes require DM authorization, and Electron forwards provider variables only to the backend process while offline APIs remain available."
    requirement: AI-03
    verification:
      - kind: integration
        ref: "src/backend.tests/AiPreparationApiTests.cs; dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~AiPreparation"
        status: pass
      - kind: unit
        ref: "src/main.test.mjs; node --test src/main.test.mjs"
        status: pass
    human_judgment: false
metrics:
  duration: "18 min"
  completed: 2026-11-07
  status: complete
---

# Phase 7 Plan 1: Backend NPC Proposal Tracer Summary

**A consent-gated, backend-only OpenAI Responses adapter returns transient NPC proposals without serializing campaign state or mutating local workflows.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-11-07T15:25:00Z
- **Completed:** 2026-11-07T15:43:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added a no-dependency `HttpClient` Responses API adapter with a fixed HTTPS endpoint, process-only key/model, strict JSON schema, `store:false`, timeout, byte bounds, refusal/malformed response handling, and sanitized failures.
- Added DM-authenticated local status and NPC generation routes. Requests require fresh affirmative consent and include only a bounded prompt plus at most three explicitly selected local SRD summaries/provenance; generation only returns a transient proposal.
- Replaced broad backend environment inheritance with an explicit runtime/core plus AI settings allowlist; provider secrets are not passed to renderer/preload and no external connectivity is attempted at startup.
- Added fake-`HttpMessageHandler` service tests and API/process-boundary tests. No real credential or network was used.

## Task Commits

No commits were made, per explicit user instruction. Changes remain in the working tree for later integration/review. Git HEAD before and after remained `83dc60e`.

1. **Task 1: Trace one private NPC proposal through the backend and fake provider** — uncommitted by request.
2. **Task 2: Lock down safe provider configuration and launch boundary** — uncommitted by request.

## Files Created/Modified

- `src/backend/AiPreparation/AiPreparationService.cs` — fixed-endpoint provider client, safe status, bounded strict-schema parsing.
- `src/backend/AiPreparation/AiContracts.cs` — request, status, response and result contracts.
- `src/backend/Program.cs` — authenticated AI status and NPC routes.
- `src/backend.tests/AiPreparationServiceTests.cs` — deterministic fake HTTP handler tests.
- `src/backend.tests/AiPreparationApiTests.cs` — route auth/status/consent/offline behavior tests.
- `src/main.ts` — backend child environment allowlist and DM-only path allowlist additions.
- `src/main.test.mjs` — environment boundary regression test.

## Decisions Made

- AI stays off unless `DUNGEON_DEPUTY_AI_ENABLED=1`; missing `OPENAI_API_KEY` or `DUNGEON_DEPUTY_AI_MODEL` keeps it unconfigured, with no model default.
- Status reveals only `disabled`, `unconfigured`, or `configured`; proposal generation does not persist or mutate campaign state.
- No new packages or provider SDK were added.

## Deviations from Plan

None - plan executed as written. User instruction to make no commits overrides the plan's usual per-task and metadata commits; the uncommitted state is recorded above.

## Issues Encountered

- Test-first RED runs initially failed because the new provider contracts and environment allowlist did not yet exist; the planned behavior tests passed after implementation.
- Existing unrelated Phase 6 working-tree changes overlap `Program.cs` and `main.ts`; those changes were preserved and not staged or committed.

## Verification

- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~AiPreparation"` — passed, 4 tests.
- `node --test src/main.test.mjs` — passed, 22 tests.
- `npm run build:electron` — passed.
- `npm test` — passed, 98 Node tests and 79 .NET tests.
- `dotnet build src/backend/DungeonDeputy.Api.csproj -c Release --no-restore` — passed, 0 warnings/errors.
- No live provider key, network request, or physical-phone test was used. Phase 6 physical phone/operator UAT remains open and unverified.

## Next Phase Readiness

- The backend provider seam is ready for subsequent proposal-type and UI plans.
- Phase 6 physical phone/operator UAT remains outstanding; this plan makes no Phase 6 or overall project completion claim.

## Self-Check: PASSED

- Summary and all four newly created AI backend/test files exist.
- Plan head remained unchanged; no commits were created per user request.
- All task-focused tests and the full automated suite listed above passed.

---
*Phase: 07-optional-ai-preparation-and-map-proposals*
*Completed: 2026-11-07*
