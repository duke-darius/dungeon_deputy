---
phase: "03"
slug: "fog-of-war-and-encounter-control"
status: in_progress
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
| **Full suite command** | `npm test`; `npm run build`; `npm run test:e2e` (run as separate commands) |
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
| 03-01-01 | 01 | 1 | ENCT-01, ENCT-03 | T-03-04, T-03-05, T-03-06 | Persist validated fog/visibility, cold-start black, explicit filtered publication and allowlist privacy | unit/integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (fails on any xUnit failure)<br>`node --test src/renderer/src/contracts.test.mjs` (fails on any assertion) | MapApiTests.cs, contracts.test.mjs | ✅ green; cold-start route/auth coverage remains |
| 03-01-02 | 01 | 1 | ENCT-01 | T-03-05 | Map-space brush lifecycle, distinct modes, bounded committed strokes and no gesture leakage | renderer/build | `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs src/renderer/src/contracts.test.mjs` (fails on any assertion)<br>`npm run build` (fails on TS/Vite/backend errors) | MapCanvas.lifecycle.test.mjs, canvasPolicy.mjs | ✅ commands green; paint-specific lifecycle assertions remain |
| 03-01-03 | 01 | 1 | ENCT-01, ENCT-03 | T-03-06 | Fog persistence/projection regressions and validation coverage | full suite | `npm test` (fails on any Node/xUnit test failure) | existing test suite | ✅ green; E2E owned by Plan 03 |
| 03-04-01 | 04 | 2 | ENCT-01 | T-03-13, T-03-14 | DM source terrain is visible only through ordered opaque fog mask; Hide re-covers Reveal | pixel/unit | `node --test src/renderer/src/map/fogMask.test.mjs`<br>`npm run build` | Planned | ⬜ pending |
| 03-04-02 | 04 | 2 | ENCT-01 | T-03-13, T-03-14 | Public source art uses black-default ordered mask; hidden tokens omitted; pointer cancel/upoutside/tool/API failure clean active brush | renderer/lifecycle | `node --test src/renderer/src/contracts.test.mjs`<br>`node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs`<br>`npm run build` | Planned | ⬜ pending |
| 03-04-03 | 04 | 2 | ENCT-01, ENCT-03 | T-03-14, T-03-15 | HTTP auth rejects missing token; failed persistence cannot publish; cold-start black and authenticated Show publishes filtered state | backend integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-02-01 | 02 | 3 | ENCT-02, ENCT-03 | T-03-07, T-03-08 | Durable private HP/conditions/initiative/tie-break/turn transitions | backend integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-02-02 | 02 | 3 | ENCT-02, ENCT-03 | T-03-07, T-03-08, T-03-09 | Authenticated private encounter routes and standard die/modifier validation | backend integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-03-01 | 03 | 4 | ENCT-02, ENCT-03 | T-03-10, T-03-11 | Same-dashboard private encounter controls, filtered PublicDisplay rendering, fully hidden black mask, and authoritative state/error feedback | build/backend | `npm run build`<br>`dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Planned | ⬜ pending |
| 03-03-02 | 03 | 4 | ENCT-01, ENCT-02, ENCT-03 | T-03-10, T-03-12 | Electron E2E restart blackout, explicit Show, polling, privacy and same-window path | E2E | `npm run test:e2e` | Planned | ⬜ pending |
| 03-03-03 | 03 | 4 | ENCT-01, ENCT-02, ENCT-03 | T-03-10, T-03-11 | Final full validation, demo evidence and physical-verification caveats | full gate | `npm test`<br>`npm run build`<br>`npm run test:e2e` | Planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/backend.tests/MapApiTests.cs` — fog strokes, visible-token defaults, save/reopen and public-projection privacy (executed in `npm test`); authenticated route transitions remain untested.
- [ ] `src/backend.tests/EncounterApiTests.cs` — HP, curated conditions, manual/d20 initiative, descending order/tie handling, turn advancement, bounded standard-die rolls and private persistence/API auth.
- [ ] `src/renderer/src/map/fogMask.test.mjs`, `src/renderer/src/map/MapCanvas.lifecycle.test.mjs`, and `src/renderer/src/contracts.test.mjs` — Plan 04 adds ordered pixel-mask, token/render, cancel/upoutside/tool-switch/API-failure and pan/token-drag isolation assertions.
- [ ] `scripts/e2e.mjs` / fixtures — Enable fog, Reveal/Hide, token visibility, save/restart, black-before-Show, explicit filtered Show, post-publication poll update and private combat field exclusion (Plan 03).
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

**Plan coverage:** `03-01-PLAN.md`, `03-04-PLAN.md`, `03-02-PLAN.md`, and `03-03-PLAN.md`; Plan 04 (wave 2) closes the rendering/authenticated-publication blockers before encounter API (wave 3) and UI/E2E (wave 4). IDs in the task matrix are canonical. Each row names standalone automated commands and task-level fail conditions. Keep `wave_0_complete: false` and `nyquist_compliant: false` until all mapped behaviors have executable tests and have been exercised.

**Approval:** pending
