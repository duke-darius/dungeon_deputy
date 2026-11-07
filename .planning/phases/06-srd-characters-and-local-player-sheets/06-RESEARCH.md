# Phase 6: SRD Characters and Local Player Sheets - Research

**Researched:** 2026-11-04
**Domain:** .NET 10 character rules domain, LAN web access, scoped identity, SignalR publication
**Confidence:** MEDIUM

## User Constraints

### Locked Decisions
- The DM can create/edit SRD-only characters for a supported selection of classes/species, with supported ability, proficiency, HP, AC, inventory, spell/resource, and level calculations in the .NET domain layer. [VERIFIED: `.planning/REQUIREMENTS.md:39-44`; quoted verbatim below]
- Players can join from a phone on the local network using a session code or QR invitation, without account registration or internet access. [VERIFIED: `.planning/REQUIREMENTS.md:39-44`; quoted verbatim below]
- Players can view their assigned sheets and submit permitted edits/actions; changes sync with the DM, while the DM remains authoritative for combat and hidden information. [VERIFIED: `.planning/REQUIREMENTS.md:39-44`; quoted verbatim below]
- In the SignalR stage, DM-approved scene changes and blackout are pushed immediately to the table display and connected player sheets without polling delay; each client receives only its authorized public state. [VERIFIED: `.planning/REQUIREMENTS.md:39-44`; quoted verbatim below]
- Phase goal: “The DM can manage supported SRD-only characters and players can securely access their assigned sheets over the local network without accounts or internet.” [VERIFIED: `.planning/ROADMAP.md:116-125`]
- User additionally reports Phase 5 E2E passed on Nov 4, and asks that research not delay proceeding to the next phase. No new E2E was run for this research task.

### Requirements (verbatim)
> “**CHAR-01**: The DM can create/edit SRD-only characters for a supported selection of classes/species, with supported ability, proficiency, HP, AC, inventory, spell/resource, and level calculations in the .NET domain layer.”
>
> “**CHAR-02**: Players can join from a phone on the local network using a session code or QR invitation, without account registration or internet access.”
>
> “**CHAR-03**: Players can view their assigned sheets and submit permitted edits/actions; changes sync with the DM, while the DM remains authoritative for combat and hidden information.”
>
> “**CHAR-04**: In the SignalR stage, DM-approved scene changes and blackout are pushed immediately to the table display and connected player sheets without polling delay; each client receives only its authorized public state.”

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAR-01 | “The DM can create/edit SRD-only characters for a supported selection of classes/species, with supported ability, proficiency, HP, AC, inventory, spell/resource, and level calculations in the .NET domain layer.” | Explicit bounded rules subset, deterministic backend domain calculations, persistence, and unit/API validation. [VERIFIED: `.planning/REQUIREMENTS.md:41`] |
| CHAR-02 | “Players can join from a phone on the local network using a session code or QR invitation, without account registration or internet access.” | LAN-only session lifecycle, one-time invite exchange, scoped credentials, browser join flow, device E2E and transport safety gates. [VERIFIED: `.planning/REQUIREMENTS.md:42`] |
| CHAR-03 | “Players can view their assigned sheets and submit permitted edits/actions; changes sync with the DM, while the DM remains authoritative for combat and hidden information.” | Server-side assignment checks, per-role projections, command allowlist and cross-player authorization tests. [VERIFIED: `.planning/REQUIREMENTS.md:43`] |
| CHAR-04 | “In the SignalR stage, DM-approved scene changes and blackout are pushed immediately to the table display and connected player sheets without polling delay; each client receives only its authorized public state.” | ASP.NET Core SignalR auth lifecycle, allowlisted recipient projections, reconnect snapshot and multi-client Hub tests. [VERIFIED: `.planning/REQUIREMENTS.md:44`] |

### the agent's Discretion
- No Phase 6 CONTEXT.md was present. Use the recommendations below to resolve design space; do not silently broaden the supported character rules/content or share private encounter state.

### Deferred Ideas (OUT OF SCOPE)
- Project-wide exclusions remain: “Online VTT hosting or matchmaking”; “Mandatory cloud accounts, subscriptions, or hosted services”; copyrighted non-SRD content imports; and automated implementation of every spell, feat, or obscure rule. [VERIFIED: `.planning/REQUIREMENTS.md:52-67`]

