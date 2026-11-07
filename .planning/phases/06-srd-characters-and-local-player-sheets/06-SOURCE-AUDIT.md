# Phase 6 Multi-Source Coverage Audit

| SOURCE | ID | Feature / requirement | Plan | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | DM-managed supported SRD-only characters and assigned sheets over local network without accounts/internet | 06-01..06-07 | COVERED | 06-01/02 characters; 06-03/04 pairing and sheets; 06-05 server; 06-06 clients; 06-07 adversarial/UAT. |
| REQ | CHAR-01 | Supported character create/edit and ability/proficiency/HP/AC/inventory/spells/resources/level calculations in .NET | 06-01, 06-02, 06-07 | COVERED | Every implemented rule/progression fixture must cite and be checked directly against the pinned official SRD 5.2.1 PDF; Phase5's sample class/species records alone are not extrapolated. Bounded source audit, domain/API tests, DM UI E2E and system verification. |
| REQ | CHAR-02 | Phone join by local code/QR without account/internet | 06-03, 06-07 | COVERED | Opt-in LAN and one-time invite; physical phone/operator evidence remains required. |
| REQ | CHAR-03 | Assigned-only view, permitted edits/actions, DM sync and combat/hidden authority | 06-04, 06-05, 06-06, 06-07 | COVERED | Per-request authorization, allowlisted projection/commands, realtime reconnect and adversarial tests. |
| REQ | CHAR-04 | Immediate SignalR approved scene/blackout push to display and authorized phones | 06-05, 06-06, 06-07 | COVERED | Authorized server publication, separate display/player clients, reconnect snapshots and no polling. |
| RESEARCH | — | Existing .NET 10, ASP.NET Core and SQLite authoritative domain | 06-01..06-06 | COVERED | Reuse existing stack/data folder and loopback desktop API. |
| RESEARCH | — | Scoped random invite-issued player token; token hashes, expiry, replay protection, revocation and throttling | 06-03..06-07 | COVERED | Secret handling and negative tests required. |
| RESEARCH | — | Keep desktop token private; listener explicit and session scoped; exact origins, bounded schemas and payloads | 06-03..06-07 | COVERED | Explicitly covered by security plan tasks and negative tests. |
| RESEARCH | — | Per-role/character allowlisted projections; group routing is not authorization; reconnect refresh | 06-04..06-07 | COVERED | Hub and HTTP checks require current server-side assignment. |
| RESEARCH | — | Browser SignalR token transport can use query token; redact logs; CORS/Origin defense | 06-03, 06-05..06-07 | COVERED | Query extraction only on Hub route, exact origins, log-redaction tests. |
| RESEARCH | — | Default LAN HTTP has no confidentiality; do not claim TLS/firewall/physical phone behavior without evidence | 06-03, 06-07 | COVERED | Explicit opt-in warning and phone/operator UAT; CHAR-02..04 held pending UAT. |
| RESEARCH | — | Verify and exact-pin @microsoft/signalr identity/license/version before install | 06-05 | COVERED | Registry metadata and official Microsoft docs/upstream/source/license/integrity confirmed before sole-package install; stop on mismatch. |
| CONTEXT | — | 06-UI-SPEC desktop builder, phone assigned sheet, join/revoke, event states and visual tokens | 06-01, 06-03, 06-04, 06-06, 06-07 | COVERED | UI plans reference spec and trace desktop/phone/pairing states, accessibility and visual tokens. |
| CONTEXT | — | No Phase 6 CONTEXT.md decisions exist | — | EXCLUDED | Research states no CONTEXT.md; use documented defaults and tradeoffs, no invented D-NN decisions. |
| PROGRESSION | — | Phase 5 accepted after E2E 2026-11-04; user authorized out-of-order Phase 6 start | Roadmap/STATE | COVERED | Phase 2/3 remaining paperwork is unchanged and non-blocking only for capabilities already present in current service functionality. |

No source items are unplanned. Deferred project-wide ideas (cloud/online VTT, non-SRD content, full obscure rules automation) remain excluded per REQUIREMENTS.md and 06-RESEARCH.md.
