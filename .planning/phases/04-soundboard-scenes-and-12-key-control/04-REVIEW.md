---
phase: 04-soundboard-scenes-and-12-key-control
reviewed: 2026-10-30T03:08:26Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - src/main.ts
  - src/preload.cts
  - src/renderer/src/api.ts
  - src/renderer/src/audio/model.mjs
  - src/renderer/src/audio/playback.mjs
  - src/renderer/src/audio/AudioWorkspace.tsx
  - src/renderer/src/audio/cues.mjs
  - src/renderer/src/audio/CueEditor.tsx
  - src/renderer/src/audio/saveTestPolicy.mjs
  - src/renderer/src/map/MapEditor.tsx
  - scripts/e2e/fixtures.mjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-30T03:08:26Z  
**Depth:** deep  
**Files Reviewed:** 11  
**Status:** clean

## Summary

Final source re-review found no new code issue. CR-01 and WR-01's transactional import/quota and reclamation fixes are committed; the latest pending/promoted-file discard cleanup is present but uncommitted. WR-02's visibility/focus guard is present and tested, but its source/test/E2E changes are also uncommitted. The latest E2E uses a controlled `document.hasFocus()` seam, not a native OS focus transition, so native focus integration remains unverified. Current disposition: 0 critical, 0 warning, 0 info.

## Critical Issues

### CR-01: Invalid or failed imports leave unaccounted files in userData — CLOSED

**Severity:** BLOCKER  
**File:** `src/main.ts:114-130`; `src/renderer/src/audio/AudioWorkspace.tsx:55-66`
**Issue:** Main copies each selected file into `userData/audio` and adds its ID to `pendingAudioIds` before the renderer decodes it or saves its config. A decode/codec/duration rejection, canceled/failed config save, or renderer exit does not delete that copy or remove its pending ID. The 256 MiB check sums only `audioConfig.assets` (main.ts:125), so every rejected/failed import is excluded from accounting; repeating imports can grow app-owned storage without bound despite the advertised per-file/aggregate limits. `stat()` is also followed by a separate `copyFile()` (123-129), so a source that changes between validation and copying can exceed the checked size.
**Fix:** Make import transactional: copy to a temporary file while enforcing a byte limit on the bytes actually read, decode/validate before finalizing, and only then register/persist the opaque asset. Delete temporary/final files and pending records on every failure/cancel; compute aggregate usage from managed files or perform atomic quota reservations that include pending imports.

**Final disposition (2026-10-30): CLOSED.** `src/main.ts:147-173` stages actual copied bytes under `withAudioLock` and accounts committed plus pending reservations (`:158-169`). `src/main.ts:73-106` validates pending metadata, promotes staged assets with the config write under the same lock, rolls promotions back on config failure, and updates in-memory state only after persistence. Renderer cleanup discards failed imports (`AudioWorkspace.tsx:53-70`). The additional discard change at `src/main.ts:187-195` removes pending and promoted paths before releasing the reservation, but remains uncommitted. Core storage/quota work is committed in `87e3533`, `2e7771e`, and current `HEAD` `1f81246` (Plan 04-05 completion documentation). `npm test` re-run during this review passed 64 Node tests and 21 backend tests. Latest E2E `artifacts/e2e/2026-10-30T03-07-40.574Z-02584797/run.log` ends PASS; it covers invalid-WAV rejection followed by reimport, clearing/reclaiming and reimporting, and startup cleanup. Package smoke/build results are not newly re-run in this pass. The package-aware save seam remains gated by E2E opt-in and `app.isPackaged === false` (`main.ts:30-37`, `saveTestPolicy.mjs:1-6`); fixture selection remains E2E/unpackaged only (`main.ts:149-152`). Public preload exposes only presentation retrieval; audio IPC stays DM-only and sender-checked. No arbitrary filesystem path or public audio API found.

## Warnings

### WR-01: Clearing assignments never frees imported assets or quota — CLOSED

**Severity:** WARNING  
**File:** `src/renderer/src/audio/model.mjs:32-38`; `src/renderer/src/audio/AudioWorkspace.tsx:91,100`
**Issue:** `assignAsset` only appends assets and clearing a pad or deleting a bank only changes slots. No path removes an asset metadata record or its corresponding file. After 256 MiB of imports, users cannot import more even after clearing every pad/bank; files also remain permanently in userData. This conflicts with the UI contract that deleting a bank leaves files available only if assigned elsewhere and makes the aggregate limit a lifetime cap rather than a limit on imported/retained assets.
**Fix:** After a successful config write, compute the set of asset IDs referenced by remaining assignments and remove unreferenced metadata/files (or provide an explicit asset-management/reclaim action); ensure removal is sequenced after persistence so rollback cannot destroy still-referenced content.

