---
phase: "03"
slug: "fog-of-war-and-encounter-control"
status: draft
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
| 03-01-01 | 01 | 1 | ENCT-01 | T-03-01 | Persist validated fog strokes and hide hidden tokens in the backend projection | unit/integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | ENCT-02 | T-03-02 | Persist bounded HP/conditions/initiative/turn/dice state only in the DM-private API | unit/integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | ENCT-03 | T-03-03 | Verify the integrated dashboard journey, public allowlist, restart recovery, and same-window behavior | E2E | `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/backend.tests/MapApiTests.cs` — fog initialization/strokes, visible-token defaults, persisted visibility, and public-projection privacy tests.
- [ ] New encounter service tests — HP, curated conditions, manual/d20 initiative, descending order/tie handling, turn advancement, bounded standard-die rolls, and private persistence.
- [ ] Renderer tests — brush screen-to-map coordinates, pointer lifecycle, pan/token-drag separation, and fail-closed filtered public projection.
- [ ] E2E journey — Enable fog, Reveal/Hide, hide/show token, save/restart, explicitly Show encounter after cold start, verify private encounter fields never appear publicly.
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

**Approval:** pending
