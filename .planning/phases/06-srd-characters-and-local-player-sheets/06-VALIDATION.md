# Phase 6 Validation Matrix

## Requirement-to-test coverage

| Requirement | Required behavior | Automated evidence | Human acceptance |
|---|---|---|---|
| CHAR-01 | Supported, directly source-cited character inputs and authoritative ability/proficiency, HP/AC, inventory, spell/resource, and level calculations; unsupported options remain unavailable. | Character-domain xUnit tests and API tests; SRD source-audit checks; `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~Character`; DM E2E create/edit/save/reload. | Review the listed support boundary and representative level calculations before use. |
| CHAR-02 | LAN sharing is opt-in; distinct one-time code/QR invites pair two players without accounts or internet; expiry, replay, rate-limit, revoke and session-stop deny access. | Player-session API and integration tests; two independent browser identities in `npm run test:e2e`; invite and package tests. | Two physical phones on the target private Wi-Fi; confirm advertised interface, firewall behavior and session teardown. |
| CHAR-03 | Each player sees only their assigned sheet and can perform only allowlisted inventory/resource actions; DM owns HP/combat and sees permitted edits; DM HP sync returns only to the assigned player. | Cross-player authorization tests, invalid payload tests, player action contract tests and two-client E2E. | Verify real phone usability and understand the unencrypted HTTP risk if HTTPS is not implemented and tested. |
| CHAR-04 | SignalR immediately delivers only DM-approved scene/blackout projections to the table display and authorized players; reconnect refreshes snapshots; revocation drops access; no polling dependency. | Hub authentication/projection/revocation tests; event-driven two-client E2E; package smoke. | Verify scene/blackout on the intended display and both actual phones; review listener/transport exposure. |

## Security invariants / fail-fast gates

- Loopback DM authentication remains separate from LAN player identity; never forward `DUNGEON_DEPUTY_TOKEN` to a phone or public renderer.
- Invite secrets are single-use, high-entropy, character/session-scoped; persistent credentials are session-memory-only and invalidated at stop/restart/revoke/expiry. No secret is logged or rendered after one-time reveal completes.
- Exact-origin checks and a narrow LAN route set are used. Validate current server-side assignment on every read, mutation and hub event; SignalR groups are routing only.
- Query `access_token` parsing is Hub-path-only for browser WebSocket/SSE and all URLs/logs redact it. No client-selected recipient/group names.
- Public display/player updates use separate allowlisted projections. Hidden map/token, DM preview, other players, HP/conditions/initiative and private notes are never broadcast to unauthorized recipients.
- LAN HTTP is unencrypted. Do not claim TLS/confidentiality unless implemented and tested on the target phones. Session sharing requires explicit DM opt-in and visible transport warning.
- If any requirement cannot be exercised, the requirement and phase remain incomplete; local browser contexts do not count as physical-phone LAN evidence.

## Commands

Run after each implementation wave as relevant and all before review:

```powershell
dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
npm test
npm run build
npm run test:e2e
npm run package:smoke
```

Record actual host/browser/network facts only. Windows x64 package smoke, local-loopback E2E, and simulated browser contexts do not establish macOS, firewall, TLS, or physical-phone support.
