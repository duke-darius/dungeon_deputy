---
phase: "03"
slug: "fog-of-war-and-encounter-control"
status: planned
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-29"
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner + xUnit on .NET 10 |
| **Config file** | `package.json`; `src/backend.tests/DungeonDeputy.Api.Tests.csproj` |
| **Quick run command** | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's focused Node or .NET test command.
- **After every plan wave:** Run `npm test`.
- **Before `/gsd-verify-work`:** Run `npm test`, `npm run build`, and `npm run test:e2e`.
- **Max feedback latency:** 60 seconds for automated feedback; the packaged smoke test may take longer.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ENCT-01, ENCT-03 | T-03-04, T-03-05, T-03-06 | Persist validated fog/visibility, cold-start black, explicit filtered publication and allowlist privacy | unit/integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release && node --test src/renderer/src/contracts.test.mjs` | Planned | ⬜ pending |
| 03-01-02 | 01 | 1 | ENCT-01 | T-03-05 | Map-space brush lifecycle, distinct modes, bounded committed strokes and no gesture leakage | renderer/build | `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs src/renderer/src/contracts.test.mjs && npm run build` | Planned | ⬜ pending |
| 03-01-03 | 01 | 1 | ENCT-01, ENCT-03 | T-03-06 | Fog persistence/projection regressions and validation coverage | full suite | `npm test` | Planned | ⬜ pending |
| 03-02-01 | 02 | 2 | ENCT-02, ENCT-03 | T-03-07, T-03-08 | Durable private HP/conditions/initiative/tie-break/turn transitions | backend integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-02-02 | 02 | 2 | ENCT-02, ENCT-03 | T-03-07, T-03-08, T-03-09 | Authenticated private encounter routes and standard die/modifier validation | backend integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-03-01 | 03 | 3 | ENCT-02, ENCT-03 | T-03-10, T-03-11 | Same-dashboard private encounter controls and authoritative state/error feedback | build/backend | `npm run build && dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-03-02 | 03 | 3 | ENCT-01, ENCT-02, ENCT-03 | T-03-10, T-03-12 | Electron E2E restart blackout, explicit Show, polling, privacy and same-window path | E2E | `npm run test:e2e` | Planned | ⬜ pending |
| 03-03-03 | 03 | 3 | ENCT-01, ENCT-02, ENCT-03 | T-03-10, T-03-11 | Final full validation, demo evidence and physical-verification caveats | full gate | `npm test && npm run build && npm run test:e2e` | Planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/backend.tests/MapApiTests.cs` — fog initialization/strokes, visible-token defaults, save/reopen, authenticated transitions and public-projection privacy.
- [ ] `src/backend.tests/EncounterApiTests.cs` — HP, curated conditions, manual/d20 initiative, descending order/tie handling, turn advancement, bounded standard-die rolls and private persistence/API auth.
- [ ] `src/renderer/src/map/MapCanvas.lifecycle.test.mjs` and `src/renderer/src/contracts.test.mjs` — brush map-coordinate conversion, pointer lifecycle, pan/token-drag isolation and fail-closed public projection.
- [ ] `scripts/e2e.mjs` / fixtures — Enable fog, Reveal/Hide, token visibility, save/restart, black-before-Show, explicit filtered Show, post-publication poll update and private combat field exclusion.
- [ ] No framework/package installation: the existing Node and xUnit test infrastructure is sufficient.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Physical player-display readability, HDMI hot-plug, and true monitor fullscreen | ENCT-01, ENCT-03 | Hidden/offscreen E2E windows do not verify physical GPU/monitor behavior | Follow Phase 3 demo checklist on an actual table display; report unsupported hosts honestly. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (except packaged smoke)
- [ ] `nyquist_compliant: true` set in frontmatter

**Plan coverage:** `03-01-PLAN.md`, `03-02-PLAN.md`, and `03-03-PLAN.md`; IDs in the task matrix are the canonical task identifiers. Plans specify automated `<verify>` commands and `<fails_when>` conditions. Wave 0 remains pending until implementation creates and runs the listed tests.

**Approval:** pending
