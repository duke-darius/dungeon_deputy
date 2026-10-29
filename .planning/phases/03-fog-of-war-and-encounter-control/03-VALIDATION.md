---
phase: "03"
slug: "fog-of-war-and-encounter-control"
status: in_progress
nyquist_compliant: true
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

## Wave 0 tests

- [x] `src/backend.tests/MapApiTests.cs` - fog persistence/authentication, cold-start black, Show and projection privacy; exercised with `dotnet test` and `npm test`.
- [x] `src/backend.tests/EncounterApiTests.cs` and `EncounterServiceTests.cs` - private encounter mutations, validation, order, dice and restart persistence; exercised with `dotnet test` and `npm test`.
- [x] `src/renderer/src/map/fogMask.test.mjs`, `MapCanvas.lifecycle.test.mjs`, and `src/renderer/src/contracts.test.mjs` - mask pixels, order, gesture cleanup and public allowlist; exercised with `npm test`.
- [x] `scripts/e2e.mjs` / `scripts/e2e/fixtures.mjs` - isolated desktop workflow, cold-start black, filtered Show, persisted encounter state, polling and public mask; exercised with `npm run test:e2e`.
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

## Sign-off

- [x] All task rows include executable verification commands and failure conditions.
- [x] Wave 0 test mapping exercised; no skipped tests claimed complete.
- [x] No watch-mode flags.
- [x] `nyquist_compliant: true` for automated scope; human physical/platform caveats remain open.
- [ ] Phase status/roadmap completion deliberately not marked here.

**Plan coverage:** 03-01, 03-04, 03-02, 03-03. Threat mapping T-03-04 through T-03-15 is inherited from those plans; Plan 03 additionally mitigates T-03-10 through T-03-12 and package-install threat T-03-SC by avoiding new packages. Automation does not attest to physical HDMI or macOS behavior.
