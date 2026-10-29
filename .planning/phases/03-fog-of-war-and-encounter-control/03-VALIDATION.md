---
phase: "03"
slug: "fog-of-war-and-encounter-control"
status: in_progress
nyquist_compliant: false
wave_0_complete: true
created: "2026-10-29"
---

# Phase 03 - Validation Strategy

> Per-phase validation contract and executed evidence map. Passing automation does not imply physical display or macOS verification.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Node built-in test runner + xUnit on .NET 10 |
| Config | `package.json`; `src/backend.tests/DungeonDeputy.Api.Tests.csproj` |
| Focused backend command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` |
| Full gate commands | `npm test`; `npm run build`; `npm run test:e2e` (run separately) |

## Per-task verification map

| Task ID | Plan | Wave | Requirement | Threat | Automated command (distinct failure condition) | Test files | Status |
|---|---|---:|---|---|---|---|---|
| 03-01-01 | 03-01 | 1 | ENCT-01, ENCT-03 | T-03-04, T-03-05, T-03-06 | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (fog persistence/auth/projection assertions fail); `node --test src/renderer/src/contracts.test.mjs` (public allowlist or malformed projection assertion fails) | `src/backend.tests/MapApiTests.cs`, `src/renderer/src/contracts.test.mjs` | pass |
| 03-01-02 | 03-01 | 1 | ENCT-01 | T-03-05 | `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs src/renderer/src/contracts.test.mjs` (gesture lifecycle or public contract assertion fails); `npm run build` (renderer/Electron/backend build fails) | `src/renderer/src/map/MapCanvas.lifecycle.test.mjs`, `src/renderer/src/map/canvasPolicy.mjs` | pass |
| 03-01-03 | 03-01 | 1 | ENCT-01, ENCT-03 | T-03-06 | `npm test` (any Node/xUnit test fails) | full existing test suite | pass |
| 03-04-01 | 03-04 | 2 | ENCT-01 | T-03-13, T-03-14 | `node --test src/renderer/src/map/fogMask.test.mjs` (mask pixel/order/determinism assertion fails); `npm run build` (build fails) | `src/renderer/src/map/fogMask.test.mjs`, `src/renderer/src/map/fogMask.mjs` | pass |
| 03-04-02 | 03-04 | 2 | ENCT-01 | T-03-13, T-03-14 | `node --test src/renderer/src/contracts.test.mjs` (public projection assertion fails); `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs` (brush lifecycle assertion fails); `npm run build` (build fails) | `src/renderer/src/contracts.test.mjs`, `src/renderer/src/map/MapCanvas.lifecycle.test.mjs` | pass |
| 03-04-03 | 03-04 | 2 | ENCT-01, ENCT-03 | T-03-14, T-03-15 | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (auth, persistence failure, black cold-start or filtered Show assertion fails) | `src/backend.tests/MapApiTests.cs` | pass |
| 03-02-01 | 03-02 | 3 | ENCT-02, ENCT-03 | T-03-07, T-03-08 | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (durability, actor validation, tie order or turn assertion fails) | `src/backend.tests/EncounterServiceTests.cs` | pass |
| 03-02-02 | 03-02 | 3 | ENCT-02, ENCT-03 | T-03-07, T-03-08, T-03-09 | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (route auth, dice bounds, persistence or public-privacy assertion fails) | `src/backend.tests/EncounterApiTests.cs` | pass |
| 03-03-01 | 03-03 | 4 | ENCT-02, ENCT-03 | T-03-10, T-03-11 | `npm run build` (TypeScript, Electron, Vite or backend build fails); `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (backend public/privacy assertion fails) | `src/renderer/src/map/MapEditor.tsx`, `src/renderer/src/styles.css`, `src/renderer/src/PublicDisplay.tsx`, `src/main.ts`, `src/backend.tests/EncounterApiTests.cs` | pass |
| 03-03-02 | 03-03 | 4 | ENCT-01, ENCT-02, ENCT-03 | T-03-10, T-03-12 | `npm run test:e2e` (UI/API/persistence/poll/privacy/window/mask assertion, timeout, or renderer error fails) | `scripts/e2e.mjs`, `scripts/e2e/fixtures.mjs`, `scripts/e2e/fixtures.test.mjs` | pass |
| 03-03-03 | 03-03 | 4 | ENCT-01, ENCT-02, ENCT-03 | T-03-10, T-03-11 | `npm test` (any Node/xUnit failure); `npm run build` (build failure); `npm run test:e2e` (integrated E2E failure) | `docs/phase-3-demo.md`, this validation map and all test files above | pass |
| 03-05-01 | 03-05 | 5 | ENCT-01, ENCT-03 | T-03-16, T-03-17, T-03-20 | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release`<br>Fails when PNG validation, persist-before-presentation, cold-start black, or public DTO privacy assertions fail. | `src/backend.tests/MapApiTests.cs` | planned |
| 03-05-01 | 03-05 | 5 | ENCT-01, ENCT-03 | T-03-16 | `npm test`<br>Fails when exact PNG imageData/token allowlist or fail-closed public contract assertions fail. | `src/renderer/src/contracts.test.mjs` | planned |
| 03-05-01 | 03-05 | 5 | ENCT-01, ENCT-03 | T-03-16, T-03-17 | `npm run build`<br>Fails when production renderer, Electron, or backend build fails. | Renderer and backend build | planned |
| 03-05-02 | 03-05 | 5 | ENCT-01, ENCT-03 | T-03-16, T-03-20 | `npm run package:smoke`<br>Fails when valid benign PNG, exact DTO, forbidden-field, or public CSP assertions fail. | `scripts/package-smoke.mjs`, `src/renderer/public.html` | planned |
| 03-05-02 | 03-05 | 5 | ENCT-01, ENCT-03 | T-03-16, T-03-20 | `npm run test:e2e`<br>Fails when public source fetch/image denial, API/DOM privacy, black-before-Show, or black-outside-reveal pixel assertion fails. | `scripts/e2e.mjs` | planned |
| 03-06-01 | 03-06 | 6 | ENCT-01 | T-03-18 | `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs`<br>Fails when: stale redraw mutates scene or cancellation retains preview/state or submits a stroke.<br><br>`npm run build`<br>Fails when: production build fails. | `src/renderer/src/map/MapCanvas.lifecycle.test.mjs` | planned |
| 03-06-02 | 03-06 | 6 | ENCT-02, ENCT-03 | T-03-19 | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release`<br>Fails when: reorder is not authenticated/atomic, invalid order mutates state, or HP null preservation fails.<br><br>`npm test`<br>Fails when: UI/API regression tests fail for one-call reorder or blank HP null values.<br><br>`npm run build`<br>Fails when: production build fails. | `src/backend.tests/EncounterApiTests.cs`, `src/backend.tests/EncounterServiceTests.cs` | planned |

