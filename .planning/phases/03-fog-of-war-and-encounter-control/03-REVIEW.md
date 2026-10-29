---
phase: 03-fog-of-war-and-encounter-control
reviewed: 2026-10-29T20:30:00Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - src/backend/Encounters/EncounterService.cs
  - src/backend/Maps/MapService.cs
  - src/backend/Program.cs
  - src/backend/PresentationState.cs
  - src/renderer/src/map/fogMask.mjs
  - src/renderer/src/map/MapCanvas.tsx
  - src/renderer/src/map/canvasPolicy.mjs
  - src/renderer/src/contracts.mjs
  - src/renderer/src/PublicDisplay.tsx
  - src/renderer/src/map/MapEditor.tsx
  - src/main.ts
  - src/backend.tests/EncounterServiceTests.cs
  - scripts/e2e.mjs
findings:
  critical: 1
  warning: 4
  info: 0
  total: 5
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-10-29T20:30:00Z  
**Depth:** deep  
**Files Reviewed:** 13  
**Status:** issues_found

## Summary

Reviewed Phase 3 source changes against the Phase 2 baseline and the phase context, research, summaries, and UI contract. The public fog is a presentation mask over a full terrain asset delivered to the public renderer, so it does not protect unrevealed source-art information. Additional correctness gaps affect simultaneous fog gestures, pointer cancellation cleanup, tie-order mutations, and editing partially unset HP.

## Critical Issues

### CR-01: Public renderer receives the complete unrevealed map asset

**File:** `src/renderer/src/PublicDisplay.tsx:5,28-40`; `src/renderer/src/contracts.mjs:13-14`
**Issue:** The public DTO retains the built-in `tavern.svg` asset identifier and `PublicDisplay` loads and renders that complete source image beneath a client-side alpha mask. Anyone able to inspect the public renderer/resources or read the image can recover all unrevealed terrain; the mask changes pixels only in the visible composition and is not an information boundary. This contradicts the privacy requirement to keep unrevealed information off the player display and the research warning against delivering source pixels in a bypassable form.
**Fix:** Produce a public-safe raster/tileset with unrevealed pixels removed or irreversibly blacked out on the trusted side, and return/render that sanitized projection rather than the original full source asset. Keep the opaque mask as a display safeguard, not the privacy control.

## Warnings

### WR-01: Concurrent async canvas redraws can apply stale geometry after newer state

**File:** `src/renderer/src/map/MapCanvas.tsx:25-40,54`
**Issue:** `render` removes and rebuilds children while awaiting asset loads, and the prop effect starts redraws without serialization or generation checks. A slow earlier redraw can resume after a newer redraw and append stale map/tokens/mask, causing the DM view to disagree with the persisted/public state during rapid edits or tool changes.
**Fix:** Serialize redraws or assign each redraw a generation token and abandon stale work after every `await`; avoid mutating/destroying the scene concurrently.

### WR-02: Pointer cancellation clears gesture flags but leaves brush preview graphics behind

**File:** `src/renderer/src/map/MapCanvas.tsx:42-43`; `src/renderer/src/map/canvasPolicy.mjs:32-36`
**Issue:** `pointercancel` invokes `panEnd` only. Its callback resets `painting` and `stamps` but does not destroy `preview`; unlike normal `finish`, a cancelled brush gesture leaves the preview Graphics in the world and can leave a stale brush circle visible until another redraw. Cancellation should discard the gesture and its visual state.
**Fix:** Use a shared cancel routine that resets gesture state and destroys/clears `preview`; test that cancellation removes the preview without submitting a stroke.

### WR-03: Tie-order swap is two non-atomic persisted commands

**File:** `src/renderer/src/map/MapEditor.tsx:172-181`; `src/backend/Encounters/EncounterService.cs:142-143`
**Issue:** Swapping adjacent actors persists the first actor's order before sending the second update. If the second request fails, the first write remains, so the UI reports failure while the saved initiative order has changed. The service also permits duplicate tie-break values, which make the intended manual ordering ambiguous and fall back to collection order.
**Fix:** Add a single authenticated backend operation that atomically swaps/reorders the tied group and validates unique bounded order values; update the UI from that one authoritative response.

