---
phase: 04-soundboard-scenes-and-12-key-control
plan: 03
subsystem: private-audio
tags: [electron, react, keyboard, cues, privacy, e2e]
requires:
  - phase: 04-01
    provides: DM-only persisted audio settings and 12-pad playback
  - phase: 03
    provides: sanitized saved-map publication and fog/token filtering
provides:
  - Persistent, unique, validated in-app cue chords with capture, clear, reset and focus guards
  - Typed cue dispatch for pad, explicit scene Show, clean saved encounter Show, and blackout
  - Isolated Electron coverage for cue persistence, dispatch, refusal and public privacy
affects: [AUD-02, phase-04-audio]
actuals:
  tokens: 8161
  tasks: 3
  commits: 3
commits: 3
plan_head_before: b1a738db670ac26f1dfd65caac382fbf37805dd9
plan_head_after: 30c917d054b45cc3965f621f9219a4fd8f29b7fe
tech-stack:
  added: []
  patterns: [strict cue-target union, app-window-only keydown routing, saved-state-only explicit publication]
key-files:
  created: [src/renderer/src/audio/cues.mjs, src/renderer/src/audio/cues.test.mjs, src/renderer/src/audio/CueEditor.tsx, docs/phase-4-audio.md]
  modified: [src/renderer/src/audio/model.mjs, src/renderer/src/audio/AudioWorkspace.tsx, src/renderer/src/map/MapEditor.tsx, src/renderer/src/MapEditor.test.mjs, scripts/e2e.mjs, package.json]
key-decisions:
  - Keep cues app-window-only and private; public preload and presentation DTO remain unchanged.
  - Current encounter cues refuse dirty or unavailable maps and use the existing filtered saved-map publication route without saving drafts.
  - Keep AudioWorkspace mounted but hidden outside Audio so the dashboard's private chords remain active in other workspaces.
patterns-established:
  - Persist only normalized chords and typed allowlisted targets; reject all colliding persisted bindings rather than selecting a winner.
  - Reuse `/api/show/{id}`, `/api/map/show-encounter`, and `/api/blackout`; never publish private selection or uncommitted map content.
requirements-completed: [AUD-02]
coverage:
  - id: D1
    description: Unique persistent app-window chords support pad playback and explicit allowlisted scene/blackout cues while guarding editable/IME events.
    requirement: AUD-02
    verification:
      - kind: unit
        ref: src/renderer/src/audio/cues.test.mjs; npm test
        status: pass
      - kind: e2e
        ref: npm run test:e2e (pad cue after restart, explicit scene Show, blackout)
        status: pass
    human_judgment: false
  - id: D2
    description: Current encounter cues publish only clean persisted map state through the existing fog/token-filtered route and refuse dirty edits.
    requirement: AUD-02
    verification:
      - kind: e2e
        ref: npm run test:e2e (saved current map publication and dirty-map refusal)
        status: pass
    human_judgment: false
  - id: D3
    description: Public preload and presentation remain free of private cue/audio metadata; canvas navigation and editing remain covered.
    requirement: AUD-02
    verification:
      - kind: unit
        ref: npm test (public DTO/preload and canvas keyboard suites)
        status: pass
      - kind: e2e
        ref: npm run test:e2e (public state and existing canvas keyboard behavior)
        status: pass
    human_judgment: false
duration: 18min
completed: 2026-10-30
status: complete
---

# Phase 04 Plan 03: Persistent Safe Cue Shortcuts Summary

**Persistent private Ctrl/Cmd + modifier cue bindings now dispatch soundboard pads and explicit scene, saved-map, and blackout actions without publishing dirty drafts or exposing cue metadata publicly.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-10-30T00:42:00Z (approximate session boundary)
- **Completed:** 2026-10-30
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added strict shortcut normalization, event filtering, typed target validation, duplicate rejection on reload, and the private cue editor with capture/cancel/clear/reset workflows.
- Integrated cue actions with existing audio playback, explicit allowlisted scene Show, persisted current-map publication, and authoritative blackout. Dirty/no-map cases refuse without a draft save.
- Added restart and safe-publication E2E coverage and operator documentation with honest Windows automated/runtime limits and no physical-speaker/macOS claims.

## Task Commits

1. **Task 04-03-01: Validate and persist safe unique shortcut bindings** — `11c9bd7`
2. **Task 04-03-02: Dispatch cues only through existing safe scene and encounter operations** — `b7e8606`
3. **Task 04-03-03: Verify keyboard and cue workflows end-to-end and document support boundaries** — `30c917d`

## Files Created/Modified

