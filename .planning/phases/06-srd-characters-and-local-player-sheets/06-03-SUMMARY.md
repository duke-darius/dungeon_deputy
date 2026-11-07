---
phase: 06-srd-characters-and-local-player-sheets
plan: 03
subsystem: player-sessions
tags: [dotnet, sqlite, kestrel, electron, react, pairing, security]
requires:
  - phase: 06-01
    provides: DM-authenticated character store and loopback desktop API
  - phase: 06-02
    provides: Bounded character record inputs and DM character workspace
provides:
  - One-time short-lived invite exchange to per-player random opaque credentials
  - SQLite-persisted invite/token hashes, assignments, expiry and revocation
  - Explicit interface-selected secondary HTTP listener with fail-closed shutdown
  - DM invite/session controls and a minimal local-browser join page
affects: [06-04, 06-05, 06-06, player-auth, lan-listener]
actuals:
  tokens: 6300
  tasks: 3
  commits: 0
  plan_head_before: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
  plan_head_after: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
tech-stack:
  added: []
  patterns: [atomic-single-use-invite, hashed-ephemeral-bearer, separate-opt-in-kestrel-listener, assignment-resolved-authorization]
key-files:
  created:
    - src/backend/PlayerSessions/PlayerSessionService.cs
    - src/backend/PlayerSessions/PlayerAuthorization.cs
    - src/backend/PlayerSessions/PlayerListenerService.cs
    - src/backend.tests/PlayerSessionTests.cs
    - src/backend.tests/PlayerSessionApiTests.cs
    - src/backend.tests/PlayerListenerTests.cs
    - src/renderer/player.html
    - src/renderer/src/player/JoinPage.tsx
    - src/renderer/src/player/player-main.tsx
    - src/renderer/src/player/player.css
  modified:
    - src/backend/Program.cs
    - src/main.ts
    - src/renderer/src/api.ts
    - src/renderer/src/characters/CharacterWorkspace.tsx
    - src/renderer/src/styles.css
    - vite.config.ts
key-decisions:
  - "Generate 192-bit, five-minute one-time invites and exchange only once for independent 256-bit, eight-hour player credentials; persist hashes only."
  - "Keep the loopback DM listener/token separate from a second opt-in Kestrel host bound to one active private interface."
  - "On session stop, process restart, revocation, or network-address change, invalidate grants; HTTP is explicitly warned as unencrypted."
  - "Use a copyable invite URL; add no QR encoder or package."
  - "No commits made per user instruction; Phase 6 and CHAR-02 remain incomplete pending physical phone/operator UAT."
patterns-established:
  - "Resolve entitlement from the presented opaque credential and current server-side assignment, never caller-selected character IDs."
  - "Use exact expected Origin checks only as defense-in-depth; Origin is not identity."
requirements-completed: []
coverage:
  - id: D1
    description: Single-use invites create distinct revocable player grants; only hashes persist, and stop/restart/revoke/expiry deny access.
    verification:
      - kind: unit
        ref: src/backend.tests/PlayerSessionTests.cs
        status: pass
      - kind: integration
        ref: src/backend.tests/PlayerListenerTests.cs
        status: pass
    human_judgment: true
    rationale: Local interface integration does not establish reachability or security on other devices or Wi-Fi networks.
  - id: D2
    description: DM explicitly starts/stops LAN access and displays a one-time invitation with an unencrypted-HTTP warning.
    verification:
      - kind: integration
        ref: src/backend.tests/PlayerSessionApiTests.cs
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: true
    rationale: Physical phone/browser usability, firewall behavior and operator acceptance remain unverified.
  - id: D3
    description: Browser join exchanges an invite, removes invite query from visible history, and keeps the issued credential in memory only.
    verification:
      - kind: integration
        ref: src/backend.tests/PlayerListenerTests.cs
        status: pass
    human_judgment: true
    rationale: No physical phone/browser UAT was performed; npm tests do not exercise external-device URL/history behavior.
metrics:
  duration: 48min
  completed: 2026-11-04
  status: complete
---

# Phase 6 Plan 3: Offline Player Pairing Summary

