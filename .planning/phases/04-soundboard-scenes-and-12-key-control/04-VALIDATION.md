# Phase 4 Validation Matrix

Phase 3 verifier report: 4/4 truths passed after the shared map publication gate; automated phase checks passed. The formal GSD init remains stale and no UAT approval is claimed. Phase 4 planning does not modify Phase 3 verification or project state.

| Task ID | Requirement | Validation | Command / evidence |
|---|---|---|---|
| 04-01-01 | AUD-01 | DM-only native picker, opaque app-owned asset persistence, generated fixture import and restart, no renderer path/public API exposure | `npm test`; `npm run test:e2e` |
| 04-01-02 | AUD-01 | Exact 12 stable slots; default/final bank and max-bank policies; bounds, malformed settings and missing-file retention | `npm test` |
| 04-02-01 | AUD-01 | WebAudio gesture, fresh sources, cache/duration/voice bounds, gains, loop, stop-all and cleanup | `npm test` |
| 04-02-02 | AUD-01 | Approved DM-only responsive UI; 12 pads, bank/import/missing/restart and public privacy E2E | `npm run test:e2e` |
| 04-03-01 | AUD-02 | Chord normalization, uniqueness, persisted mappings, capture/reset and input/IME/repeat/defaultPrevented filters | `npm test` |
| 04-03-02 | AUD-02 | Closed cue union; explicit scene show; saved clean map only; fog-safe projection and blackout error semantics | `npm test` |
| 04-03-03 | AUD-02 | Isolated shortcut/cue E2E, persistence, typing/canvas behavior, public separation and truthful support docs | `npm run test:e2e` |
| 04-04-01 | AUD-01 | E2E-only explicit save delay/fail-once seam is inactive without mode gate, bounded, and one-shot | `npm test` — PENDING |
| 04-04-02 | AUD-01 | Delayed pending/disabled UI, failed save rollback to persisted 100%, later saved/re-enabled status, cue persistence after restart | `npm run test:e2e` — PENDING |

## Four-source coverage audit

| Source | Item | Plan | Status |
|---|---|---|---|
| GOAL | Control ambience, sound effects and presentation cues with pads or configurable keyboard shortcuts | 04-01, 04-02, 04-03 | COVERED |
| REQ | AUD-01 user-provided sounds, 12-pad banks, volume, loop, one-shot, stop-all | 04-01, 04-02 | COVERED |
| REQ | AUD-02 persistent shortcut cues without needless typing disruption | 04-03 | COVERED |
| RESEARCH | No dependencies; WebAudio; DM picker-only import; main-owned persistence and opaque IDs | 04-01, 04-02 | COVERED |
| RESEARCH | Decode/size/duration/cache/voice bounds; private/public isolation; lifecycle cleanup | 04-01, 04-02 | COVERED |
| RESEARCH | Keyboard focus/IME/repeat/defaultPrevented guards; safe existing cue operations | 04-03 | COVERED |
| CONTEXT | D-01: Exactly twelve stable slots, one default, maximum twelve named banks, final bank protected | 04-01, 04-02 | COVERED |
| CONTEXT | D-02: Master/pad volume, one loop, eight one-shots and immediate idempotent Stop All | 04-02 | COVERED |
| CONTEXT | D-03: Picker-only candidate formats, import limits, decode acceptance and missing-file recovery | 04-01, 04-02 | COVERED |
| CONTEXT | D-04: App-owned opaque assets, safe metadata and atomic path-free configuration | 04-01, 04-03 | COVERED |
| CONTEXT | D-05: Unique in-app modifier chords, safe target union and capture/conflict/clear/reset | 04-03 | COVERED |
| CONTEXT | D-06: Editable/IME, cue and canvas keyboard arbitration | 04-03 | COVERED |
| CONTEXT | D-07: Gesture-started private Web Audio, tracked gains/stop lifecycle and silent restart | 04-01, 04-02 | COVERED |

## Phase-level commands

- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run package:smoke`

E2E audio fixture: deterministic generated short WAV. Picker injection is permitted only when `DUNGEON_DEPUTY_E2E=1`; E2E uses isolated app userData. Automated playback state does not prove physical speaker output. Record actual host/platform/codec exercised; no Linux/macOS or hardware result is implied.
