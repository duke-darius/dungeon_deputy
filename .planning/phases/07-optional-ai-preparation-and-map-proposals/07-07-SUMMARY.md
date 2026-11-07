---
phase: 07-optional-ai-preparation-and-map-proposals
plan: 07
subsystem: ai-e2e
tags: [electron, offline, fake-provider, privacy, integration]
dependency-graph:
  requires: [07-04, 07-06]
  provides: [deterministic-private-acceptance-e2e, credential-free-fake-provider-seam]
  affects: [07-05, phase-7-verification]
tech-stack:
  added: []
  patterns: [exact-e2e-fake-flag, credential-scrubbed-offline-child-process, private-state-snapshot-e2e]
key-files:
  created:
    - src/backend/AiPreparation/E2eFakeAiPreparationService.cs
    - scripts/e2e/ai-preparation.test.mjs
  modified:
    - src/backend/Program.cs
    - src/main.ts
    - src/main.test.mjs
    - scripts/e2e/fixtures.mjs
    - scripts/e2e/fixtures.test.mjs
    - scripts/e2e.mjs
decisions:
  - "Fake provider is selected only for unpackaged E2E Electron launches carrying the exact test flag; ordinary startup retains the real optional provider."
  - "E2E descendants receive no OPENAI_API_KEY, model, AI enablement, or fake-provider toggle from the parent environment; the fake flag is set only by the explicit E2E launch path."
metrics:
  duration: "approximately 25 minutes"
  completed: 2026-11-07
  status: complete
  commits: 0
actuals:
  tasks: 2
  commits: 0
requirements-completed: [AI-01, AI-02, AI-03]
---

# Phase 7 Plan 7: Deterministic Tavern-Ambush E2E Summary

The actual Electron/backend workflow now verifies the private proposal/acceptance path end-to-end without an AI key, provider call, or external network access.

## Accomplishments

- Added a deterministic fake geometry provider enabled only through the unpackaged Electron E2E's exact `DUNGEON_DEPUTY_E2E_AI_FAKE=1` launch flag; backend registration also requires `DUNGEON_DEPUTY_E2E=1`.
- E2E fixtures remove OPENAI key, model, and enablement settings from inherited child environments; main process forwards only the dedicated fake flag in the qualifying test mode.
- Added a test-first environment scrub regression using non-secret sentinel values; the initial run failed because the scrub helper did not exist, then passed after extracting the explicit `e2eChildEnvironment` function.
- Actual tavern scenario verifies generation/preview and stale invalid acceptance leave map, encounter, and public state unchanged.
- Explicitly accepts current local `srd521:monster:bandit`; verifies EncounterService actor token ID equals the bounded private map token ID, edits the token and geometry, removes a geometry primitive, saves, sets initiative, and advances the local encounter turn.
- Confirms private map/encounter changes remain unpublished until separate Show; after Show, public PNG contains geometry while private geometry label is absent from public text.
- Existing offline request monitor reports no external network requests. No real provider credential was used or forwarded to E2E descendants, and no provider request was made.

## Verification

- `node --test src/main.test.mjs scripts/e2e/fixtures.test.mjs` — passed, including the environment scrub regression.
- `node --test scripts/e2e/ai-preparation.test.mjs` — helper module loaded successfully; its full workflow assertions execute in the actual desktop runner.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~AiPreparation"` — passed, 4 tests.
- `npm run build` — passed.
- `npm test` — passed, 102 Node tests and 95 .NET tests.
- `npm run test:e2e` — passed; evidence `artifacts/e2e/2026-11-07T17-10-08.629Z-8280a5bd`.
- Phase 6 CHAR-02..04 phone/operator UAT remains unverified and is not asserted by this plan.

## Deviations

None beyond splitting the fake-provider/E2E work into a focused seven-file plan after counting Plan 07-04 plus map-editor source changes above the ten-file scope limit.

## Self-Check: PASSED

- Fake provider, process environment boundaries, Electron runner and dedicated helper all exist.
- Full test/build/E2E checks passed; no credential/network use occurred.
- No commits or pushes were made; unrelated working-tree changes were preserved.

---
*Phase: 07-optional-ai-preparation-and-map-proposals*
*Completed: 2026-11-07*