**Implemented an opt-in private-interface listener and one-time offline invite exchange that issues per-player revocable hashed credentials without exposing the desktop token.**

## Accomplishments
- Added SQLite session/invite/assignment lifecycle with atomic single-use exchange, five-minute invite expiry, eight-hour grant expiry, per-source attempt throttling, fixed-time digest checks and a two-assignment cap.
- Added a separate Kestrel HTTP host that is off by default, binds only to a selected active RFC1918/ULA interface, rejects unexpected Origin values, limits/strictly validates exchange bodies, and stops on session end, process shutdown or network-address change.
- Added DM-only interface/session/invite/revoke controls with masked-by-default copyable invite URLs and a clear unencrypted HTTP warning.
- Added a minimal LAN-hosted join page; invite query is removed from visible history on load, the player credential remains only in React memory, and no QR package was added.

## Security and scope notes
- The existing loopback desktop API remains protected by `DUNGEON_DEPUTY_TOKEN`; the LAN host has only health, join assets and invite-exchange routes. No desktop bearer token is sent to the player origin.
- Only invitation and token hashes are stored. Secondary-host framework logging is disabled to avoid logging invite-bearing request URLs.
- HTTP is unencrypted. The UI warns that nearby Wi-Fi users may observe or interfere with traffic; no TLS/confidentiality claim is made.
- Automated Kestrel tests bind to a private interface on this machine. This is not evidence of another device's reachability, phone behavior, firewall behavior, or operator acceptance. No phones were tested.
- Player sheets, player commands and live sync are outside this plan and are not claimed.

## TDD and Verification
- Added tests first; the initial focused run failed at compile time because the `PlayerSessions` domain did not yet exist.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~PlayerSession` — **passed**, 7 passed, 0 failed.
- `npm test` — **passed**, 79 Node tests and 42 .NET tests, 0 failed.
- `npm run build` — **passed**, TypeScript/Vite/Electron checks and backend Release build succeeded with 0 warnings and 0 errors.
- No `npm run test:e2e`, physical phone test, or external-LAN test was run for this plan.

## Files Created/Modified
- `src/backend/PlayerSessions/PlayerSessionService.cs` — invite/token hashing, session lifecycle, assignment resolution, expiry and revocation.
- `src/backend/PlayerSessions/PlayerAuthorization.cs` — default-deny assignment resolver.
- `src/backend/PlayerSessions/PlayerListenerService.cs` — private-interface enumeration and separate listener lifecycle.
- `src/backend/Program.cs` — loopback-authenticated DM session administration and shutdown cleanup.
- `src/backend.tests/PlayerSessionTests.cs`, `PlayerSessionApiTests.cs`, `PlayerListenerTests.cs` — lifecycle, security and listener tests.
- `src/main.ts` — renderer static root handoff and narrow DM command allowlist extension; desktop token remains main-process-only.
- `src/renderer/src/api.ts`, `src/renderer/src/characters/CharacterWorkspace.tsx`, `src/renderer/src/styles.css` — DM pairing controls and warning.
- `src/renderer/player.html`, `src/renderer/src/player/JoinPage.tsx`, `player-main.tsx`, `player.css` — phone-sized one-time invite entry.
- `vite.config.ts` — separate player renderer entry.

## Deviations from Plan
- No package installation or QR dependency was needed; the copyable invite fallback was used.
- Added `PlayerListenerTests.cs` to exercise same-host interface bind, replay denial, Origin defense and listener closure. This does not imply physical LAN support.
- Network-address change stops the listener/session and revokes grants fail-closed; physical interface/suspend behavior still needs verification.

## Remaining Scope
CHAR-02 and Phase 6 remain incomplete pending physical phone/operator verification and remaining player-sheet/live-sync plans. No commits were made. Pre-existing uncommitted Phase 4/5 and unrelated work was preserved.

## Self-Check: PASSED
- Summary and listed source/test/page files exist.
- Focused tests, full `npm test`, and `npm run build` claims match recorded command results.
- HEAD remains `e3de3a7eb15474cbfc3a092a5f2255c169e3da72`; no commit was created.

---
*Phase: 06-srd-characters-and-local-player-sheets*
*Completed: 2026-11-04*
