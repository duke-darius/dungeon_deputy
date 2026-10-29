---
phase: 03-fog-of-war-and-encounter-control
plan: 01
subsystem: map-visibility
tags: [fog-of-war, persistence, public-projection, pixi]
requires: [02-03]
provides: [fog-stroke-persistence, filtered-public-map-projection, dm-fog-controls]
affects: [03-02, 03-03]
tech-stack:
  added: []
  patterns: [transactional-map-document-updates, server-side-public-token-filtering, strict-public-allowlist]
key-files:
  created: [.planning/phases/03-fog-of-war-and-encounter-control/03-01-task1-red-evidence.json]
  modified: [src/backend/Maps/MapService.cs, src/backend/Program.cs, src/backend/PresentationState.cs, src/backend.tests/MapApiTests.cs, src/renderer/src/contracts.mjs, src/renderer/src/contracts.test.mjs, src/renderer/src/map/types.ts, src/renderer/src/map/MapCanvas.tsx, src/renderer/src/map/MapEditor.tsx, .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md]
decisions: [Fog defaults disabled for migrated maps; enabling fog starts with no revealed areas., Hidden tokens are omitted in a dedicated public-token DTO., Fogged public map uses a blank source image rather than exposing the complete source terrain.]
metrics:
  duration: 45m
  completed_date: 2026-10-29
  commits: 4
  plan_head_before: 2956e99f1ed377d1124a51b097b8119d6736ed71
  plan_head_after: f6091a3d7add8b6a26ad7cb86177fb7c670ed47d
status: incomplete
actuals:
  tokens: 10056
  tasks: 3
  commits: 4
---

# Phase 03 Plan 01: Fog Persistence and Projection Summary

Bounded fog/token visibility persistence and allowlisted public map projection landed with DM fog controls, but the brush rendering and lifecycle are not yet sufficient for safe, functional revealed-terrain presentation; plan remains incomplete.

## Completed Work

- Persisted fog-enabled state, ordered bounded reveal/hide stamps, and independent token visibility in the map document; migrated/new tokens default visible.
- Added authenticated fog-enable, stroke, token visibility, and explicit Show-encounter routes. Public token projection uses a dedicated DTO with no visibility property; projection hides the original source image whenever fog is active.
- Added public renderer contract validation for bounded fog strokes and forbidden private values.
- Added Reveal/Hide controls, brush-size input, fog confirmation, and initial Pixi map-space sample collection.
- Updated the Phase 3 validation matrix to record actual executed coverage and open gaps.

## Verification

- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` — passed, 15 tests.
- `node --test src/renderer/src/contracts.test.mjs` — passed, 6 tests.
- `node --test src/renderer/src/map/MapCanvas.lifecycle.test.mjs src/renderer/src/contracts.test.mjs` — passed, 12 tests.
- `npm run build` — passed (TypeScript, Electron, Vite, backend).
- `npm test` — passed (24 Node tests and 15 xUnit tests).
- RED evidence for the new public fog contract test was recorded and accepted by `gsd_run check tdd-red-evidence` (`RED_EVIDENCE_OK`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Avoid serializing unvalidated non-finite map values during validation**
- **Found during:** Task 1
- **Issue:** Existing `SaveCore` serializes before validating token coordinates, causing invalid infinity values to throw rather than return rejection.
- **Fix:** Move aggregate JSON-size measurement after coordinate and stroke validation.
- **Files modified:** `src/backend/Maps/MapService.cs`

### Plan Gaps / Deferred Issues

- Public fog rendering is not complete: the fogged projection safely omits the original image, but the current canvas only overlays translucent circles over a black rectangle. It does not reveal source terrain correctly, and hide/reveal compositing is not a safe mask implementation.
- Brush implementation does not yet finalize/cancel on all required Pixi lifecycle events or guarantee cleanup on tool switch; no dedicated brush lifecycle assertions were added.
- No HTTP integration coverage proves DM token authorization, persistence-before-publication, cold-start black, explicit Show, or live-refresh transitions.
- `03-VALIDATION.md` records these remaining gaps. Plan 03 still owns the integrated player-display/E2E proof.

## Known Stubs

| File | Reason |
|------|--------|
| `src/renderer/src/map/MapCanvas.tsx` | The fog overlay is a placeholder visual treatment; public fogged map drops its source art and revealed source terrain is not rendered. This blocks the plan's intended visible revealed-terrain result. |
| `src/renderer/src/map/MapCanvas.tsx` | Pointer cancel and tool-change cancellation/cleanup are not wired for active fog strokes; brush-specific lifecycle tests are absent. |

## Commits

| Hash | Description |
|------|-------------|
| `e1b1a96` | `test(03-01): add failing public fog projection test` |
| `be6742c` | `feat(03-01): persist and project fog visibility` |
| `64f7599` | `feat(03-01): add fog brush controls to map editor` |
| `f6091a3` | `test(03-01): document fog validation coverage` |

## Self-Check: PASSED

- All files listed above exist in the working tree.
- All four commits are ancestors of the current branch head.
- Existing `.planning/STATE.md` and `.planning/state.json` modifications, `.idea/`, and `tabletop_dm_gsd_brief.md` were not staged or changed by this plan execution.
