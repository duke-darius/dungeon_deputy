---
phase: 06-srd-characters-and-local-player-sheets
plan: 04
subsystem: player-sheets
tags: [dotnet, sqlite, react, authorization, privacy, e2e]
requires:
  - phase: 06-01
    provides: Server-authoritative character records
  - phase: 06-03
    provides: Session-scoped player credentials, revocation and opt-in LAN listener
provides:
  - Token-derived assigned-character projections with no character-ID selection surface
  - Closed per-assignment inventory bookkeeping commands and server-only resource decrements
  - DM-only visibility of allowed player inventory edits
  - Phone-first assigned sheet UI that clears sensitive projection on failed authorization
affects: [06-05, 06-06, player-sheets, player-commands]
actuals:
  tokens: 8900
  tasks: 2
  commits: 0
  plan_head_before: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
  plan_head_after: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
tech-stack:
  added: []
  patterns: [assignment-derived-projection, closed-player-command-schema, transactional-assignment-state, authorization-rechecked-on-write]
key-files:
  created:
    - src/backend/PlayerSessions/PlayerSheetService.cs
    - src/backend/PlayerSessions/PlayerCommands.cs
    - src/backend.tests/PlayerSheetAuthorizationTests.cs
    - src/backend.tests/PlayerCommandTests.cs
    - src/renderer/src/player/PlayerWorkspace.tsx
    - src/renderer/src/player/playerApi.ts
  modified:
    - src/backend/PlayerSessions/PlayerSessionService.cs
    - src/backend/PlayerSessions/PlayerAuthorization.cs
    - src/backend/PlayerSessions/PlayerListenerService.cs
    - src/backend/Program.cs
    - src/renderer/src/player/JoinPage.tsx
    - src/renderer/src/player/player.css
    - src/renderer/src/api.ts
    - src/renderer/src/characters/CharacterWorkspace.tsx
    - src/renderer/src/styles.css
    - scripts/e2e.mjs
key-decisions:
  - "Resolve the sole character from a live bearer assignment on every read and write; player routes accept no character ID or desktop credential."
  - "Inventory is bounded player bookkeeping only; names do not trigger SRD mechanics or calculations. Resource decrements require a key already in assignment state; the current rules subset provisions none."
  - "Do not expose encounter current HP or add SignalR; HP targeting and push synchronization remain for later plans."
  - "Revocation/expiry clears the visible projection and in-memory capability; transient request failure clears sheet values and shows a disconnected state."
  - "No commits made per user instruction."
patterns-established:
  - "Persist player edits on the assignment record and re-check active session/revocation/expiry inside the mutation transaction."
  - "Expose to player only an explicit character DTO; do not serialize CharacterRecord, encounter, map, or session objects directly."
requirements-completed: []
coverage:
  - id: D1
    description: Independent bearer assignments read only their own canonical character projection; path/query substitutions and DM/combat routes reveal no data.
    verification:
      - kind: integration
        ref: src/backend.tests/PlayerSheetAuthorizationTests.cs
        status: pass
    human_judgment: true
    rationale: Local same-host API tests do not establish real phone privacy, browser behavior or LAN transport acceptance.
  - id: D2
    description: Bounded player inventory edits persist per assignment, are visible to the DM, and forged combat fields are rejected.
    verification:
      - kind: unit
        ref: src/backend.tests/PlayerCommandTests.cs
        status: pass
      - kind: e2e
        ref: scripts/e2e.mjs; artifacts/e2e/2026-11-04T16-46-50.193Z-6975d63b
        status: pass
    human_judgment: false
  - id: D3
    description: Player sheet UI exposes only allowed actions, clears sheet data on authorization loss and has phone-responsive controls.
    verification:
      - kind: other
        ref: npm run build
        status: pass
      - kind: e2e
        ref: scripts/e2e.mjs; artifacts/e2e/2026-11-04T16-46-50.193Z-6975d63b
        status: pass
    human_judgment: true
    rationale: E2E exercises the LAN API and page assets but not a physical phone or browser-driven revocation/cache interaction.
metrics:
  duration: 50min
  completed: 2026-11-04
  status: complete
---

# Phase 6 Plan 4: Assigned Player Sheets Summary

**Added per-request assignment-authorized player sheet reads and bounded inventory/resource commands, with separate DM visibility and a phone-first sheet that fails closed.**

## Accomplishments
- Added a minimized sheet projection containing the assigned character’s name, supported base stats, server-derived modifiers/AC/maximum HP, ruleset version, and assignment-scoped inventory/resource state. No character identifier is accepted from a player request.
- Added closed `addInventory`, `removeInventory`, and `useResource` commands, bounded fields/counts, per-player write throttling, and transactional live assignment/revocation checks before persistence.
- Persisted player bookkeeping on the existing assignment table; the DM-only assignment view can observe permitted inventory changes. Player routes expose neither another player nor DM encounter/map state.
- Added an in-memory-token player workspace with inventory controls, current resource availability, loading/disconnected/saved states, and projection removal on authorization loss. No SignalR or current encounter HP sync was added.

## Scope and safety limitations
- Inventory is a bounded personal bookkeeping tracker; item names are not source-validated and have no calculated mechanics. The current explicitly bounded rules subset contains no modeled player resources, so the player UI shows none and resource IDs are rejected. No resource or spell rules were guessed.
- The projection currently contains character maximum HP only. Encounter current HP is not linked to character assignments and will require a later DM-targeted synchronization step. No SignalR was added.
- Player responses are assignment-scoped and independently revalidated for each request and inside the write transaction. The desktop-only management projection is separate and remains behind the loopback desktop token.
- E2E used an active private interface on this machine. It is not physical phone, external LAN, firewall, or operator verification.

## TDD and Verification
- Wrote authorization/command tests first; the initial focused run failed because `PlayerSheetService`, `PlayerCommands`, and their DTOs did not yet exist.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~Player` — **passed**, 9 passed, 0 failed.
- `npm test` — **passed**, 79 Node tests and 44 .NET tests, 0 failed.
- `npm run build` — **passed**, 0 warnings and 0 errors.
- `npm run test:e2e` — **passed**; evidence: `artifacts/e2e/2026-11-04T16-46-50.193Z-6975d63b`. It verified same-host invite exchange, assigned-only sheet fields, inventory mutation, DM-visible updated inventory, rejection of forged combat fields, and denial after revoke.
- E2E did not verify physical phones, external-LAN reachability, or a real phone browser’s cache clearing.

## Deviations from Plan
- Kept resource use limited to existing server-side resource keys. Since the preceding bounded rules plan models no resources, none are currently usable and the UI offers no resource actions.
- Stored bounded per-assignment bookkeeping in columns on the existing assignments table rather than creating a separate player-state table.
- DM current-HP targeted synchronization and push delivery were not implemented, per instruction to leave HP sync for later and defer SignalR.

## Remaining Scope
CHAR-03 and Phase 6 remain incomplete pending full supported inventory/resource domain coverage, later DM HP synchronization, real phone/operator validation, and remaining phase plans. No physical-phone or full-phase completion claim is made. No commits were made; unrelated pre-existing working-tree changes were preserved.

## Self-Check: PASSED
- Summary and new source/test/UI files exist.
- Focused Player tests, `npm test`, build, and E2E claims match command outcomes.
- HEAD remains `e3de3a7eb15474cbfc3a092a5f2255c169e3da72`; no commits were created.

---
*Phase: 06-srd-characters-and-local-player-sheets*
*Completed: 2026-11-04*
