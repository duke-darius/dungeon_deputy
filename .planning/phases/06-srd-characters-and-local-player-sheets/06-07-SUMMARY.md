---
phase: 06-srd-characters-and-local-player-sheets
plan: 07
subsystem: adversarial-verification-and-uat
tags: [e2e, package-smoke, offline, security-review, uat]
requires:
  - phase: 06-01
    provides: Source-cited server-authoritative bounded character records
  - phase: 06-02
    provides: Closed supported-rules registry and explicit unavailable capabilities
  - phase: 06-03
    provides: Opt-in LAN pairing, single-use invites, and scoped identities
  - phase: 06-04
    provides: Assignment-only player sheet projections and closed commands
  - phase: 06-05
    provides: Authenticated Hub and minimized public/assigned publication
  - phase: 06-06
    provides: Electron display and player browser SignalR lifecycle
provides:
  - Two independent assigned browser-context adversarial E2E coverage
  - Offline-observed renderer execution and packaged player-asset/CSP checks
  - Operator setup, transport warning, test evidence, and outstanding UAT checklist
affects: [phase-6-uat, CHAR-01, CHAR-02, CHAR-03, CHAR-04]
actuals:
  tokens: 7600
  tasks: 0
  commits: 0
  plan_head_before: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
  plan_head_after: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
tech-stack:
  added: []
  patterns: ["isolated-player-browser-partitions", "renderer-offline-network-observation", "exact-assignment-payload-assertions", "physical-uat-evidence-gate"]
key-files:
  created:
    - scripts/e2e/player-lan.test.mjs
    - docs/phase-6-player-sheets.md
  modified:
    - scripts/e2e.mjs
    - scripts/e2e/fixtures.mjs
    - scripts/package-smoke.mjs
    - src/backend.tests/PlayerSessionTests.cs
    - src/backend/PlayerSessions/PlayerListenerService.cs
    - docs/known-limitations.md
key-decisions:
  - "Keep CHAR-01 through CHAR-04 unchecked: CHAR-01's source-backed rules subset remains narrow, and physical two-phone/operator transport UAT was not performed."
  - "Run adversarial local integration with two distinct browser storage partitions and independently issued grants; do not treat it as physical-phone evidence."
  - "Keep default LAN HTTP explicitly unencrypted; require a trusted private-network opt-in and operator review rather than implying TLS or firewall protection."
  - "Local automated verification does not count as physical-phone or operator transport acceptance."
patterns-established:
  - "Assert exact player DTO keys and use separate identity/browser state for assignment isolation tests."
  - "Observe and block nonlocal renderer HTTP(S) requests in E2E offline mode; record external-origin attempts as failures."
requirements-completed: []
coverage:
  - id: AUTO-E2E
    description: Two isolated players and the DM are exercised for invite replay, assignment-only reads/actions, hidden/combat denial, reconnect, revoke/session stop, approved scene/blackout push, and diagnostics leakage.
    verification:
      - kind: unit
        ref: scripts/e2e/player-lan.test.mjs; src/backend.tests/PlayerSessionTests.cs
        status: pass
      - kind: e2e
        ref: scripts/e2e.mjs; artifacts/e2e/2026-11-07T10-31-39.206Z-634c073d
        status: pass
    human_judgment: true
    rationale: Local isolated browser contexts and same-host private-interface traffic are not actual phones or Wi-Fi/firewall acceptance.
  - id: PACKAGE
    description: Offline/package smoke validates packaged player assets, embedded SignalR runtime, strict LAN CSP, and local backend/SRD flows.
    verification:
      - kind: other
        ref: npm run package:smoke
        status: pass
    human_judgment: true
    rationale: Windows x64 only; packaged smoke does not establish phone, macOS, firewall, or TLS behavior.
  - id: UAT
    description: Physical two-phone private-Wi-Fi and operator unencrypted-HTTP risk review.
    verification:
      - kind: human
        ref: docs/phase-6-player-sheets.md
        status: pending
    human_judgment: true
    rationale: No physical phones or operator transport review were available in this run.
metrics:
  duration: "not measured"
  completed: 2026-11-07
  status: blocked-pending-human-verify-and-feature-gap
---

# Phase 6 Plan 7: Adversarial Automation and UAT Checkpoint Summary

**Added adversarial two-player local-browser verification, offline/network observation, packaged-player checks, and a truthful phone/operator UAT guide; held Phase 6 open.**

