---
phase: 06-srd-characters-and-local-player-sheets
plan: 06
subsystem: realtime-clients
tags: [signalr, electron, browser, privacy, reconnect]
requires:
  - phase: 06-05
    provides: Authenticated Hub, scoped display identity, and allowlisted publication
provides:
  - Player browser SignalR lifecycle with fresh authorized snapshots and manual retry
  - Main-process display SignalR connection and projection-only preload delivery
  - Tested immediate update, reconnect, cross-assignment privacy, revocation, and session-end behavior
affects: [06-07, player-sheets, public-display, signalr]
actuals:
  tokens: 11500
  tasks: 2
  commits: 0
  plan_head_before: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
  plan_head_after: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
tech-stack:
  added: []
  patterns: ["main-process-display-capability-custody", "snapshot-before-connected", "explicit-session-ended-notification", "diagnostic-credential-redaction"]
key-files:
  created:
    - src/renderer/src/realtime/playerConnection.mjs
    - src/renderer/src/realtime/playerConnection.d.mts
    - scripts/e2e/player-connection.test.mjs
  modified:
    - src/renderer/src/player/PlayerWorkspace.tsx
    - src/renderer/src/player/JoinPage.tsx
    - src/renderer/src/player/player.css
    - src/renderer/src/PublicDisplay.tsx
    - src/renderer/src/api.ts
    - src/main.ts
    - src/preload.cts
    - src/main.test.mjs
    - src/backend/Program.cs
    - src/backend/PlayerSessions/PlayerListenerService.cs
    - src/backend/Realtime/PresentationPublisher.cs
    - scripts/e2e.mjs
    - scripts/e2e/fixtures.mjs
key-decisions:
  - "Keep the read-only display capability and SignalR connection in Electron main; preload forwards only allowlisted presentation updates, never the capability or desktop token."
  - "Use one reusable player connection lifecycle with in-memory accessTokenFactory, deduplicated snapshots, explicit reconnect refresh, and a manual retry after reconnect stops."
  - "Notify connected player browsers before listener teardown and invalidate the session before waiting for shutdown, so session-end clears stale private sheet state and no late snapshot can restore access."
  - "Disable SignalR client logging and redact invite/access_token query values from E2E diagnostics."
patterns-established:
  - "A player is Connected only after a current server-authorized snapshot; transport reconnect retains visibly stale sheet data until refresh succeeds."
  - "The public renderer subscribes only to sanitized main-process IPC events; its CSP need not allow direct LAN HTTP/WebSocket access."
requirements-completed: []
coverage:
  - id: DISPLAY
    description: Electron display receives immediate approved scene/blackout pushes, reconnect snapshot refresh, and no polling delivery; display credentials stay in main.
    verification:
      - kind: unit
        ref: src/main.test.mjs
        status: pass
      - kind: e2e
        ref: scripts/e2e.mjs
        status: pass
    human_judgment: true
    rationale: E2E used the same-host private interface and Electron display, not a separate physical table display or phone.
  - id: PLAYER
    description: Two independent player identities receive only their own sheet plus public scene state; reconnect snapshots, revocation, session end, and stale-sheet clearing are exercised.
    verification:
      - kind: unit
        ref: scripts/e2e/player-connection.test.mjs
        status: pass
      - kind: e2e
        ref: scripts/e2e.mjs
        status: pass
    human_judgment: true
    rationale: Browser page ran locally in Electron against a same-machine private-interface listener; this does not establish physical-phone behavior or external-LAN reachability.
metrics:
  duration: 2h
  completed: 2026-11-07
  status: complete
---

# Phase 6 Plan 6: Live Display and Assigned Player Clients Summary

**Connected the Electron display and assigned player browser to authenticated live updates, fresh reconnect snapshots, and fail-closed session teardown.**

## Accomplishments
- Added `playerConnection.mjs` to own a single in-memory player capability, register event handlers once, request and deduplicate authorized snapshots, fetch a new snapshot after reconnect before setting `Connected`, and support manual retry after automatic reconnect stops.
- Player sheet UI now distinguishes connecting/reconnecting/connected/disconnected states, keeps a stale sheet visibly marked during transient transport loss, clears private sheet state on revoke/session end, and offers a 44px-target `Retry connection` action after reconnect stops.
- The Electron main process now owns its distinct read-only display capability and SignalR connection. It forwards only public presentation snapshots/events through the narrow preload bridge. The renderer no longer receives the capability or needs direct LAN network access.
- Session start initiates the main-process display connection even when the public window was already open; reconnect asks the Hub for a fresh public snapshot. Approved changes reach the local Electron display through IPC and other connected public displays through the authenticated Hub.
- Session stop invalidates the session before listener teardown, sends `SessionEnded` to active player clients, and notifies display connections. The browser clears the sheet and returns to the join view; a late snapshot cannot restore the ended assignment.
- Disabled SignalR client diagnostics and redacted `invite`/`access_token` query values from E2E logs.

## TDD and Verification
- Added player connection lifecycle and credential-redaction tests first; the initial run failed because the lifecycle module had not yet been created. Tests then passed after implementation.
- Initial E2E surfaced a 404 for the split SignalR JavaScript chunk on the LAN player host. Expanded its strict hashed-asset allowlist to include the generated `HubConnectionBuilder` chunk; no general path access was added.
- `node --test scripts/e2e/player-connection.test.mjs` — **passed**, 3/3.
- `npm test` — **passed**, 95 Node tests and 50 .NET tests.
- `npm run build` — **passed**, TypeScript/Electron/Vite and backend Release build; 0 warnings and 0 errors.
- `npm run test:e2e` — **passed**. It verified main-process display push, two independently paired player clients, browser-side join/sheet behavior, no cross-player inventory data, fresh display/player snapshots after reconnect, immediate revoke/session-end clearing, anonymous/revoked denial, no polling delivery, and invite URL cleanup. Evidence: `artifacts/e2e/2026-11-07T10-02-53.686Z-a44c57f6`.

## Deviations and Limitations
- Kept the SignalR display capability inside the Electron main process instead of exposing it to the renderer. This preserved the narrowest credential boundary and avoided loosening the public renderer CSP to permit arbitrary LAN connections.
- Extended `PlayerListenerService`'s explicit hashed-asset allowlist for the additional SignalR client chunk. The integration test demonstrated this required asset was otherwise 404.
- Updated session teardown ordering and notification to clear browser-held private data on normal session stop. Process/network failure remains visibly disconnected until the client can reauthorize; it does not imply successful data refresh.
- No commits or push were made, per instruction. Existing unrelated worktree changes remain untouched.
- E2E exercised same-host private-interface networking, not physical phones, external-LAN reachability, firewall behavior, or operator transport acceptance. HTTP remains unencrypted. Phase 6 remains incomplete; no phone or full-phase completion claim is made.

## Self-Check: PASSED
- Summary and connection module, test, preload/main changes, and E2E assertions exist.
- `npm test`, `npm run build`, and final `npm run test:e2e` claims match command results.
- HEAD remains `e3de3a7eb15474cbfc3a092a5f2255c169e3da72`; no commit or push was performed.

---
*Phase: 06-srd-characters-and-local-player-sheets*
*Completed: 2026-11-07*