## Summary

Phase 6 adds two substantial trust boundaries to a local-only Electron app: untrusted phones on a LAN and player-specific projections from a single authoritative backend. Preserve the existing .NET 10 + ASP.NET Core + SQLite backend as the authority; add a deliberate LAN listener rather than exposing the current loopback listener or forwarding the DM bearer token. Character rules should be a versioned, explicit subset backed by locally bundled SRD records, not an attempt to infer unsupported rules from generic catalog prose. Existing source confirms the API currently binds only to loopback and protects every HTTP endpoint with one process token; that token is appropriate for Electron's local control channel, not for phones. [VERIFIED: `src/backend/Program.cs:7-36`]

Recommended shape: DM creates an invite for one character; invite is random, short-lived, single-use, rate-limited, and exchanged over LAN for a revocable opaque player credential. Every player HTTP/Hub request must be authenticated and re-authorized against current session-to-character assignment. Send only a player sheet projection and allowlisted public presentation updates, never campaign/map drafts, full encounters, hidden token data, or another character. SignalR groups may route already-authorized messages, but are not themselves authorization. [CITED: ASP.NET Core SignalR authentication/authorization and groups docs]

**Primary recommendation:** Deliver scoped domain calculations and LAN session authorization first, then the browser SignalR client and authorized event projections. Bind deliberately to the LAN interface only while a session is open; keep local Electron API loopback-only. Treat HTTP on a Wi-Fi LAN as observable by other LAN participants unless HTTPS is actually established. User acceptance should gate the chosen transport/certificate UX and the supported SRD ruleset boundaries; those are consequential unresolved decisions, not facts to assume.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Character definition, validation, supported calculations | API / Backend | Database / Storage | Domain layer must validate and calculate canonical state; persistence should retain that state and its ruleset version. |
| Session invite, token, assignment and revocation | API / Backend | Browser / Client | Backend issues/revokes identity and checks assignment; client only presents the invite and credential. |
| DM create/edit and assigned sheet UI | Browser / Client | API / Backend | React UI manages workflows; backend enforces every field/action permission. |
| LAN discovery/invitation QR and mobile web UI | Browser / Client | API / Backend | Browser is phone UI; backend serves bounded static assets/API from a LAN-reachable endpoint. |
| Live public scene/blackout delivery | API / Backend | Browser / Client | Backend publishes approved projection; Electron table display and player browsers render their authorized view. |
| Player edits and HP updates | API / Backend | Database / Storage | Backend applies authorized commands, persists, then emits updated projection to DM/player. |

## Project Constraints (from AGENTS.md)

