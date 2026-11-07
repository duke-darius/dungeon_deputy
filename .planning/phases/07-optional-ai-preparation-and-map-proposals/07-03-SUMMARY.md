---
phase: 07-optional-ai-preparation-and-map-proposals
plan: 03
subsystem: ui
tags: [react, privacy, accessibility, proposals]
requires:
  - phase: 07-02
    provides: Five validated proposal contracts and catalog-resolved SRD references
provides:
  - DM-only, fresh-consent Preparation workspace for all five proposal types
  - Transient editable private preview with separately labeled local SRD provenance
  - Geometry editing, explicit regenerate/discard confirmation, and offline-safe navigation
affects: [07-04, 07-05]
actuals:
  tokens: 7800
  tasks: 3
  commits: 0
  plan_head_before: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
  plan_head_after: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
tech-stack:
  added: []
  patterns: [consent-reset-on-payload-change, DM-only local API transport, transient proposal copy-on-edit]
key-files:
  created:
    - src/renderer/src/ai/PreparationWorkspace.tsx
    - src/renderer/src/ai/preparationApi.ts
    - src/renderer/src/ai/proposalView.mjs
    - src/renderer/src/ai/proposalView.d.mts
    - src/renderer/src/ai/preparation.test.mjs
  modified:
    - src/renderer/src/App.tsx
    - src/renderer/src/styles.css
    - src/main.ts
    - src/main.test.mjs
key-decisions:
  - "Keep preview and edits only in renderer state; no acceptance or campaign mutation is exposed in this plan."
  - "Do not load campaign values for comparisons; show proposed fields against an explicit not-loaded baseline to preserve the privacy boundary."
  - "Invalidate consent whenever prompt, request kind, or selected local records change."
patterns-established:
  - "Only the DM renderer uses the private AI API paths; public and player surfaces remain unchanged."
  - "Proposal edits produce copied transient objects and are discarded only through named confirmation."
requirements-completed: [AI-01, AI-02, AI-03]
coverage:
  - id: D1
    description: "DM Preparation provides all five request types and sends only the bounded prompt plus explicitly selected local SRD IDs after current per-request consent."
    requirement: AI-01
    verification:
      - kind: unit
        ref: "src/renderer/src/ai/preparation.test.mjs#generation requires current affirmative consent and sends only explicit prompt and local ids"
        status: pass
    human_judgment: false
  - id: D2
    description: "Proposal preview is transient/private, distinguishes AI suggestions from local catalog provenance, supports editing and geometry controls, and cannot accept or publish."
    requirement: AI-02
    verification:
      - kind: unit
        ref: "src/renderer/src/ai/preparation.test.mjs; src/renderer/src/contracts.test.mjs"
        status: pass
    human_judgment: true
    rationale: "Automated source and contract tests prove renderer separation and state-copy behavior; visual/keyboard usability at 320px and 200% zoom was not manually inspected."
  - id: D3
    description: "Disabled, unconfigured and failed AI states preserve access to local campaign workspaces without exposing provider secrets."
    requirement: AI-03
    verification:
      - kind: integration
        ref: "node --test src/main.test.mjs src/renderer/src/ai/preparation.test.mjs"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
duration: "approximately 20 min"
completed: 2026-11-07
status: complete
---

# Phase 7 Plan 3: Private Preparation UI Summary

**The DM-only Preparation bench offers five consent-gated request types and a transient, editable private preview with catalog-backed references and no campaign mutation path.**

## Performance

- **Duration:** approximately 20 min
- **Started:** 2026-11-07T15:43:00Z
- **Completed:** 2026-11-07
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Added a private Preparation entry with local-only provider status, five request types, bounded prompt, selectable local SRD records, the full external-sharing disclosure, and fresh affirmative consent on every request.
- Added five-kind transient preview, copy-on-edit text fields, application-rendered bounded geometry preview with type/coordinate/dimension/label/remove/add controls, separated local source provenance, and explicit replacement/discard confirmations. No accept, publish, or campaign mutation control is present.
- Kept existing local campaign workspaces reachable and expanded the narrow DM IPC path allowlist for the already-existing five-kind API; no public/player preload or renderer access was added.

## Task Commits

No commits were made, per the explicit user instruction. HEAD remained unchanged at `83dc60eef2c049e0d2b193cf7045eb2184344e6b`.

1. **Task 1: Specify the privacy-gated private request and offline status workflow** — uncommitted by request.
2. **Task 2: Implement private proposal review, provenance separation, and accessible edits** — uncommitted by request.
3. **Task 3: Match the command-desk responsive visual system and confirm renderer separation** — uncommitted by request.

## Files Created/Modified