### WR-04: Clearing an unset HP field silently converts it to zero

**File:** `src/renderer/src/map/MapEditor.tsx:315`
**Issue:** Saving HP uses `Number(input.value)` for both fields. An empty input becomes `0`, so an actor with unset HP—or a field deliberately cleared while editing—cannot remain unset and is silently persisted as zero. This conflicts with the UI contract that missing combat values remain unset and can misrepresent a creature as having 0 HP.
**Fix:** Preserve null for blank fields and support partial/unset HP in the command/model, or require both values with explicit validation and do not coerce blanks to zero.

---

_Reviewed: 2026-10-29T20:30:00Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_

## Final Disposition / Re-audit (Plans 03-05 and 03-06)

Re-audited the current source against the findings above, the 03-05/03-06 summaries, and the cited regression coverage. Historical findings remain above for traceability; their current disposition is:

| Finding | Disposition | Evidence |
| --- | --- | --- |
| CR-01 | **CLOSED** | Terrain is rasterized by the DM map editor (`MapCanvas.tsx:14-26`; `MapEditor.tsx:146-152`) and fog alpha is converted to opaque black in the generated PNG. Backend stores and projects the PNG through the `PublicMap` DTO (`MapService.cs:147-175`); visible tokens are projected with only `id,name,kind,color,x,y,artwork`. `PublicDisplay.tsx:31-33` renders `imageData` and allowlisted token art, with no source map import. `public.html:7` sets `default-src 'none'; img-src data:`. The package-smoke/E2E coverage asserts source-map fetch and image loads are blocked, exact DTO keys, PNG-only rendering, and black unrevealed pixels (`scripts/e2e.mjs:186-223`; 03-05 summary verification: npm tests, backend tests, build, package smoke, and E2E passed). Commits: `c1f833b`, `7a2061a`, `b7dda1d`. |
| WR-01 | **CLOSED** | Redraws now use monotonic generations and check freshness after awaited texture loads and before scene updates (`MapCanvas.tsx:42-58`). Regression coverage: `MapCanvas.lifecycle.test.mjs:41-47`; 03-06 summary records the lifecycle tests and build passing. Commit: `7c6018e` (with lifecycle tests in `f89e866`). |
| WR-02 | **CLOSED** | `pointercancel` invokes `cancelGesture`, which resets gesture state and removes/destroys preview graphics without submitting stamps (`MapCanvas.tsx:41,63-64`; `canvasPolicy.mjs`). Regression coverage: `MapCanvas.lifecycle.test.mjs:49-56`. Commits: `7c6018e`, `ffba0cf`. |
| WR-03 | **CLOSED** | Tie movement submits one complete actor ordering; backend validates exact unique membership and writes positional tie-break values in one transaction (`MapEditor.tsx:182-193`; `EncounterService.cs:147-152`; endpoint `Program.cs:90`). API/service regression tests cover authentication, invalid-order non-mutation, and reorder behavior per the 03-06 summary; `MapEditor.test.mjs:5-10` checks the one-request UI path. Commit: `ffd59ac`. |
| WR-04 | **CLOSED** | Blank current and maximum HP fields independently serialize as null (`MapEditor.tsx:327`), and backend validation/persistence accepts either nullable value (`EncounterService.cs:31,91-94,134-135`). UI regression: `MapEditor.test.mjs:12-16`; backend persistence/API coverage is included in `EncounterServiceTests.cs` and `EncounterApiTests.cs`, with the 03-06 summary recording the backend suite passed. Commit: `ffd59ac`. |

**Re-audit result:** No prior finding remains open, and no additional correctness or security issue was substantiated in this focused re-audit. The original frontmatter finding counts and status describe the historical review snapshot; they are intentionally retained rather than rewriting the record. Verification evidence above is from the phase summaries and commits; tests were not rerun during this re-audit.
