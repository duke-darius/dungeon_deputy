# Phase 6: player sheets, local pairing, and live updates

## Current status

Automated implementation checks are complete; real-device and operator review is **not** complete. Do not treat this document as evidence that the product is safe or usable on physical phones.

| Requirement | Automated evidence | Remaining acceptance / known gap | Status |
|---|---|---|---|
| CHAR-01 | Source-cited Barbarian/Dwarf level-1 domain/API tests and DM UI E2E | Supported subset is intentionally narrow. Inventory is bookkeeping only; spells/resources and broader progressions are unavailable. | Pending |
| CHAR-02 | Single-use/replay/expiry/revoke/session-stop tests; two isolated browser principals in local E2E | Test two actual phones on the intended private Wi-Fi; verify interface selection, firewall behavior, reachability and teardown. | Pending |
| CHAR-03 | Distinct player projections, cross-assignment denial, closed player command schema, inventory sync, and DM current-HP bounds/assignment isolation tests | DM current HP is stored per active assignment and pushed immediately to that player's authorized SignalR connection. Resource/spell actions are unavailable. Physical phone/privacy UAT remains required. | Pending |
| CHAR-04 | Authorized Hub projection, reconnect snapshot, immediate scene/blackout push, revoke/session-end and no-polling E2E | Test the intended table display and both physical phones over the target LAN; inspect transport and listener exposure. | Pending |

These are not completion marks. The four requirements and Phase 6 must remain open until their corresponding acceptance criteria are actually met. In particular, local browser windows running on one computer are not “two phones on Wi-Fi.”

## What is implemented (automated scope)

- A DM explicitly starts and stops the LAN listener on one selected private interface. Invitations are single-use and expire; each redeemed invitation creates an independent, character-scoped capability. Session stop/revoke invalidates access.
- The player endpoint and SignalR Hub expose an assignment-derived sheet, bounded inventory bookkeeping commands, and approved public scene/blackout state. The backend rejects unrelated private/combat routes and revalidates assignment authority. SignalR groups/client-selected recipients do not authorize access.
- DM current-HP changes use a loopback-only, desktop-token-authenticated route, target a player assignment ID (never a map token), enforce `0..HitPointMaximum`, persist per assignment, and publish the freshly authorized sheet to that player's connected clients only. Player HTTP commands still cannot set HP.
- The Electron main process holds the separate read-only display capability and SignalR connection. The public renderer receives only presentation updates through its narrow preload bridge. The shared desktop `DUNGEON_DEPUTY_TOKEN` is not returned to either player or public renderer.
- Player credentials remain in memory; Hub reconnect requests a fresh authorized snapshot. Revoke/session end clear the rendered private sheet. Application SignalR logging is disabled, and E2E diagnostics redact invite/access-token query values.
- The bundled rules subset supports only the directly sourced level-1 Barbarian/Dwarf combination. Inventory names are a player bookkeeping tracker; they are not rules-validated and do not change calculated stats. No spell/resource options are enabled.

## Transport and privacy warning

The LAN listener uses **unencrypted HTTP**. It does not provide confidentiality, server identity, or integrity against another participant able to observe or interfere with the Wi-Fi traffic. REST bearer credentials and SignalR browser transport credentials can therefore be observed on that network. SignalR `access_token` query parsing is restricted to the Hub endpoint/negotiate route and logs are suppressed/redacted, but this does **not** encrypt the transport.

Use only a private network whose participants and access point you trust. Do not use a guest/public/shared network or expose the port through router/firewall forwarding. Stop LAN access when finished. No HTTPS/TLS, certificate trust, firewall safety, or resistance to Wi-Fi interception is claimed.

## Automated evidence and environment

Latest full local automation for this plan was run on a Windows x64 host with .NET 10, Node 24.11.1, and the project’s Electron/Chromium E2E runtime. E2E selected an active private IPv4 interface on the same host and launched two isolated local browser contexts plus the Electron DM/display. Renderer network requests were observed/blocked outside the allowed local addresses; no external-origin request was observed. This is not an OS-wide firewall denial or internet-isolation certification.

Commands and exact results from the latest completed run:

- `npm test` — 96 Node tests and 51 .NET tests passed.
- `npm run build` — passed, including backend Release build with zero warnings/errors.
- `npm run test:e2e` — passed; evidence `artifacts/e2e/2026-11-07T10-31-39.206Z-634c073d`. Two independent local browser identities, replay/revoke/session-end, cross-player reads/actions, private route denial, scene/blackout push and reconnect snapshots were exercised.
- `npm run package:smoke` — passed for Windows x64. It verifies packaged player entry/SignalR assets and backend smoke flows; it does not launch the packaged player UI or establish mobile-platform support.

Automated tests support only the exact behaviors they exercise. They do not validate physical phones, phone browser compatibility, external-device reachability, Wi-Fi isolation, router/firewall configuration, OS suspend/network transitions, or operator acceptance.

## Required physical-phone and operator UAT

On the intended private Wi-Fi, using two actual phones and ordinary browsers:

1. Record each phone model, OS version, browser/version, Wi-Fi type (private/guest), and whether the phones are on the same subnet as the selected host interface. Do not record credentials or private network secrets in public logs.
2. In Dungeon Deputy, open player access, select the intended private interface, and read the on-screen unencrypted-HTTP warning before starting the session. Confirm the displayed host address is the intended interface.
3. Pair each phone using a different one-time invite for a different supported character. Confirm the invite is removed from the URL after redemption and each phone shows only its assigned character.
4. Attempt to access another assignment or DM/private route from the player experience. Verify the server denies it; do not rely only on hidden UI controls.
5. Verify allowed inventory bookkeeping synchronizes to the DM; verify player HP/initiative/condition/hidden-state writes fail. Change current HP in the DM assignment control and verify only that assigned phone updates immediately, including values 0 and maximum and rejection outside the bounds.
6. Approve a scene, then blackout. Confirm both phones and the table display update, and blackout does not reveal the scene underneath.
7. Test a transient Wi-Fi disconnect/reconnect, revoke one assignment, and stop the session. Confirm a fresh authorized snapshot after reconnect, immediate clearing on revoke/end, and denial when a revoked/ended grant reconnects.
8. Inspect the host’s bound interface and firewall/router exposure. Confirm the listener stops and grants are invalidated on session stop. Record observed behavior; do not infer security from a same-host test.
9. Explicitly acknowledge that HTTP has no confidentiality. If the operator cannot accept that risk, do not use LAN player sessions on that network.

Record each criterion as **pass**, **fail**, or **not run**, with exact device/network evidence. Do not mark CHAR-02/03/04 complete if any criterion is unrun or failed. If HTTP risk is unacceptable, stop and request a separately planned/trusted HTTPS design rather than implying the present transport is encrypted.