- `src/renderer/src/audio/cues.mjs` and `cues.test.mjs` — strict chord/target/event validation and cue dispatch tests.
- `src/renderer/src/audio/CueEditor.tsx` — private shortcut capture, target selection, conflict feedback, clear and confirmed reset.
- `src/renderer/src/audio/model.mjs`, `AudioWorkspace.tsx` — validate/persist cue settings and route matching app-window chords.
- `src/renderer/src/map/MapEditor.tsx`, `MapEditor.test.mjs` — saved-only current-map action and safe scene/blackout routing.
- `scripts/e2e.mjs` — persistence, keyboard cue dispatch, scene/blackout and dirty-current-map refusal.
- `package.json` — include nested audio tests in `npm test`.
- `docs/phase-4-audio.md` — operator workflow, runtime/audio limits, verification boundaries.

## Decisions Made

- Keep keyboard hooks inside the private dashboard renderer, never use OS/global shortcuts, and mount the audio workspace hidden while other dashboard workspaces are active.
- Current map cue calls the existing `/api/map/show-encounter` operation only after a persisted map is present and dashboard edits are clean; it never invokes draft save.
- Preserve the existing public preload/DTO; no public API or backend contract expansion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected current-encounter response handling**
- **Found during:** Task 04-03-02
- **Issue:** The existing `/api/map/show-encounter` route returns public presentation data, not a `MapState`; treating it as a map caused a renderer error after successful publication.
- **Fix:** Consume the route response as `Presentation` and update only public presentation status.
- **Files modified:** `src/renderer/src/map/MapEditor.tsx`, `src/renderer/src/MapEditor.test.mjs`
- **Verification:** `npm test`, `npm run test:e2e`
- **Committed in:** `b7e8606`

**2. [Rule 3 - Blocking] Kept cues active in other dashboard workspaces**
- **Found during:** Task 04-03-03
- **Issue:** Conditional unmounting of AudioWorkspace removed the keydown listener in map/scenes workspaces, so registered cues were not dashboard-wide.
- **Fix:** Keep the private AudioWorkspace mounted and hide it outside Audio mode.
- **Files modified:** `src/renderer/src/map/MapEditor.tsx`
- **Verification:** `npm run test:e2e` confirms current-map cues from Battle map and explicit scene/blackout dispatch.
- **Committed in:** `b7e8606`

**3. [Rule 3 - Blocking] Avoided a non-copied renderer module dependency from the main-process model**
- **Found during:** Task 04-03-03
- **Issue:** Importing renderer `contracts.mjs` from cue validation made Electron main fail to load because that renderer module is not copied beside compiled main output.
- **Fix:** Keep cue scene validation as a closed local ID allowlist; no new package or IPC surface.
- **Files modified:** `src/renderer/src/audio/cues.mjs`
- **Verification:** `npm run build`, `npm run test:e2e`, `npm run package:smoke`
- **Committed in:** `11c9bd7`

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking issues). All were required to preserve operation and boundary correctness; no feature scope expansion.

## TDD Gate Compliance

Tasks 04-03-01 and 04-03-02 were marked `tdd="true"`. Behavioral tests were written before implementation work began, but no dedicated `test(04-03)` RED commits were made; tests and implementation were combined in task commits. The first initial test run failed at module import (not a target assertion), so it is not valid RED evidence under the canonical TDD gate. Later failures in duplicate/focus tests exposed real assertions and were fixed, but do not substitute for a persisted RED commit. This is a TDD discipline violation; the final suite is green, but the required RED/GREEN commit sequence is absent.

## Issues Encountered

- One E2E attempt collided with a concurrently running package smoke build and could not publish its isolated backend. Rerunning E2E sequentially passed. A separate E2E failure surfaced the incorrect show-encounter response assumption and was fixed above.
- One initial unit run failed an existing source-contract assertion because the new saved-map cue intentionally uses the existing `show-encounter` route; the test was updated to assert the saved-map route and dirty refusal.

## Verification

- `npm test` — PASS, 54 Node tests and 21 backend tests, zero failed/skipped.
- `npm run build` — PASS; Electron/TypeScript/Vite and .NET Release build, 0 backend warnings/errors.
- `npm run test:e2e` — PASS; persistent pad chord, explicit scene cue, blackout, saved current map cue, dirty map refusal, existing keyboard/public privacy flows.
- `npm run package:smoke` — PASS; Windows x64 packaged backend round-trip, allowlist and black-until-Show.
- Physical speaker output, macOS, and HDMI/hardware behavior remain unverified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AUD-02 implementation and automated verification are complete. Private cue controls remain inside the DM window and public projection remains sanitized.
- Hardware output and unsupported runtime codecs/platforms remain unverified; no such claims are made.

## Self-Check: PASSED

- All 10 implementation/documentation paths exist; all three task commits (`11c9bd7`, `b7e8606`, `30c917d`) are ancestors of HEAD.
- Measured plan range contains 3 commits from `b1a738db670ac26f1dfd65caac382fbf37805dd9` through `30c917d054b45cc3965f621f9219a4fd8f29b7fe`.
- Stub scan found no new TODO/FIXME or placeholder implementation. Existing empty HP/initiative input placeholders are intentional input hints, not missing functionality.

---
*Phase: 04-soundboard-scenes-and-12-key-control*
*Completed: 2026-10-30*
