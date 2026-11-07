# Phase 7 Requirement-to-Test Matrix

Execution evidence for Phase 7 Plans 07-01..08 and 07-05 audit. Plan 07-08 closes accepted narrative persistence with private SQLite storage, authenticated DM CRUD, live catalog validation, and same-transaction acceptance; no real key or provider network is used. Phase 6 physical phone/operator UAT remains an overall final acceptance gate and is not verified by this matrix.

| Requirement / roadmap criterion | Observable behavior | Planned test/artifact | Command | Evidence status |
|---|---|---|---|---|
| AI-01 | Configured provider yields bounded structured NPC, encounter, short adventure, scene, and map geometry proposals | `AiPreparationServiceTests`, `ProposalValidatorTests` | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~AiPreparation"` and `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~ProposalValidatorTests"` | Passed in full suite |
| AI-01 / AI-02 | References resolve only from explicitly selected local catalog IDs, retain canonical provenance, and separate source records from narrative | `ProposalValidatorTests`, `AiProposalAcceptanceTests` | Focused backend acceptance/validator run; `npm test` | Passed; final .NET suite 99 tests |
| AI-02 | Generation/preview do not mutate; explicit acceptance persists editable NPC/encounter/adventure/scene narrative and current provenance; edit revalidates IDs; narrative/map/encounter writes rollback together | `AiProposalAcceptanceTests`, `preparation.test.mjs`, main DM IPC allowlist test | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~AiProposalAcceptanceTests"`; `node --test src/renderer/src/ai/preparation.test.mjs`; `node --test src/main.test.mjs`; `npm test` | **Passed:** four focused backend acceptance tests, seven preparation renderer tests, 23 main tests, and 102 Node / 101 .NET full suite. Includes SQLite reopen, lifecycle, invalid/stale/wrong-category refs, prompt/key/provider-response sentinel exclusion, DM route allowlisting and transaction rollback. |
| ROADMAP 7.2 tavern ambush | Actual Electron/backend private preview → explicit selected local monster accept → same-ID actor/token → edit token/geometry → local turn → separate Show | `AiProposalAcceptanceTests`, `scripts/e2e/ai-preparation.test.mjs` | `npm run test:e2e` | Passed; final evidence `artifacts/e2e/2026-11-07T17-38-22.613Z-d3c6e22b` |
| AI-02 / public separation | Generation and invalid accept preserve map/encounter/public state; accepted draft stays private; public geometry appears only after separate Show | transaction rollback test and full Electron E2E | Focused backend tests; `npm run test:e2e` | Passed |
| AI-03 | Missing key/model, disabled AI, offline/network error, refusal, malformed/oversized output preserve ordinary local workflows | `AiPreparationApiTests`, renderer tests, E2E | `npm test`; `npm run test:e2e` | Passed; fake E2E had no real key/network |
| Privacy/security | Provider seam requires fresh consent and allowlisted data; E2E descendants omit AI credentials/model/toggles; deterministic E2E makes no provider/outbound request | `AiPreparationServiceTests`, `AiPreparationApiTests`, `preparation.test.mjs`, `main.test.mjs`, `fixtures.test.mjs`, E2E external-request monitor | `npm test`; `npm run test:e2e` | Passed; 102 Node / 99 .NET tests; E2E reported no external requests |
| Geometry/token bounds | Closed line/rectangle bounds, token max 100 and supported kind/artwork/bounded coordinates | `ProposalValidatorTests`, `AiProposalAcceptanceTests`, `MapApiTests` | Focused backend tests; `npm test` | Passed |
| Geometry editor | Private geometry renders in actual map editor with edit/remove controls; public raster draws geometry before fog concealment and changes only on Show | `MapCanvas.test.mjs`, `scripts/e2e/ai-preparation.test.mjs` | `node --test src/renderer/src/map/MapCanvas.test.mjs`; `npm run test:e2e` | Passed |
| Phase 6 integration gate | CHAR-02..04 physical phone/operator requirements are not established by Phase 7 tests; Phase 7 may progress but cannot mark Phase 6/project complete | `07-VERIFICATION.md`, roadmap/state status | Physical two-phone/private-Wi-Fi and operator UAT procedure recorded by Phase 6; no substitute automated command | Outstanding; do not claim verified |

## Phase-Level Commands

Executed for final Plan 07-05 verification (2026-11-07):

- `npm test` — passed, 102 Node tests and 99 .NET tests
- `npm run build` — passed; TypeScript, Electron, Vite and .NET backend; backend 0 warnings/errors
- `npm run test:e2e` — passed on retry, actual Electron/backend run `artifacts/e2e/2026-11-07T17-38-22.613Z-d3c6e22b`; no external requests. First run failed at an unrelated soundboard audio-config rename (`EPERM`), then passed without source changes.
- `npm run package:smoke` — passed, Windows x64 package smoke including bundled backend startup and local/offline state checks
- `node --test src/renderer/src/map/MapCanvas.test.mjs` — passed (included in `npm test`)
- Plan 07-08 final: focused backend acceptance suite passed (4 tests); focused preparation renderer suite passed (7 tests); `npm run build` passed; `npm test` passed with 102 Node and 101 .NET tests.

No live provider credential, provider call, physical-phone/operator UAT, HDMI acceptance, or macOS build/runtime result is claimed. CHAR-02..04 remain open. UI-SPEC visual/checker approval is also pending human review.