## Automated work and evidence
- Added `scripts/e2e/player-lan.test.mjs` assertion helpers and independent browser pairing contexts with separate persistent partitions and separate single-use grants.
- Expanded E2E coverage for invitation replay, exact assigned-sheet shape, assignment-ID substitution, private-route denial, cross-player inventory access/removal, forged HP/initiative/conditions/resources, revocation, session-stop cache clearing, and anonymous/revoked Hub denial.
- Verified both player browser contexts and the table display receive approved scene and blackout events; blackout clears the prior scene title. Reconnect tests obtain current assigned/public snapshots without polling.
- Added restrictive origin-scoped player-page CSP and packaged checks for the isolated player entry, SignalR runtime, absence of DM routes/shared-token strings, and the LAN CSP contract.
- Added deterministic E2E offline mode: renderer HTTP(S) requests to nonlocal origins are blocked/observed. No external-origin request was observed during the passing E2E. This is not an OS-wide network egress or internet-isolation test.
- Added expiry authorization coverage to `PlayerSessionTests`; existing service tests also cover invite expiry, throttling, replay, session stop, restart, and revocation.
- Updated `docs/phase-6-player-sheets.md` and `docs/known-limitations.md` to record the tested scope, exact remaining gaps, unencrypted HTTP risk, and physical UAT checklist.

## Verification results
- `npm test` — **passed on final rerun**, 96 Node tests and 51 .NET tests.
- `npm run build` — **passed on final rerun**, TypeScript/Electron/Vite and .NET Release build; 0 warnings and 0 errors.
- `npm run test:e2e` — **passed after HP-sync follow-up**, evidence `artifacts/e2e/2026-11-07T10-46-23.433Z-521b5791`.
- `npm run package:smoke` — **passed** for Windows x64, including the packaged static player entry/SignalR bundle checks and local backend/SRD smoke. macOS is unverified.
- SignalR metadata gate — **passed** against live npm metadata for exact version 10.0.11, MIT license, official repository, corrected SHA-512 integrity, and no install lifecycle hooks; only this SignalR client was added.
- Local E2E was on a Windows x64 host using a same-machine private IPv4 interface, Electron DM/display, Node SignalR probe, and two isolated Electron/Chromium browser contexts. No actual phones, other Wi-Fi clients, router/firewall, or TLS were tested.

## Blockers and pending acceptance
- **CHAR-01 remains pending:** only the directly sourced level-1 Barbarian/Dwarf ability/proficiency/max HP/AC subset is implemented. Inventory is bookkeeping only; spell/resource mechanics and broader progression are unavailable.
- **CHAR-03 update (follow-up implementation):** DM current HP is now a per-player-assignment value, bounded by that character's calculated maximum, and exposed via the loopback desktop-token route only. The route publishes the target player's freshly authorized sheet through `PresentationPublisher`; player command schemas remain unable to set HP. Backend tests verify bounds, targeted assignment persistence, and that the other player's projection remains unchanged. E2E verifies an immediate connected-client HP push and unchanged other-player sheet; physical-phone test remains required. Resource/spell operations are unavailable.
- **CHAR-02/03/04 remain pending physical/operator UAT:** two actual phones must be tested on the intended private Wi-Fi, with interface/firewall behavior, assignment isolation, allowed actions, reconnect/revoke/session stop, display scene/blackout, and HTTP exposure reviewed.
- LAN HTTP is unencrypted and can be observed or interfered with by nearby network participants. There is no TLS/confidentiality claim. The operator must explicitly accept this risk before exposing invites.
- Task 2's human-verify checkpoint is **not satisfied**. This plan and Phase 6 are not complete; do not check off any CHAR requirement or advance Phase 6.
- The user subsequently authorized pushing the implementation to `git@github.com:duke-darius/dungeon_deputy.git`; publication status is recorded separately after the push attempt.

## Follow-up: DM-authoritative HP sync
- Added assignment-scoped `current_hp` persistence (defaults to calculated maximum), an authenticated loopback route, and DM assignment control. The separate LAN player command endpoint does not gain HP write capability.
- Follow-up verification details: a first `npm test` invocation transiently crashed its .NET host; a subsequent final `npm test` rerun passed all 96 Node and 51 .NET tests. `npm run build` and `npm run test:e2e` passed; E2E includes immediate HP push to the assigned Hub client and isolation from the other assignment. No physical phone UAT was performed.

## Self-Check: PASSED (summary integrity only)
- Summary, operator guide, adversarial test helper, and package checks exist.
- Automated test/build/E2E/package-smoke results match command outcomes.
- HEAD remains `e3de3a7eb15474cbfc3a092a5f2255c169e3da72`; no commit or push was performed.

---
*Phase: 06-srd-characters-and-local-player-sheets*
*Status: automated verification complete; blocked pending physical UAT/operator review and broader CHAR-01 support*