- No repository-root `AGENTS.md` was found. Global OpenCode policy applies: correct/tested work first, respect project conventions, do not fabricate verification, and do not commit without authorization. User explicitly requested no commits.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ASP.NET Core / .NET | `net10.0` (existing project target) | Local API, auth, Hub, hosted browser assets | The project is already .NET 10; official ASP.NET Core 10 docs cover SignalR auth, CORS, and connection lifecycle. [VERIFIED: `src/backend/DungeonDeputy.Api.csproj:1-5`; [CITED: learn.microsoft.com/aspnet/core/signalr/authn-and-authz] |
| Microsoft.AspNetCore.SignalR | ASP.NET Core shared framework | Server-side Hub and push delivery | Avoid a third-party server package; SignalR server is an ASP.NET Core capability. [CITED: learn.microsoft.com/aspnet/core/signalr/introduction] |
| SQLite via Microsoft.Data.Sqlite | Existing `10.0.14` | Persist characters/session credentials or assignments | Already used for encounter persistence; reuse local durable storage where appropriate, with hashed credentials and transaction boundaries. [VERIFIED: `src/backend/DungeonDeputy.Api.csproj:7-9`; `src/backend/Encounters/EncounterService.cs:61-68`] |
| `@microsoft/signalr` | Version not selected/verified | Browser SignalR client for phone and Electron renderer | Official JS client is required for browser Hub connections; before adding it, verify official docs, package legitimacy, npm version/publish date, and postinstall metadata. Package provenance remains [ASSUMED] until that gate completes. [CITED: learn.microsoft.com/aspnet/core/signalr/javascript-client] |

### Supporting
- Existing Electron/React/TypeScript renderer and test stack remain; no separate native phone application is needed for this phase. Phones can use an ordinary browser. [VERIFIED: `package.json:21-37`]
- Persist a small session/character document in SQLite, respecting existing per-user data directory; avoid a new database/service. Existing backend requires `DUNGEON_DEPUTY_DATA_DIR`. [VERIFIED: `src/backend/Program.cs:7-16`]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Same-origin LAN-served player UI | Hosted web service/cloud | Rejected: conflicts with offline/local-only requirements. |
| Opaque, random, revocable invite-issued player token | Reusing desktop `DUNGEON_DEPUTY_TOKEN` or session code as permanent bearer | Rejected: desktop token grants broad local API access; short code has low entropy and is a join credential only, not durable authorization. |
| Scoped authorization checks in backend | Trusting SignalR group names/client-supplied character ID | Rejected: client controls are untrusted; group membership is routing, not security. |

**Installation audit (2026-11-04):** npm registry metadata reports `@microsoft/signalr` 10.0.11, MIT, repository `git+https://github.com/dotnet/aspnetcore.git`, integrity `sha512-FulOJ2EEtKvLQcswe/U7Vv8pzyXyk7Jua5xgWJPPwyQU/2Z9ORvKcVjyO75VvLsem+CJ1ORRexJ+7Bz1FCei2aw==`, and no install lifecycle hooks (only package build/clean/get-version scripts). Official ASP.NET Core 10 SignalR documentation and npm metadata were inspected before implementation. Exact-pin this client only; if metadata changes or any mismatch appears, stop before install.

## Package Legitimacy Audit

`@microsoft/signalr@10.0.11` is the verified Microsoft-published browser client candidate from the official `dotnet/aspnetcore` repository, licensed MIT. npm registry version, license, repository, integrity and scripts were inspected on 2026-11-04. The plan repeats an exact metadata check immediately before the exact-version installation and halts on any mismatch. No other package is authorized by this audit.

## Architecture Patterns

### System Architecture Diagram
```text
DM dashboard (Electron, loopback API + DM auth)
    | create/edit / start or stop LAN session / approve public scene
    v
ASP.NET Core backend (authoritative domain + session registry + SQLite)
    |                             |
    | player credential +        | allowlisted public projection
    | assigned-sheet projection  | (only after DM approval)
    v                             v
LAN-hosted player web app       SignalR Hub
    | join code/QR exchange        | authenticated, assignment checked
    | assigned-only commands      +------> table display (approved scene/blackout)
    +-----------------------------+------> player connection (own sheet/public state)
```

### Recommended Project Structure
```text
src/backend/
├── Characters/       # bounded rules, validated character domain and calculations
├── PlayerSessions/   # invites, scoped credentials, assignment and revocation
├── Realtime/         # Hub, projection/event publishing, connection authorization
└── Program.cs        # separate loopback and LAN endpoint exposure/pipeline
src/renderer/src/player/ # phone-first sheet and join flow, no DM preload privileges
```

### Pattern 1: Explicit supported rules subset
**What:** Keep supported class/species/features as explicit data and deterministic domain operations; store ruleset/source version and distinguish unsupported/unmodeled options from calculated values. Do not use arbitrary `JsonElement` descriptions as executable rules. The existing SRD catalog is a curated data source with category and provenance validation; its presence does not prove complete character mechanics. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:5-7,11-36`]
**When to use:** Every character create/edit/calculate operation.
**Example (shape, not code):** `CharacterCommand -> validate against supported rules registry -> calculate derived values -> persist canonical character -> return DM/player projection`. Keep derived values reproducible from inputs; independently validate client edits and clamp/reject invalid ranges.

### Pattern 2: One-time invite exchange, persistent scoped credential
**What:** DM creates one invite bound server-side to a session and character. Display QR containing LAN origin + random invite secret; player submits invite once, gets opaque bearer token scoped to that character, and invite expires/consumes atomically. Store token hash, expiration/revocation state; rate-limit guessing and never put persistent credentials in QR/URLs. Token lifecycle and storage algorithm/retention need security review before lock-in. [ASSUMED]
**When to use:** Phone onboarding without accounts or external identity.

### Pattern 3: Authorize projections, then route
**What:** Project distinct response models for DM, table display, and each player sheet. Verify current session and character assignment on HTTP endpoints and Hub methods; publish only authorized DTOs to connection-specific/user-specific destinations. Revalidate assignment/revocation for commands or disconnect affected connections. ASP.NET Core caches authenticated principal at connection time; identity/role changes are not automatically reflected. [CITED: learn.microsoft.com/aspnet/core/signalr/authn-and-authz]
**When to use:** Every read, mutation, and pushed message.

### Pattern 4: Explicit LAN listener lifecycle
**What:** Existing Kestrel endpoint is loopback-only; create a separately controlled LAN listener or endpoint only while player session is active, and leave DM local channel protected independently. Ensure stop/session teardown stops accepting LAN connections and invalidates issued credentials. Do not assume the random loopback port is reachable from phones. [VERIFIED: `src/backend/Program.cs:12-17`; current random local port is in `src/main.ts:211-220`]
**When to use:** Enable local phone access without converting the desktop control API into a LAN API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bidirectional real-time transport | Custom WebSocket framing/reconnect protocol | ASP.NET Core SignalR + official JS client | Lifecycle, negotiation, reconnect, transports and Hub protocol are mature framework responsibilities. |
| Character rules | Generic formula engine or guessed universal D&D rules | Small explicit, versioned domain subset using vetted local SRD data | Keeps unsupported mechanics visible and auditable. |
| Entitlement | Client-supplied character IDs or Hub group names as access controls | Authenticated principal + server-side current assignment checks | Client input and group membership alone are not authorization. |
| LAN QR encoding | Custom QR encoder | Existing trusted QR solution only if selected/legitimacy-checked; otherwise present copyable URL/code | QR is only an encoding of invite data; do not introduce package before verified need. |

**Key insight:** The primary security property is projection minimization: the backend must never serialize private or other-player data to a player connection, even if the UI hides those fields.

## Common Pitfalls

### Pitfall 1: LAN exposure inherits the DM token
**What goes wrong:** Forwarding `X-Dungeon-Token` or binding existing broad endpoints to `0.0.0.0` gives nearby devices access to private campaign data and controls.
**How to avoid:** Keep local desktop auth/channel separate; add minimal player routes and scoped principal. Existing middleware currently requires one process token for all routes. [VERIFIED: `src/backend/Program.cs:25-36`]

### Pitfall 2: Treating LAN as trusted or HTTP as confidential
**What goes wrong:** Another device on a shared/compromised Wi-Fi may observe or interfere with unencrypted traffic; a QR bearer code can be photographed. Phone browser mixed-content / secure-context constraints can also block some web capabilities on an HTTP LAN origin. [ASSUMED; deployment-specific verification required]
**How to avoid:** Decide and test a practical HTTPS model before promises; until then state the threat limitation, minimize bearer exposure, expire/revoke tokens, use no secrets in URLs, and require a trusted private LAN. Avoid claiming encryption or cryptographic peer identity without tested TLS/certificate UX.

### Pitfall 3: Over-broad CORS or origin-only defense
**What goes wrong:** CORS does not authenticate a phone and permissive origin policy increases browser attack surface.
**How to avoid:** Serve player UI from the same LAN origin where possible. If cross-origin is required, allow exact known origins; do not use CORS as the authorization layer. SignalR official security docs warn against allowing any origin and document transport-specific CORS requirements. [CITED: learn.microsoft.com/aspnet/core/signalr/security]

### Pitfall 4: Stale authorization on live connections
**What goes wrong:** Revoking a player/assignment does not automatically replace the cached SignalR principal; old connections can retain access.
**How to avoid:** Check current server-side session/assignment on sensitive hub methods, remove or abort affected connections on revoke, short-lived credential expiry, and enable `CloseOnAuthenticationExpiration` where bearer expiry is used. Docs explicitly say connections can outlive token expiry by default. [CITED: learn.microsoft.com/aspnet/core/signalr/authn-and-authz]

### Pitfall 5: Groups are mistaken for a security boundary
**What goes wrong:** Clients can request arbitrary group joins, or group membership remains after assignment changes.
**How to avoid:** Server derives group names and membership from authenticated assignment only; authorize before every join; revoke/remove connection membership explicitly. Groups are not a security feature and revocation requires explicit removal. [CITED: learn.microsoft.com/aspnet/core/signalr/groups]

### Pitfall 6: Browser token leaks in diagnostics
**What goes wrong:** Browser WebSocket/SSE cannot set custom Authorization headers; SignalR browser client may send bearer token in `access_token` query string, which can leak into logs.
**How to avoid:** scope query-token extraction to Hub path; redact query strings in access/proxy/application logs; never log full invite or token; test browser WebSocket in the packaged/deployed phone origin. [CITED: learn.microsoft.com/aspnet/core/signalr/authn-and-authz]

### Pitfall 7: Reconnect/UI lifecycle and missed updates
**What goes wrong:** A connection loss can silently leave stale sheet/scene state; reconnect does not imply old messages were delivered. Event subscribers may also duplicate across React remounts.
**How to avoid:** on reconnect request the current authorized snapshot, then apply versioned updates; bind/unbind handlers once, stop connection on unmount/session end, show disconnected status. Test reconnect/revocation/blackout behavior explicitly. [CITED: learn.microsoft.com/aspnet/core/signalr/javascript-client]

## Code Examples

### Browser SignalR credential handling (conceptual)
```typescript
// Token is obtained through the one-time invite exchange, held only in app memory.
const connection = new HubConnectionBuilder()
  .withUrl(`${sessionOrigin}/hubs/player`, {
    accessTokenFactory: () => playerCredential,
  })
  .withAutomaticReconnect()
  .build();
```
The browser transport constraint requires access-token query handling for WebSockets/SSE in ASP.NET Core; restrict extraction to the Hub path and redact query tokens from logs. This snippet is an architecture sketch, not a verified project implementation. [CITED: learn.microsoft.com/aspnet/core/signalr/authn-and-authz; learn.microsoft.com/aspnet/core/signalr/javascript-client]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat connected identity/roles as live authorization | SignalR captures principal at connection; explicitly revalidate mutable assignment or close connection | ASP.NET Core docs describe current behavior; no exact introduction date established | Revocation and changed assignment require server-side connection lifecycle work. [CITED: learn.microsoft.com/aspnet/core/signalr/authn-and-authz] |
| Assume Hub groups provide access control | Use authentication/authorization; groups only route messages | Current official SignalR guidance | Never grant private projection based on a client-selected group. [CITED: learn.microsoft.com/aspnet/core/signalr/groups] |

**Deprecated/outdated:** No deprecated API claim made. Do not use training-memory API signatures without checking current ASP.NET Core 10 docs.

## Runtime State Inventory

Not a rename/refactor/migration phase; new player/session runtime state must be designed and persisted in Phase 6. Existing backend data directory and SQLite usage are confirmed at `src/backend/Program.cs:7-16` and `src/backend/Encounters/EncounterService.cs:61-68`.

## Environment Availability

Phase needs phones and a LAN, but availability of Wi-Fi, firewall permission, phone/browser set, local address discovery, and a viable HTTPS certificate workflow was not probed in this session. Planner should include a real two-phone/same-Wi-Fi E2E and explicitly document what machine/network was tested. This research environment cannot establish external LAN reachability.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | .NET 10 / xUnit 2.9.3; Node built-in test runner |
| Config file | `src/backend.tests/DungeonDeputy.Api.Tests.csproj`; `package.json` test scripts |
| Quick run command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` |
| Full suite command | `npm test` |

Existing API tests use `Microsoft.AspNetCore.Mvc.Testing` and xUnit; Node TAP tests and Electron E2E are wired by package scripts. [VERIFIED: `src/backend.tests/DungeonDeputy.Api.Tests.csproj:9-17`; `package.json:6-14`]

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|------------|-------------------|--------------|
| CHAR-01 | Create/edit supported classes/species; calculation inputs, derived stats, level/proficiency and invalid/unsupported inputs | Unit + API integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | ❌ new tests required |
| CHAR-02 | One-time/expired/reused invite, no internet dependency, LAN join and QR/copy URL | API integration + manual phone E2E | backend test command + `npm run test:e2e` | ❌ |
| CHAR-03 | Own-sheet-only read, allowed inventory/resource commands, denied cross-player/DM combat/hidden reads, HP update reaches assigned player | API/Hub integration + two-client E2E | backend test command + `npm run test:e2e` | ❌ |
| CHAR-04 | Approved scene and blackout push immediately; unauthorized state excluded; reconnect snapshot current | Hub integration + packaged UI E2E | backend test command + `npm run test:e2e` | ❌ |

### Sampling Rate
- **Per task commit:** focused new xUnit test or `dotnet test ... --filter ...`.
- **Per wave merge:** `npm test`.
- **Phase gate:** full suite, `npm run test:e2e`, then two real phones on same Wi-Fi; verify no internet required, only assigned sheet visible, DM HP sync, DM-approved scene/blackout, revoke/rejoin and reconnect.

### Wave 0 Gaps
- [ ] Add character domain and ruleset tests; test database fixture setup as needed.
- [ ] Add invite/authz/projection/Hub integration coverage including two users and adversarial cross-assignment requests.
- [ ] Add phone join/player-sheet UI tests and true LAN E2E harness; current E2E is desktop/backend automation and is not evidence of phone reachability.
- [ ] Test mobile browser supported versions, browser storage/token behavior, local firewall and chosen HTTPS strategy.

## Security Domain

Security enforcement is enabled; ASVS level is configured as 1. The source contains the verbatim values `"security_enforcement": true` and `"security_asvs_level": 1`. [VERIFIED: `.planning/config.json:49-51`]

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | One-time invite exchange; high-entropy scoped credentials; throttling, expiry, revocation; do not treat join code as long-lived auth. |
| V3 Session Management | Yes | Opaque scoped token, bounded lifetime, invalidate on session stop/revoke, reconnect revalidation, no URL/log persistence. |
| V4 Access Control | Yes | Default deny, server-enforced assignment-level authorization for every projection/action; separate DM/public/player DTOs. |
| V5 Input Validation | Yes | Validate bounded DTOs and SRD-supported options in domain layer; reject arbitrary feature IDs, values and oversized payloads. |
| V6 Cryptography | Yes | Use platform cryptographic RNG and established secure token hashing; never hand-roll crypto. Exact token/hash/TLS choices require implementation review. |

### Known Threat Patterns for .NET LAN/browser stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Guess/replay join code | Spoofing | One-time short TTL invite, enough entropy, atomic consume, attempt throttling, revoke. |
| IDOR: change character/session identifier | Elevation of privilege | Resolve assignment from authenticated principal; never trust request IDs for entitlement. |
| Private data broadcast to all connections | Information disclosure | Explicit recipient projections, per-player authorization, test serialized messages for forbidden fields. |
| LAN sniffing/token theft | Information disclosure / spoofing | HTTPS where UX supports it; ephemeral scope, no token in logs/URLs/QR after exchange; openly document unencrypted HTTP risks. |
| Forged player command or client-calculated HP | Tampering | Backend-authoritative command allowlist, validation, concurrency/version handling, DM policy for combat changes. |
| Origin/CSRF/WebSocket cross-site abuse | Spoofing / elevation | Same-origin hosting, strict origin checks as defense-in-depth, credential-aware anti-CSRF strategy for cookie use; origin is not identity. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A LAN-served responsive browser app is the preferred phone client, not native apps. | Standard Stack | Mobile/browser scope and packaging change. |
| A2 | One-time invite exchange can produce an opaque scoped player credential. | Architecture | Security and UX require revision if credential lifecycle is infeasible. |
| A3 | LAN HTTP is not confidential to other Wi-Fi participants; mobile browser secure-context constraints may affect features. | Pitfalls | HTTPS design may be mandatory; verify platform-specific behavior before shipping. |
| A4 | A narrow supported character subset is sufficient, with exact supported classes/species/features to be decided. | Summary / Pattern 1 | User expectations and calculation data scope could expand. |
| A5 | Session state/credentials can be safely persisted in existing SQLite/per-user data infrastructure. | Supporting | Requires schema migration and at-rest threat assessment. |
| A6 | Package `@microsoft/signalr` is the appropriate browser client candidate. | Standard Stack | Must complete official-doc + legitimacy + registry checks before installation. |
| A7 | Current E2E pass reported by user on 2026-11-04 refers to the preceding Phase 5 gate, not Phase 6 phone behavior. | Summary | Misattributing test coverage could falsely imply LAN/mobile validation. |

## Open Questions / Safety Gates (RESOLVED for implementation planning; 2026-11-04)

1. **RESOLVED — HTTPS / phone trust UX:** Do not generate a custom certificate or imply browser-trusted TLS. MVP explicitly opts into a trusted private LAN over HTTP with a visible warning that traffic is unencrypted and nearby users may observe it. Pairing grants short-lived scoped access only; DM combat/hidden-state mutations stay on the private desktop route. Test/document the limitation and leave real security exposure for operator UAT.
2. **RESOLVED — LAN exposure and lifecycle:** LAN listener is off by default, starts only after the DM opens a player session, binds only to the selected active private interface, and stops on session end, app shutdown, Wi-Fi/interface change, or suspend/recovery uncertainty. Display the chosen local address and session state. Fail closed and require new invites after listener/session reset.
3. **RESOLVED — Player permitted actions:** Strict allowlist is assigned-character inventory and bounded resource/spell-use decrement only. Players cannot set HP, conditions, initiative, map/token/fog state, or DM notes. DM remains combat authority; DM HP changes are pushed to that character’s assigned sheet.
4. **RESOLVED — Supported SRD character subset:** Support only the explicit source-backed class/species/options and levels listed in the plan’s source audit; every unsupported choice/level displays unavailable and cannot be saved as if calculated. The implementation must source-check the needed progression/features against the pinned official SRD PDF; no generated or guessed formulas.
5. **RESOLVED — Token persistence:** Player credentials and invitations are in-memory/session-scoped; stop, process restart, expiry, revoke, or session reset invalidates all grants. Re-pair after restart; do not persist bearer credentials.
6. **RESOLVED — Public scene semantics:** Initial snapshot and SignalR events reuse the exact allowlisted public presentation DTO already consumed by the table display (including black state). A player’s own sheet is a separate projection. Never broadcast draft/private scene IDs, hidden map/token data, combat fields, or other players’ records.

These decisions resolve planning questions, not product verification. If the runtime cannot enforce any decision, implementation must stop short of claiming the affected CHAR requirement and record the blocker; physical two-phone, transport-risk, and interface/firewall behavior remain human UAT gates.

## Sources

### Primary (HIGH confidence)
- Context7 `/dotnet/aspnetcore.docs` / official ASP.NET Core SignalR authn/authz, security, groups, JavaScript client docs. Looked up cached user identity, token expiry/`CloseOnAuthenticationExpiration`, browser `access_token` transport constraint, CORS, group security and reconnect behavior on 2026-11-04.
- [Authentication and authorization in ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/signalr/authn-and-authz) — connection identity, browser token, expiry and revalidation.
- [Security considerations in ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/signalr/security) — CORS and origin guidance.
- [Manage users and groups in SignalR](https://learn.microsoft.com/aspnet/core/signalr/groups) — group security and removal semantics.
- [JavaScript client for ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/signalr/javascript-client) — browser client lifecycle/configuration.

### In-repository primary sources
- `.planning/ROADMAP.md:116-125` — phase goal and success criteria.
- `.planning/REQUIREMENTS.md:39-44,52-67` — CHAR requirements and exclusions.
- `.planning/config.json:21-51` — validation/security workflow configuration.
- `src/backend/Program.cs:7-36` — loopback port and current shared-token auth.
- `src/backend/DungeonDeputy.Api.csproj:1-14` — .NET target, SQLite dependency and bundled SRD assets.
- `src/backend/Srd/SrdCatalog.cs:5-36` — catalog records/provenance and validated categories.
- `src/backend/Encounters/EncounterService.cs:45-68,89-104` — SQLite domain service, persistence, validation.
- `src/main.ts:198-220,350-368` — Electron local API wrapper, backend startup and separate renderers.
- `package.json:6-14,21-37` — build/test/E2E scripts and current frontend dependencies.
- `.planning/PROJECT.md:42-49` — selected stack, offline and privacy constraints.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for existing .NET 10/SQLite and official ASP.NET Core SignalR guidance; MEDIUM for proposed client package pending legitimacy gate.
- Architecture: MEDIUM; strong boundaries follow repository structure and official SignalR security guidance, but HTTPS and exact commands remain unresolved.
- Pitfalls: HIGH for SignalR identity/group/browser-token behavior from official docs; MEDIUM/LOW for LAN/mobile platform details pending real device probes.

**Research date:** 2026-11-04
**Valid until:** 2026-12-04 for stable architecture guidance; re-check package version and current mobile-browser behavior immediately before implementation.
