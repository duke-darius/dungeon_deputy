---
phase: 04-soundboard-scenes-and-12-key-control
plan: 07
subsystem: audio-import
tags: [streams, bounded-copy, error-handling, tests]
requires: [04-06]
provides: [async-copy-error-cleanup]
affects: [AUD-01]
tech-stack:
  added: []
  patterns: [stream/promises pipeline with a byte-counting Transform]
key-files:
  created: []
  modified:
    - src/renderer/src/audio/importPolicy.mjs
    - src/renderer/src/audio/importPolicy.test.mjs
    - .planning/phases/04-soundboard-scenes-and-12-key-control/04-VALIDATION.md
decisions:
  - Preserve the actual-byte limit by counting chunks in a Transform piped into the destination.
metrics:
  duration: 10m
  completed: 2026-10-30
  commits: 1
  plan_head_before: 832fefc5510872896a0ca1aa6e9b67af2ce09883
  plan_head_after: e2c1f496ee922578a0bbc4c751a9b1bfbf8c74cf
status: complete
actuals:
  tokens: 1233
  tasks: 1
  commits: 1
---

# Phase 4 Plan 7: Bounded audio-copy error lifecycle Summary

`copyBounded` now observes asynchronous destination errors through `stream/promises.pipeline` while enforcing the limit on bytes actually read and cleaning partial outputs.

## Completed

- Added an asynchronous failing Writable test asserting rejection with the original write error, partial destination removal, and destruction of both streams.
- Replaced manual write/drain/close handling with a byte-counting Transform and a pipeline that observes source, transform, and destination errors.
- Retained exclusive destination creation (`wx`), mode `0600`, empty-file rejection, byte-count return, and partial-file cleanup.
- Marked CR-02 closed in the AUD-01 validation matrix, linked to T-04-15.

## Verification

- RED: focused test failed before the implementation change.
- `node --test src/renderer/src/audio/importPolicy.test.mjs` — PASS (7 tests; includes exact-limit, over-limit, and async destination failure cases).
- `npm test` — PASS (68 Node tests; 21 backend tests).
- `npm run build` — PASS.
- `npm run test:e2e` — PASS (Windows; artifact `artifacts/e2e/2026-10-30T10-50-57.290Z-3788f949`).
- `npm run package:smoke` — PASS (Windows x64).

## Deviations from Plan

None. No packages added.

## Self-Check: PASSED

- SUMMARY file exists at the planned path.
- Task commit `e2c1f49` is an ancestor of HEAD.