## Wave 0 tests

- [ ] `src/backend.tests/MapApiTests.cs` - existing fog persistence/authentication plus planned PNG-only projection MIME/size validation, persist-before-publish, and source/stroke/private-key exclusion; run focused backend tests for 03-05.
- [x] `src/backend.tests/EncounterApiTests.cs` and `EncounterServiceTests.cs` - private encounter mutations, validation, order, dice and restart persistence; exercised with `dotnet test` and `npm test`.
- [x] `src/renderer/src/map/fogMask.test.mjs`, `MapCanvas.lifecycle.test.mjs`, and `src/renderer/src/contracts.test.mjs` - mask pixels, order, gesture cleanup and public allowlist; exercised with `npm test`.
- [ ] `scripts/e2e.mjs` - planned same-window cold-start black, explicit Show, post-show polling, sanitized PNG-only public payload, source fetch/image denial, and black pixels outside reveal; run `npm run test:e2e` after 03-05.
- [x] No framework/package installation required.

## Manual-only verifications

| Behavior | Requirement | Why manual | Status |
|---|---|---|---|
| Physical display readability, HDMI hot-plug, true monitor fullscreen/GPU behavior | ENCT-01, ENCT-03 | Hidden/offscreen E2E cannot establish physical hardware behavior | Unverified; follow `docs/phase-3-demo.md` on target hardware |
| macOS x64/arm64 packaging and runtime | ENCT-01, ENCT-03 | Not exercised by Windows automation | Unverified |

## Validation run record

- `npm test` - passed: 29 Node tests and 20 xUnit tests.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` - passed: 20 tests.
- `npm run build` - passed.
- `npm run test:e2e` - passed after iterating on stale E2E token selectors/state synchronization; evidence captured by the harness under `artifacts/e2e/<run-id>/` during the successful run.
- 03-05 rerun evidence: `npm test` (28 Node + 20 xUnit pass), `npm run build` (pass), `npm run package:smoke` (pass), and `npm run test:e2e` (pass; latest artifact path recorded in 03-05-SUMMARY.md). The per-task rows remain planned per the 03-05 plan's pending-row instruction.

## Sign-off

- [x] All task rows include executable verification commands and failure conditions.
- [x] Wave 0 test mapping exercised; no skipped tests claimed complete.
- [x] No watch-mode flags.
- [x] `nyquist_compliant: true` for automated scope; human physical/platform caveats remain open.
- [ ] Phase status/roadmap completion deliberately not marked here.

**Plan coverage:** 03-01, 03-04, 03-02, 03-03, 03-05 (planned; Wave 5), 03-06 (planned; Wave 6 after 03-05). Threat mapping T-03-04 through T-03-20 is covered across the phase plans; closure plans retain package-install threat T-03-SC by avoiding new packages. 03-05/03-06 evidence rows are planned and are not claims of completed verification. Automation does not attest to physical HDMI or macOS behavior.