- `src/renderer/src/ai/PreparationWorkspace.tsx` — DM-only request, consent, status, preview, edit, error and discard workflow.
- `src/renderer/src/ai/preparationApi.ts` — narrow local AI and SRD API wrappers.
- `src/renderer/src/ai/proposalView.mjs` / `.d.mts` — allowlisted consent payload and typed proposal field helpers.
- `src/renderer/src/ai/preparation.test.mjs` — privacy, consent, provenance, copy-edit and private-surface tests.
- `src/renderer/src/App.tsx` — DM-only workspace switch.
- `src/renderer/src/styles.css` — responsive preparation workspace and accessible controls.
- `src/main.ts` — allowlist only the existing local status and five AI generation routes for the DM command transport.
- `src/main.test.mjs` — route allowlist regression coverage.

## Decisions Made

- Kept generation, edit, adjust, regeneration and discard preview-only. Plan 07-03 adds no accept action, persistence, public projection, or campaign mutation.
- Campaign state is never loaded for a before/after comparison. The UI clearly states that campaign values were not loaded and identifies proposed values as unverified.
- Fresh consent is invalidated by changes to prompt, request kind, or selected records; retries require consent again.
- Provider model/key details remain hidden. Status is limited to configured, disabled, or unconfigured local state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Expanded the DM command route allowlist for all five existing proposal routes**
- **Found during:** Task 1
- **Issue:** The main-process narrow allowlist exposed only `/api/ai/status` and `/api/ai/npc`; four planned request types would have been denied by IPC.
- **Fix:** Added only the existing encounter, adventure, scene, and geometry endpoints to the DM-only allowlist, with a regression test. No AI paths were added to public/player preload.
- **Files modified:** `src/main.ts`, `src/main.test.mjs`
- **Verification:** Focused regression test failed on `/api/ai/encounter` before the fix, then passed in the 34-test targeted run.
- **Committed in:** Not committed per user instruction.

**2. [Rule 3 - Blocking Issue] Matched the UI prompt bound to the backend's 2,000-character limit**
- **Found during:** Task 1
- **Issue:** The initial form limit exceeded the existing API bound and could produce rejected requests.
- **Fix:** Limited the control and allowlisted payload helper to 2,000 characters, matching the backend contract; blank prompts do not submit.
- **Files modified:** `src/renderer/src/ai/PreparationWorkspace.tsx`, `src/renderer/src/ai/proposalView.mjs`
- **Verification:** Renderer tests and TypeScript/Vite/backend build pass.
- **Committed in:** Not committed per user instruction.

**3. [Rule 2 - Missing Critical Functionality] Reset affirmative consent when its enumerated payload changes**
- **Found during:** Task 1
- **Issue:** Consent could otherwise remain checked after prompt, type, or selected-record changes.
- **Fix:** Clear consent on each payload-affecting edit so the disclosure and current request are affirmatively reviewed together.
- **Files modified:** `src/renderer/src/ai/PreparationWorkspace.tsx`
- **Verification:** Consent payload and UI contract tests pass.
- **Committed in:** Not committed per user instruction.

---

**Total deviations:** 3 auto-fixed (2 Rule 2, 1 Rule 3). User instruction against commits overrides the plan's usual per-task and metadata commits.
**Impact on plan:** These directly required route availability, backend-compatible bounds, and consent correctness; scope remains within the private UI and its existing transport.

## Issues Encountered

- Initial test-first run reported a missing helper module before implementation. A later main-process route regression test produced a behavior-level failure for the missing private endpoint and passed after the narrow allowlist correction.
- No real provider key or external provider/network request was used.
- The user-directed no-commit/no-push rule was followed; unrelated existing working-tree changes were not staged or reverted.

## Verification

- `node --test src/renderer/src/ai/preparation.test.mjs src/renderer/src/contracts.test.mjs src/main.test.mjs` — passed, 34 tests.
- `npm run build` — passed, including TypeScript, Electron, Vite, and backend build (zero backend warnings/errors).
- No live provider key/network was used. Phase 6 phone/operator UAT remains open and unverified.

## Next Phase Readiness

- The UI returns only transient proposal data and intentionally does not implement acceptance. Plan 07-04 can add the separate validated private-draft acceptance flow.
- Phase 6 physical phone/operator UAT remains outstanding; no Phase 6 completion claim is made.

## Self-Check: PASSED

- The summary and all 5 new UI/helper/test files exist.
- HEAD remained `83dc60eef2c049e0d2b193cf7045eb2184344e6b`; zero commits were made as requested.
- Focused UI/contract/main tests and `npm run build` passed.

---
*Phase: 07-optional-ai-preparation-and-map-proposals*
*Completed: 2026-11-07*
