---
phase: 06-srd-characters-and-local-player-sheets
plan: 05
subsystem: realtime-security
tags: [signalr, npm-provenance, authorization, privacy]
requires:
  - phase: 06-03
    provides: Scoped player identities and opt-in LAN listener
  - phase: 06-04
    provides: Assigned player projections and command authorization
provides:
  - Audited exact-pinned SignalR browser client
  - Authenticated player and read-only display Hub identities
  - Current-assignment-checked scene, blackout, and assigned-sheet pushes
  - Event-driven Electron table-display updates without polling
affects: [06-06, signalr, realtime-security, player-sheets]
actuals:
  tokens: 9800
  tasks: 2
  commits: 0
  plan_head_before: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
  plan_head_after: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
tech-stack:
  added: ["@microsoft/signalr@10.0.11"]
  patterns: ["hub-path-only-query-token", "per-event-assignment-revalidation", "ephemeral-read-only-display-capability", "event-driven-publication"]
key-files:
  created:
    - src/backend/Realtime/PlayerHub.cs
    - src/backend/Realtime/PresentationPublisher.cs
    - src/backend/Realtime/PlayerCapabilityAuthenticationHandler.cs
    - src/backend/Realtime/PublicDisplayCredentialService.cs
    - src/backend.tests/PlayerHubAuthorizationTests.cs
  modified:
    - package.json
    - package-lock.json
    - src/backend/Program.cs
    - src/backend/PresentationState.cs
    - src/backend/PlayerSessions/PlayerListenerService.cs
    - src/renderer/src/player/PlayerWorkspace.tsx
    - src/renderer/src/PublicDisplay.tsx
    - src/renderer/src/api.ts
    - src/main.ts
    - src/preload.cts
    - scripts/e2e.mjs
    - scripts/e2e/signalr-package-gate.test.mjs
    - scripts/check-signalr-package.mjs
key-decisions:
  - "Correct the plan's SHA-512 transcription error only after authorized live registry verification; pin and install only @microsoft/signalr@10.0.11 after the exact metadata gate passes."
  - "Player capabilities are authenticated on the SignalR endpoint and revalidated against the current assignment for every snapshot and outbound event; no groups or client-selected recipients grant authority."
  - "The Electron public display receives a separate short-lived read-only capability. DUNGEON_DEPUTY_TOKEN remains in the main process and is never returned to a renderer or phone."
  - "Public players receive only approved scene/blackout status and their own sheet. Maps/other public presentation payloads are sent only to the authorized table display."
  - "LAN HTTP remains unencrypted and is explicitly warned as observable/interferable on the local Wi-Fi."
patterns-established:
  - "Parse SignalR access_token only on /api/player/hub and its negotiate route; secondary-host logging stays disabled to avoid credential-bearing transport URLs in logs."
  - "Publish only after the authoritative presentation state changes; re-resolve each player capability and assignment immediately before sending."
requirements-completed: []
coverage:
  - id: GATE
    description: Exact package metadata gate prevents install on any metadata or lifecycle-hook drift.
    verification:
      - kind: unit
        ref: scripts/e2e/signalr-package-gate.test.mjs
        status: pass
      - kind: other
        ref: node scripts/check-signalr-package.mjs
        status: pass
    human_judgment: false
  - id: HUB
    description: Authenticated player/display connections receive only recipient-appropriate snapshots/events; revocation and forged group invocation are denied.
    verification:
      - kind: unit
        ref: src/backend.tests/PlayerHubAuthorizationTests.cs
        status: pass
      - kind: e2e
        ref: scripts/e2e.mjs
        status: pass
    human_judgment: true
    rationale: E2E used a same-host private-interface listener and Node SignalR clients; it does not establish physical-phone behavior or external-LAN reachability.
metrics:
  duration: 2h
  completed: 2026-11-07
  status: complete
---

# Phase 6 Plan 5: Authenticated SignalR Publishing Summary

**Added scoped SignalR authentication and event-driven scene, blackout, and assigned-sheet updates, using the verified exact-pinned browser client.**

## Accomplishments
- Updated the expected registry integrity to the independently verified live metadata value after explicit user authorization. Re-ran the no-dependency gate; exact name/version/license/repository/integrity and no lifecycle hooks passed. Installed only `@microsoft/signalr@10.0.11` with scripts disabled.
- Added a SignalR Hub on the opt-in LAN host. Player access tokens resolve through current assignment authorization; Hub snapshots contain only the assigned sheet and a minimal scene/blackout projection. There are no client-selectable groups or recipient names.
- Added a short-lived, bounded, read-only Electron display capability minted only through the desktop-authenticated API. The shared desktop token remains in the main process.
- Added assignment revalidation before each outgoing player event, current sheet events after allowlisted player commands, and immediate access-revoked notifications. Public scene/blackout updates originate from authoritative `PresentationState` changes; display-only map payloads are not sent to player identities.
- Replaced player-sheet polling with SignalR snapshots, reconnect refresh, and pushed sheet/presentation updates. Table display changes are pushed over a separate read-only Hub identity when LAN sharing is active and over trusted main-process IPC otherwise; no polling dependency remains.
- Kept exact-origin checks and disabled framework logging on the LAN host. Browser query-token parsing is limited to the Hub endpoint/negotiate path. The UI/session warning remains explicit that LAN HTTP is unencrypted.

## TDD and Verification
- Added Hub security/projection tests first; initial focused run failed because the realtime Hub types did not exist, then passed after implementation.
- `node scripts/check-signalr-package.mjs` — **passed** with exact live registry metadata.
- `node --test scripts/e2e/signalr-package-gate.test.mjs` — **passed**, 12/12.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~PlayerHubAuthorizationTests` — **passed**, 6/6.
- `npm test` — **passed**, 91 Node tests and 50 .NET tests.
- `npm run build` — **passed**, TypeScript/Electron/Vite and backend Release build; 0 warnings and 0 errors.
- `npm run test:e2e` — **passed**. Local E2E established player and display SignalR connections, verified assigned-sheet and approved-scene pushes, rejected anonymous/revoked connections and client-selected group invocation, checked revoke notification and retained private HTTP warning. Evidence: `artifacts/e2e/2026-11-07T09-33-57.745Z-efa68c72`.
- `npm run package:smoke` — **passed** for the Windows x64 package. macOS package outputs were not exercised.

## Deviations and Limitations
- Corrected the earlier plan's pinned digest transcription (`U7Vv8...`) to the independently verified npm metadata (`U7v8...`) as explicitly authorized. The package provenance gate fixture was updated to match.
- Added the scoped read-only display capability and event-driven main-process IPC fallback to satisfy table-display delivery while keeping the desktop bearer private.
- Plan code and summary are not committed or pushed, per the current instruction to finish code and report before committing. Existing unrelated worktree changes were preserved.
- Local same-host/private-interface E2E is not physical-phone, external-LAN, firewall, or operator evidence. LAN HTTP has no confidentiality. CHAR-04 and Phase 6 remain pending the remaining plans and required human UAT; no Phase 6 completion claim is made.

## Self-Check: PASSED
- Summary, Hub/publisher/authentication code, and tests exist.
- Gate, full tests, build, E2E, and package-smoke claims match command output.
- HEAD remains `e3de3a7eb15474cbfc3a092a5f2255c169e3da72`; no commit or push was performed.

---
*Phase: 06-srd-characters-and-local-player-sheets*
*Completed: 2026-11-07*