**Final disposition (2026-10-30): CLOSED.** `src/main.ts:80-105` restricts committed assets to referenced assignments and deletes assets absent from new config only after successful config rename; cleanup failures do not invalidate a successful commit and startup reconciliation retries generated-file cleanup (`:64-71`). `reconcileManagedFiles` (`importPolicy.mjs:41-48`) removes only generated opaque names and stale pending/unreferenced assets, preserving unknown files. Commit `2e7771e` contains reclamation behavior. The latest E2E run `artifacts/e2e/2026-10-30T03-07-40.574Z-02584797/run.log` passes and covers last-reference reclamation, reimport, and preservation of unknown files. Current `npm test`: 64 Node + 21 backend passed.

### WR-02: Cue listener is active when the app window is not focused

**Severity:** WARNING  
**File:** `src/renderer/src/audio/AudioWorkspace.tsx:74-86`; `docs/phase-4-audio.md:11`
**Issue:** The component is intentionally kept mounted while hidden outside the Audio workspace, and its `window` keydown listener dispatches enabled chords without checking `document.hasFocus()`/visibility. As a result a chord can still fire while the DM window is unfocused (for example, when another application is active); this contradicts the operator documentation that cues work only while this app window is active and can unexpectedly play audio or publish a scene when the user intended the chord for another app. The app-wide listener can remain mounted, but it must verify the owning window is focused before dispatch.
**Fix:** Return early unless the DM document is focused and visible (and verify capture handling remains usable); add an E2E check that focus another window/context and confirm the chord does not dispatch, then restore focus and confirm it does.

**Final disposition (2026-10-30): CLOSED (with native-focus limitation).** `src/renderer/src/audio/cues.mjs:49-51` requires visible and focused document state; `AudioWorkspace.tsx:78-80` checks before cue matching/dispatch. `cues.test.mjs:35-40` covers focused, unfocused, hidden, and absent documents. `scripts/e2e.mjs:78,127-145` injects a controlled document focus seam, suppresses the assigned chord with focus false (`:127-131`), restores focus, and confirms successful cue play (`:132-145`). Latest E2E `artifacts/e2e/2026-10-30T03-07-40.574Z-02584797/run.log` completes PASS. These source/test/E2E changes are in the current working tree and uncommitted; this confirms the document-state contract, not a native OS focus transition.

## Re-audit evidence

- Relevant committed storage history includes `87e3533`, `2e7771e`, and current `HEAD` `1f81246`. `git status --short` confirms `src/main.ts`, `src/renderer/src/audio/AudioWorkspace.tsx`, `src/renderer/src/audio/cues.mjs`, `src/renderer/src/audio/cues.test.mjs`, and `scripts/e2e.mjs` remain modified/uncommitted; do not describe these latest deltas as committed. Re-run `npm test`: 64 Node + 21 backend passed. Build/package smoke were not re-run in this pass. Latest E2E artifact directory is `artifacts/e2e/2026-10-30T03-07-40.574Z-02584797`; its `run.log` ends with PASS.
- Save seam reviewed in `src/main.ts:30-37`, `src/renderer/src/audio/saveTestPolicy.mjs:1-16`, and `scripts/e2e/fixtures.mjs:20,44-60`; it is gated by unpackaged E2E state and its injected audio path is only consumed by the DM import handler in E2E mode. No public preload leakage or general path-selection renderer API found.
- Import/storage review: `src/main.ts:64-106,134-195`, `src/renderer/src/audio/importPolicy.mjs:5-49`, and `src/renderer/src/audio/AudioWorkspace.tsx:30,53-70`. Verified serialized staging and quota reservations, actual streamed-byte limits, pending registration after successful copy, failure/unmount discard, config promotion rollback, generated-name-only pruning, quota reclamation after successful save, and opaque ID/metadata checks for staged additions. Packaged-state gating of the E2E save seam remains unchanged and covered by `src/main.test.mjs`.
- Cue focus guard: source at `src/renderer/src/audio/cues.mjs:49-51`, `AudioWorkspace.tsx:78-80`, tests at `src/renderer/src/audio/cues.test.mjs:35-40`, and E2E assertions at `scripts/e2e.mjs:78,127-145`; these changes are uncommitted in this checkout. The E2E run proves simulated document focus handling and focused dispatch, not native window switching. Invalid-WAV rejection and reimport are asserted at `scripts/e2e.mjs:105-110`.

---

_Reviewed: 2026-10-30T03:08:26Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
