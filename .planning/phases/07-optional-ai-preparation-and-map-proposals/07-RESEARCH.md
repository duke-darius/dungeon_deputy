# Phase 7: Optional AI Preparation and Map Proposals - Research

**Researched:** 2026-11-07
**Domain:** Optional cloud-assisted DM content generation, local SRD grounding, proposal validation and map editing
**Confidence:** MEDIUM

## User Constraints

### Locked Decisions / User Requirements
- Phase goal: “The DM can optionally turn AI-generated preparation into editable campaign content only after explicit review and acceptance.” [VERIFIED: `.planning/ROADMAP.md:139-147`; quote reproduced verbatim]
- AI-01: “With a configured provider/key, the DM can generate structured NPCs, encounter ideas, short adventures, scene descriptions, and editable map geometry.” [VERIFIED: `.planning/REQUIREMENTS.md:46-50`; quote reproduced verbatim]
- AI-02: “The DM must preview and explicitly accept generated content before it enters campaign state; rules-related output is grounded in local SRD data and separated from invented narrative.” [VERIFIED: `.planning/REQUIREMENTS.md:46-50`; quote reproduced verbatim]
- AI-03: “The app remains fully usable when AI is disabled, unavailable, or has no configured key.” [VERIFIED: `.planning/REQUIREMENTS.md:46-50`; quote reproduced verbatim]
- User-specified boundaries: Phase 6 code exists, but phone/operator UAT remains pending; do not treat that physical acceptance as complete. No player/private hidden state is shared. Warn about external API data sharing and require fresh explicit consent for every generation. Keep keys out of renderer, database, and logs; use process environment and `store:false` with accurate retention caveats. Validate output before preview and acceptance. Generate never mutates; a separate explicit Accept can add selected catalogued monsters and bounded editable tokens, but never auto-Shows or publishes. No new dependency unless justified. Keep local SRD facts separate from invented narrative. Offline workflows remain usable without AI. [User-provided constraint]
- Scope follows Phase 7 requirements only; project roadmap exclusions include “AI that changes game state or makes gameplay decisions without DM approval” and “Generated artwork as a prerequisite for mechanically valid maps.” [VERIFIED: `.planning/REQUIREMENTS.md:56-67`; quoted values reproduced]

### Discretion
- Prefer one deliberately narrow provider integration, with server-side provider seam only if it does not add untested compatibility. Recommend OpenAI Responses API only for this MVP, configurable model, secret supplied by the process environment; no client SDK/package is needed. [CITED: OpenAI Responses API create / structured outputs docs; recommendation]
- Prefer transient proposals until user acceptance. Existing campaign state and save flows remain authoritative; no extra AI persistence/history is needed for MVP. [ASSUMED]

### Deferred Ideas (OUT OF SCOPE)
- Phase 7 is limited to AI-01..03. Avoid generative artwork, automatic rule adjudication, autonomous gameplay actions, hosted accounts/services as a requirement, or sending hidden state. [VERIFIED: `.planning/REQUIREMENTS.md:56-67`; quote reproduced verbatim]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | “With a configured provider/key, the DM can generate structured NPCs, encounter ideas, short adventures, scene descriptions, and editable map geometry.” | Use bounded generation request kinds and typed proposals; map geometry requires a small editable geometry layer rather than raw model drawing commands. [VERIFIED: `.planning/REQUIREMENTS.md:48`] |
| AI-02 | “The DM must preview and explicitly accept generated content before it enters campaign state; rules-related output is grounded in local SRD data and separated from invented narrative.” | Keep generation read-only; validate before rendering preview and again after edits at acceptance; accept through ordinary campaign APIs only after a deliberate user action. Include SRD record citations/provenance separate from fiction. [VERIFIED: `.planning/REQUIREMENTS.md:49`] |
| AI-03 | “The app remains fully usable when AI is disabled, unavailable, or has no configured key.” | Feature off by default; key/model/network failures degrade to disabled/status UI and never gate existing map, encounter, character, compendium or presentation workflows. [VERIFIED: `.planning/REQUIREMENTS.md:50`] |

## Summary

The repo is a local-first Electron/React DM dashboard backed by an ASP.NET Core/.NET API, SQLite campaign state, curated local SRD records, and an existing map editor with an explicit public publish action. Phase 7 should add an optional proposal workflow at the DM dashboard/API boundary, not make the renderer call a vendor directly and not grant the model a campaign mutation interface. Current map facts: `MapToken(id,name,kind,color,x,y,artwork,visible)`; `MapDocument` persists the private draft; at most 100 tokens; supported kinds are `hero` and `monster`; supported artwork values are `hero` and `goblin`. AI acceptance can create only tokens valid under these existing limits and must preserve an actor-to-token association where supported. [VERIFIED: `src/main.ts:244-269,349-365`; `src/backend/Program.cs:20-46,60-85,136-200`; `src/backend/Maps/MapService.cs`; current MapService facts supplied by user]

Use one explicit OpenAI Responses API adapter in the .NET backend, fixed to `https://api.openai.com/v1/responses`, configured only through process environment `OPENAI_API_KEY` and `DUNGEON_DEPUTY_AI_MODEL`; there is no model default, and either missing value leaves generation disabled. OpenAI's current docs describe strict JSON Schema output through `text.format` and Bearer auth. Set `store:false` on every request: this turns off Responses API application-state retention for that request, but does not prevent provider transmission, abuse-monitoring retention, processing, or other retention under provider policy. Disclose those limits before every generation. [CITED: `https://developers.openai.com/api/reference/resources/responses/methods/create`; `https://developers.openai.com/api/docs/guides/structured-outputs`; `https://developers.openai.com/api/reference/overview`]

Treat all generated content as untrusted proposal data. Validate bounded JSON before private preview. On a separate explicit DM accept action, revalidate the edited proposal and every selected monster record ID against the current `SrdCatalog`, rejecting the entire acceptance atomically if any ID is invalid or stale. For selected monsters, use existing `EncounterService.AddMonster`; create bounded map tokens only with valid existing token fields, supported kinds/artwork, and the 100-token cap. Preserve actor-to-token mapping where supported. The DM can then edit tokens and run the encounter locally. Acceptance does not show/publish; public projection changes only through the existing separately invoked Show action. No campaign/map/encounter/player/hidden state is ever sent to the provider. Missing configuration, timeout, network/provider error, refusal, malformed/oversized response, or invalid output returns a sanitized recoverable error, no automatic retry, and no state mutation; offline workflows remain available. [VERIFIED: `src/backend/Maps/MapService.cs`; `src/backend/Encounters/EncounterService.cs`; current MapService facts and acceptance constraints supplied by user]

**Primary recommendation:** Add a small DM-only “Preparation” workspace, backend-owned OpenAI HTTP client (built-in .NET `HttpClient`/`System.Text.Json`), narrow typed proposal contracts, and an explicit preview → edit → accept flow. Ground rules by selecting relevant local SRD records first and passing only their bounded excerpts/IDs/provenance to the model; label rules citations and invented narrative in distinct fields. Never expose hidden encounter/player details by default.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Provider request, secret access, timeout and response parsing | API / Backend | — | Backend owns process environment and is already the local authority; renderer receives no secret. [VERIFIED: `src/backend/Program.cs:11-46`; `src/main.ts:257-269`] |
| Local SRD retrieval and provenance | API / Backend | Database / Storage | Backend catalog already loads licensed local records, metadata and coverage; retrieve before prompt construction. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:5-48`] |
| Proposal preview, edit controls, opt-in and acceptance affordances | Browser / Client | API / Backend | React dashboard is the DM UI; backend repeats validation and applies accepted commands. [VERIFIED: `src/renderer/src/map/MapEditor.tsx:14-43,96-169`] |
| Accepted map geometry and campaign content | API / Backend | Database / Storage | Backend validates/persists map draft and existing encounter/character state; acceptance must not publish. [VERIFIED: `src/backend/Maps/MapService.cs:55-69`; `src/backend/Program.cs:136-150`] |
| Public scene/map projection | API / Backend | Browser / Client | Only existing explicit publish/show actions update public display; AI acceptance must not invoke these. [VERIFIED: `src/backend/Program.cs:53-59,151-180`] |

## Project Constraints (from AGENTS.md)

- No repository `AGENTS.md` was found (checked root and nested paths). Global policy applies: correct and tested work first, do not fabricate verification, keep diagnostics bounded, respect repository conventions, and do not commit without authorization. User explicitly prohibited commits. [VERIFIED: repository path search; global policy supplied in agent context]
- Existing app has separate private DM and public display windows; keep all proposal content and controls in the DM renderer. [VERIFIED: `src/main.ts:15-19,412-430`; `src/preload.cts:3-15`]
- Security enforcement is enabled at ASVS level 1; source values are exactly `"security_enforcement": true` and `"security_asvs_level": 1`. [VERIFIED: `.planning/config.json:49-51`]
- Phase 6 automated implementation exists but the roadmap says “physical-phone/operator UAT remains outstanding”; do not claim CHAR-02..04 physical acceptance. [VERIFIED: `.planning/ROADMAP.md:126-135,154,163`]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ASP.NET Core backend | `net10.0` | Local AI generation and acceptance endpoints | Existing backend uses .NET 10 and owns SRD, characters, maps and encounter API. [VERIFIED: `src/backend/DungeonDeputy.Api.csproj:1-9`; `src/backend/Program.cs:11-32`] |
| `System.Net.Http.HttpClient` + `System.Text.Json` | .NET shared framework | Server-side Responses API call and JSON handling | No third-party AI SDK or JSON/schema dependency needed; existing code already uses JSON serialization. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:1,28-29`; `src/backend/Characters/CharacterService.cs:1,34`] |
| OpenAI Responses API | API interface (no package) | Structured proposal generation | Official docs expose Responses creation and strict JSON Schema output. Configure model rather than hard-coding model policy; provider remains optional. [CITED: official OpenAI API docs URLs above] |
| React + TypeScript renderer | Existing pinned versions in package manifest | DM-only preparation and proposal editor | Reuse the existing workspace, not a new renderer/framework. [VERIFIED: `package.json:21-38`; `src/renderer/src/map/MapEditor.tsx:1-10`] |

### Supporting
- Existing `SrdCatalog` is the local grounding source; server-side search/query records only, then include selected record name, summary, stats as appropriate, record ID and provenance. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:5-9,39-48`]
- Existing `MapService` and `EncounterService` remain authorities. Do not let an AI route call their mutations as a generation side effect; accepted commands must go through revalidation and user-confirmed application code. [VERIFIED: `src/backend/Maps/MapService.cs:55-69,106-115`; `src/backend/Encounters/EncounterService.cs:122-158`]
- No new dependency is recommended. [ASSUMED: implementation can rely on existing .NET framework facilities; confirm in implementation before adding packages.]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenAI-only, narrowly tested MVP | Broad provider adapter abstraction | Abstraction is useful only with a second real provider/test matrix; otherwise increases branches and unverified compatibility. [ASSUMED] |
| Built-in .NET HTTP/JSON | Vendor SDK | SDK adds dependency/version and secret-handling surface without being necessary for one HTTPS JSON API. [ASSUMED] |
| Proposal-only contract | Model tool/function calls capable of mutating campaign | Tool execution increases the chance of unreviewed side effects and is unnecessary; use output-only structured response. [CITED: OpenAI Structured Outputs docs; recommendation] |

**Installation:** None. Do not add a package for this phase unless an implementation need is demonstrated and package legitimacy checks pass.

## Package Legitimacy Audit

No package installation recommended; therefore no external package candidate requires an audit. Reuse existing .NET framework and JS stack only. [VERIFIED: `src/backend/DungeonDeputy.Api.csproj:1-9`; `package.json:21-38`]

## Architecture Patterns

### System Architecture Diagram
```text
DM chooses request kind, writes bounded prompt, reviews sharing warning
        | explicit one-request external-data opt-in
        v
React DM preparation panel --local request--> loopback Electron IPC / DM API
        |                                      (no secret in renderer)
        v
ASP.NET Core proposal endpoint
        |-- local SRD lookup -> selected records + provenance only
        |-- minimal user prompt + bounded context -> OpenAI Responses API
        |                                     (Bearer key from process env;
        |                                      store:false where supported)
        v
schema parse + domain bounds + source/narrative classification
        | invalid/error -> show recoverable status; campaign unchanged
        v
private proposal preview --DM edits--> revalidate edited proposal + current state
        | reject/discard        | explicit accept
        |                       v
        |                 private campaign/map draft only
        |                 (no token injection, encounter mutation,
        |                  show/publish/scene action)
        |                       |
        +---- existing DM workflows stay available offline <---+
```

### Recommended Project Structure
```text
src/backend/
├── AiPreparation/          # provider config/client, bounded request/response DTOs, validator
├── Srd/                    # existing local lookup and provenance source
├── Maps/                   # existing map authority; add editable proposal geometry support narrowly
└── Program.cs              # DM-authenticated proposal + explicit accept routes
src/renderer/src/
├── ai/                     # preparation request, private preview, explicit accept/edit UI
└── map/                    # render and edit only validated accepted geometry in draft
```
Proposed path names are planning suggestions, not existing files. [ASSUMED]

### Pattern 1: Backend-only provider call; output-only protocol
**What:** Renderer submits only bounded user prompt and explicitly selected local SRD record IDs. Backend resolves those IDs and sends only prompt plus bounded excerpts/provenance for selected records. Never send stored map, encounter, player, hidden, or other campaign state, even with consent. Require fresh affirmative consent for every generation, including regeneration. Use an HTTP timeout, bounded request/response size and fixed URL `https://api.openai.com/v1/responses`. No tools, callbacks, arbitrary model URLs, or campaign mutation calls. [CITED: OpenAI Responses API create/auth docs; `src/backend/Program.cs:20-46`; user decision]
**When to use:** Every cloud generation request.
**Example (conceptual; no package):**
```csharp
// Use server-only configuration and a fixed provider origin.
// Request shape: model + input + text.format={ type: "json_schema", strict: true } + store:false.
// Add Authorization: Bearer <process-env secret> only in backend memory.
// Never log request headers, prompt, response body, or secret.
```
OpenAI docs specify `POST /v1/responses`, `text.format` JSON Schema (`strict:true`), Bearer auth, and `store:false`. `store:false` disables Responses API application-state retention for that request; it does not stop transmission, abuse-monitoring retention, processing, or other provider retention. The UI warns of these distinctions and requires fresh affirmative consent each time. [CITED: official OpenAI docs above; user constraint]

### Pattern 2: Rules citations distinct from fictional fields
**What:** For any generated mechanics, retrieve grounded local SRD entries first. Proposal DTO separates (a) fiction/narrative, (b) mechanics suggestion and uncertainty, and (c) a list of local catalog IDs with exact source/provenance. Display source material and invented content separately; never present unsupported invented stats as SRD rules. The model's citation text is not authoritative: resolve each cited ID against `SrdCatalog` and reject/mark unknown references. Keep the supported catalog scope explicit. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:5-9,13-36,39-48`; remainder recommendation]
**When to use:** NPC stats, encounter/short-adventure suggestions, any rule-adjacent output. Scene descriptions and invented narrative can be labeled as creative content without pretending to be sourced rules.

### Pattern 3: Preview then validate-again acceptance
**What:** Generation returns only an in-memory preview DTO. Parse response, reject unknown fields, enforce per-kind limits and domain rules before preview. On accept, validate the user-edited DTO again server-side and against live state, then apply only the explicitly accepted subset to a private draft. Accept is a separate route/command. Preview may not persist or mutate campaign state. Rejected, canceled, malformed, timed-out or stale proposals leave campaign state unchanged. [ASSUMED architecture recommendation]
**When to use:** Every output kind and every acceptance path, including map geometry.

### Pattern 4: Geometric map proposal, not image/control generation
**What:** The existing `MapDocument` persists the draft and contains tokens, but has no general wall/shape geometry collection. Define only line segments and rectangles in normalized map coordinates: finite x/y/endpoints 0..1000, width/height 1..1000, at most 40 primitives and 80 characters per label. Reject unknown kinds and any URL, SVG, script, image, or executable content. Token proposals are separate: max 100 total; kinds only `hero`/`monster`; artwork only `hero`/`goblin`; finite x/y 0..1000. Tokens persist through `MapDocument` and use existing editor/rendering. [VERIFIED: current MapService facts supplied by user; geometry bounds are explicit Phase 7 design choices]

### Anti-Patterns to Avoid
- **Renderer-held API key or direct vendor fetch:** renderer is an untrusted/semi-trusted UI boundary; DevTools/extensions and logs widen exposure. Keep secret in backend process environment only. [ASSUMED threat mitigation; user-mandated]
- **Send all campaign context:** campaign contains DM-only encounter information and private player sheets; the default prompt must not include hidden tokens, fog state, DM notes, player sheets, secrets, or unselected encounter state. [VERIFIED: private encounter storage `src/backend/Encounters/EncounterService.cs:65-68`; player assignment scope `.planning/phases/06-srd-characters-and-local-player-sheets/06-RESEARCH.md:45,57`; rest recommendation]
- **Treat strict JSON as domain validation:** JSON Schema formatting enforces output shape, not map coordinate bounds, supported SRD IDs, current campaign constraints, or safety invariants. Validate in backend before preview and acceptance. [CITED: OpenAI Structured Outputs docs; recommendation]
- **Apply provider output during generation:** disallow mutations hidden in generate route; separate proposal and accept commands.
- **Implicitly show/publish a map or scene on accept:** proposal acceptance only modifies private draft; user separately invokes existing publish/show workflow.
- **Use an invented rules stat as licensed fact:** only catalog-verified SRD values can be labeled sourced; invented narrative/mechanics are visibly distinct and reviewable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Strict structured provider output | Prompt-only “please return JSON” parser | Responses API JSON Schema output plus local deserialization and domain validator | Output format control reduces malformed response rate; local validation still guards domain bounds. [CITED: OpenAI Structured Outputs docs] |
| General D&D rules grounding | Model memory / generated citations | Existing `SrdCatalog` and record provenance | Local records are versioned and validated; the model is not a rules authority. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:5-36`] |
| Map image generation/render commands | Model-authored SVG/HTML/script or raw raster payload | Small typed, app-rendered geometry primitives | Avoid active content, unbounded assets and hidden rendering commands; preserve edits as data. [ASSUMED] |
| Secret storage in app | Renderer localStorage, campaign SQLite or persisted settings | OS/process environment secret supplied at launch | User explicitly forbids renderer/database/log persistence; local backend is the provider boundary. [User-provided constraint] |

**Key insight:** The critical design property is side-effect isolation: the model can suggest bounded data, but only an authorized DM action and backend validator can turn that suggestion into a private draft, and a second independent explicit action publishes it. [ASSUMED]

## Common Pitfalls

### Pitfall 1: Hidden state accidentally sent to provider
**What goes wrong:** Prompt builder serializes the whole campaign/map/encounter or supplies player/private sheet details, causing external disclosure. [ASSUMED]
**Why it happens:** “Context” shortcuts often pass broad state instead of an allowlisted subset.
**How to avoid:** Send only prompt plus user-selected data; default context contains no campaign data. Require opt-in before every outbound request with a clear disclosure of exactly which fields go to the provider. Red-team prompt-building test verifies absent hidden/private fields. [User constraint]
**Warning signs:** Prompt logs, generic `Serialize(campaign)`, request with map or encounter DTO, or provider call before opt-in.

### Pitfall 2: API key leaks through renderer, persistence or diagnostics
**What goes wrong:** Secret gets exposed to renderer JS, stored in SQLite/preferences, included in exceptions/request logs, or copied into a generated error. [ASSUMED]
**How to avoid:** Backend reads `OPENAI_API_KEY` at startup/request time from process env; never echo values in status/errors; no logging of headers/body; UI only sees configured/unconfigured state. Minimize environment passed to backend if feasible, but preserve this one named key. [User constraint]

### Pitfall 3: Strict structured output mistaken for safe output
**What goes wrong:** Schema-valid coordinates can exceed map limits; valid IDs may be absent from catalog; edited preview can become invalid; size/array bounds can exhaust resources. [CITED: OpenAI Structured Outputs docs; recommendation]
**How to avoid:** Apply explicit server-side length/count/range bounds before preview and repeat after user edits during accept. Reject unknown fields and unsupported IDs; enforce total byte and operation time limits. Geometry is only line segments and rectangles, max 40, normalized finite coordinates/endpoints 0..1000, dimensions 1..1000, labels up to 80 characters. Tokens are max 100, kinds hero/monster, artwork hero/goblin, finite x/y 0..1000. [ASSUMED bounds; MapService facts user-confirmed]

### Pitfall 4: Accept causes irreversible/unexpected gameplay changes
**What goes wrong:** Acceptance adds tokens, modifies encounter initiative/HP or reveals map/scene automatically.
**How to avoid:** Accept is a separate explicit DM action. Atomically revalidate selected monster IDs against current `SrdCatalog`; use `EncounterService.AddMonster` only for valid local `srd:monster` records and omit unsupported stats. Create only bounded tokens with supported fields/kinds/artwork. Never auto-Show/publish; the existing separate Show action is the only public transition. [VERIFIED: current MapService and EncounterService facts supplied by user]

### Pitfall 5: “Offline mode” is actually blocked by AI initialization
**What goes wrong:** Startup probes API/key synchronously or blocks dashboard if provider down.
**How to avoid:** No network calls during startup; settings/status read is local. Fail fast per request with recoverable message; no cloud dependency in existing flows. [ASSUMED]

### Pitfall 6: AI prose blurs SRD facts and invented story
**What goes wrong:** Fictional mechanics appear as rules or attribution claims attach to unrelated narrative.
**How to avoid:** Separate proposal fields and visually separate labels; match SRD references by catalog IDs and display catalog provenance from local records, never accept free-text citations as proof. [VERIFIED: `src/backend/Srd/SrdCatalog.cs:5-9,30-36`; recommendation]

## Code Examples

### OpenAI Responses request shape (documentation pattern, not implementation)
```json
{
  "model": "<configured-model>",
  "input": "<bounded user-selected request and selected local SRD excerpts>",
  "store": false,
  "text": {
    "format": {
      "type": "json_schema",
      "name": "dm_proposal",
      "strict": true,
      "schema": { "type": "object", "additionalProperties": false }
    }
  }
}
```
OpenAI docs support `POST /v1/responses`, strict structured outputs through `text.format`, Bearer authentication, and `store:false`. The schema above is illustrative and incomplete; concrete schemas are authored and tested per proposal type. For this endpoint, `store:false` disables application-state retention for that request only; it does not prevent provider transmission, abuse-monitoring retention, processing, or other provider retention. [CITED: official OpenAI API docs above; user constraint]

### Accept boundary (pseudocode)
```text
request -> reject if AI disabled / opt-in absent / prompt over limit
        -> read selected SRD IDs from local catalog
        -> request structured proposal; no mutation tools
        -> parse + validate server-side -> return private preview
edited preview + explicit accept click
        -> parse + validate again against current map/campaign
        -> save selected items to private draft only
        -> return accepted draft; never show/publish or mutate encounter
```
All actions here are recommendations, not existing routes. [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompt-only JSON / JSON mode | Strict JSON Schema Structured Outputs using Responses `text.format` where model supports it | Current OpenAI API docs; date not asserted | Better format adherence, while still requiring independent backend semantic validation. [CITED: `https://developers.openai.com/api/docs/guides/structured-outputs`] |
| Provider code in frontend | Secret-bearing server/backend integration | No date asserted | Prevents renderer from receiving provider credential and centralizes external-data minimization. [ASSUMED] |

**Deprecated/outdated:** Do not base Phase 7 on Assistants API or assume older Chat Completions structured-output field names; use the current Responses API reference and recheck exact model/schema support before implementation. [CITED: OpenAI Responses migration/structured outputs docs]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| .NET backend runtime/build chain | AI server endpoint; existing app | Existing project targets `net10.0`; actual local runtime not probed | `net10.0` target | Existing build/run requirements; test with repo scripts. [VERIFIED: `src/backend/DungeonDeputy.Api.csproj:1-9`] |
| OpenAI outbound HTTPS access | Generate proposal only | Not probed; must not probe/expose API key | N/A | Disable AI / show unavailable; all local campaign workflows remain available. [ASSUMED] |
| `OPENAI_API_KEY` process environment | Provider authentication | Not inspected (secret hygiene) | N/A | Keep AI disabled; no key is persisted or prompted into renderer storage. [User constraint] |
| Configured model ID | Provider request | Not probed; no model pinned in source | User-configured | Clear configuration error; offline app unaffected. [ASSUMED] |

**Missing dependencies with no fallback:** None for normal offline DM campaign usage. AI generation itself requires configured credentials and outbound provider reachability. [VERIFIED: AI-03 requirement; phrase based on requirement]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in test runner; .NET 10 / existing xUnit API test project |
| Config file | `package.json` scripts; `src/backend.tests/DungeonDeputy.Api.Tests.csproj` |
| Quick run command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` (backend-focused) |
| Full suite command | `npm test` |

Existing scripts run renderer/API/unit tests and backend xUnit tests. [VERIFIED: `package.json:6-14`; `.planning/phases/06-srd-characters-and-local-player-sheets/06-RESEARCH.md:210-218`]

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|------------|-------------------|-------------|
| AI-01 | Each request kind yields bounded structured proposal; local SRD references resolve to local records; provider output/refusal/timeout/malformed JSON handled | Backend unit/API integration with fake `HttpMessageHandler` | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | ❌ new tests required |
| AI-02 | No mutation on generate, preview, edit, reject or invalid accept; explicit valid accept changes only private draft; no presentation or encounter mutation | Backend API integration + renderer workflow tests | `npm test` | ❌ new tests required |
| AI-03 | AI disabled/no key/network failure keeps existing map/encounter/SRD/character/presentation APIs and dashboard usable; no startup network dependency | Backend integration + existing Electron E2E | `npm run test:e2e` and `npm test` | ❌ add test coverage |
| Privacy/security (cross-cutting) | Default request excludes player sheets, hidden tokens/fog/DM-only encounter data; opt-in required; no API key in renderer, SQLite, logs/error | Backend prompt-capture test + adversarial API/UI test | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | ❌ new tests required |
| Map/actor proposals | Bounded geometry and supported editable tokens after separate explicit acceptance; no automatic token/actor mutation on generation and no automatic publish | Domain + API/E2E tests; map editor test | `npm test` | ❌ new tests required |

### Sampling Rate
- **Per task:** focused domain/API or renderer test for newly implemented behavior.
- **Per wave:** `npm test`.
- **Phase gate:** full suite and packaged E2E; exercise disabled/no-key/offline behavior; verify an outbound request is impossible until disclosure opt-in; inspect generated logs/storage for secret/content leaks; verify preview/accept/private draft/edit flow and confirm public display stays unchanged until separate publish.

### Wave 0 Gaps
- [ ] Add backend AI service tests using deterministic fake HTTP responses; never depend on live provider calls in CI.
- [ ] Add schema/domain bounds tests for all proposal types and second validation after preview edits.
- [ ] Add API tests proving generate/accept separation, idempotence/concurrency behavior, and unchanged map/encounter/public presentation before publish.
- [ ] Add privacy tests that capture outbound request content and assert no unselected campaign/player/hidden data or credentials are included.
- [ ] Add UI tests for disabled/no-key, opt-in disclosure, private preview, edits, reject, explicit accept, and manual publish separation.
- [ ] Add one opt-in live provider smoke check only if needed; keep credentials outside CI logs and local artifacts. [ASSUMED]

## Security Domain

Security enforcement is enabled and ASVS level 1 is configured; exact source values are `"security_enforcement": true` and `"security_asvs_level": 1`. [VERIFIED: `.planning/config.json:49-51`]

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Provider key stays backend-only; all AI routes remain under existing DM loopback auth; no player route access. [VERIFIED: `src/backend/Program.cs:20-46`] |
| V3 Session Management | Yes | No AI credential or proposal session is persisted by default; use bounded request lifecycle and clear transient preview on discard. [ASSUMED] |
| V4 Access Control | Yes | DM-only route and DM renderer; deny player/public windows access to proposal controls or payload. [VERIFIED: `src/preload.cts:3-15`; recommendation] |
| V5 Input Validation | Yes | Bound request kind, prompt length, context fields, output size/counts, geometry coordinates and edits on server; validate before preview and accept. [ASSUMED] |
| V6 Cryptography | Yes | TLS for provider HTTP; use platform TLS and HTTP libraries; never hand-roll crypto. [CITED: OpenAI HTTPS API reference; recommendation] |

### Threat Model
| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| Secret exposure from renderer/preferences/SQLite/logs | Information disclosure | Backend-only env key; no key echo; redact provider errors and do not log request/response bodies or headers. [User constraint] |
| Hidden campaign/player data sent externally | Information disclosure | Explicit per-request opt-in/disclosure; default empty context; allowlist requested input; never serialize full campaign/encounter/sheet. [User constraint] |
| Malicious/compromised provider response or prompt injection | Tampering / elevation | Treat model output as untrusted data; strict output schema plus server-side semantic bounds; no tools/commands; escaped text rendering. [CITED: Structured Outputs docs; recommendation] |
| Invalid geometry causes crash, resource exhaustion or unsafe rendering | Denial of service / tampering | Bound response bytes, counts, coordinate ranges, shape kinds and text lengths; app-owned renderer only; no SVG/scripts/URLs. [ASSUMED] |
| Accidental campaign/public mutation | Tampering / information disclosure | Generate path read-only; separately authorized accept; accept only private draft; publish/show remains separately confirmed. [VERIFIED: existing publish route `src/backend/Program.cs:151-180`; recommendation] |
| API unavailable or response refusal | Denial of service | Timeouts, cancellation, bounded retries/no auto-loop; preserve offline workflows and present retryable local status. [ASSUMED] |

**External data-sharing notice:** Every request to OpenAI transmits the prompt plus selected local SRD context to an external service. Explicitly disclose this immediately before submission and require affirmative user opt-in; `store:false` is a request setting, not a promise that data never leaves the machine or is not processed under provider policies. [CITED: official Responses create docs; user constraint]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenAI-only is the simplest acceptable MVP provider choice, with a narrow adapter and configurable model. | Stack | User/provider preference or account policy may require another provider. |
| A2 | `OPENAI_API_KEY` is inherited by the backend child process via current environment-spread behavior or can be explicitly forwarded without persistence. | Stack / Security | Key may be unavailable or broader environment inheritance may expose unrelated secrets. |
| A3 | Proposal DTOs can remain transient until accept, without generated history or audit persistence. | Architecture | Product may require saved drafts or audit trail. |
| A4 | A small typed geometry layer (e.g. bounded wall segments and labeled rectangles) is enough to meet “editable map geometry.” | Architecture | Map design scope may require richer primitives, grid semantics, or user confirmation. |
| A5 | Local catalog record excerpts can be transmitted after explicit per-request opt-in. | Grounding / privacy | Licensing or user privacy policy may require sending only IDs or no SRD text. |
| A6 | The generation endpoint may use built-in `HttpClient` and `System.Text.Json` without a new package. | Standard Stack | Implementation details may reveal a justified package need; perform legitimacy gate first. |
| A7 | Provider network absence, missing key, refusal or malformed response can fail closed without changing existing app workflows. | AI-03 | Startup coupling or unhandled errors could violate offline behavior. |
| A8 | `store:false` remains supported for Responses API requests; verify exact current API behavior and provider retention policy at implementation. | Pattern 1 | Data retention expectations could be incorrect; never equate API setting with no external processing. |

## Resolved Questions

1. **Geometry:** Closed line-segment and rectangle primitives only; normalized finite coordinates/endpoints 0..1000, width/height 1..1000, maximum 40 primitives, labels maximum 80 characters. No additional primitive types or active content.
2. **Request/output bounds:** Prompt maximum 2,000 characters; at most 3 selected SRD records, each excerpt maximum 2,000 characters and total excerpts maximum 6,000 characters; provider response maximum 64 KiB. NPCs max 8 (name 80, description 500 characters each); encounter actors max 8 (name 80, rationale 500 characters each); short adventure max 5 scenes (title 80, description 500 characters each); scene description max 1,000 characters; geometry max 40 primitives with 80-character labels. Reject rather than truncate invalid/over-limit requests or responses; enforce before preview and again after edits on acceptance.
2. **Provider/model:** Fixed `https://api.openai.com/v1/responses`; `DUNGEON_DEPUTY_AI_MODEL` is required and has no default. Missing it or `OPENAI_API_KEY` disables generation while preserving offline use.
3. **Environment:** Backend receives/reads only `OPENAI_API_KEY` and `DUNGEON_DEPUTY_AI_MODEL`; neither is persisted or exposed to renderer.
4. **Outbound fields and consent:** Every request (including regeneration) requires fresh affirmative consent. Send only bounded user prompt and excerpts/provenance for explicitly selected local SRD records. Never send stored map, encounter, player, hidden, or other campaign state.
5. **Retention:** `store:false` disables Responses API application-state retention for that request, but does not prevent transmission, abuse monitoring, processing, or other provider retention. Warn user explicitly.
6. **Map/encounter acceptance:** Token shape `MapToken(id,name,kind,color,x,y,artwork,visible)`; `MapDocument` persists drafts; maximum 100 tokens; kinds `hero`/`monster`; artwork `hero`/`goblin`. Separate explicit acceptance revalidates selected IDs atomically against current `SrdCatalog`, calls `EncounterService.AddMonster` for valid local `srd:monster` IDs, omits unsupported stats, creates bounded tokens and preserves actor-token mapping where possible. DM can edit tokens/run locally. Existing separate Show is the only public transition.
7. **Provider failure:** Disabled/missing configuration, timeout, network/provider error, refusal, malformed/oversized response, or invalid output yields sanitized recoverable status, no automatic retry, and no campaign/map/encounter/public mutation. Offline tools remain available.
8. **Phase 6 UAT:** Phase 7 may progress under the user's all-phase instruction, but does not verify CHAR-02..04 or project completion; physical phone/operator UAT remains an overall final acceptance gate.

## Sources

### Primary (HIGH confidence)
- OpenAI Responses API create reference: `https://developers.openai.com/api/reference/resources/responses/methods/create` — response creation endpoint, request options and schema formats.
- OpenAI Structured Outputs guide: `https://developers.openai.com/api/docs/guides/structured-outputs` — strict JSON Schema through `text.format`.
- OpenAI API authentication overview: `https://developers.openai.com/api/reference/overview` — Bearer authorization.
- In-repo sources listed below were opened and read this session.

### In-repository primary sources
- `.planning/ROADMAP.md:139-149,154,163` — Phase 7 goal/success criteria and Phase 6 UAT status.
- `.planning/REQUIREMENTS.md:46-67,93-95` — AI-01..03 and out-of-scope boundaries.
- `.planning/config.json:21-51` — validation and security settings.
- `src/backend/Program.cs:20-46,60-85,136-200` — loopback/auth, local SRD, character/map/encounter APIs.
- `src/backend/Srd/SrdCatalog.cs:5-48` — SRD provenance, category allowlist, search and records.
- `src/backend/Maps/MapService.cs:7-18,55-69,106-115,195-209` — current map DTO, persistence bounds, token and publication paths.
- `src/backend/Encounters/EncounterService.cs:45-68,89-104,122-158` — private persistence, validated mutation and monster add behavior.
- `src/renderer/src/map/MapEditor.tsx:14-43,96-169,208-215,228-243` — private draft, explicit save/show/blackout and workspace patterns.
- `src/preload.cts:3-15`; `src/main.ts:244-269,349-365` — isolated renderer capabilities, backend child process and API command boundary.
- `src/backend/DungeonDeputy.Api.csproj:1-15`; `package.json:6-14,21-38` — existing target/dependencies/test scripts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for existing .NET/React stack and OpenAI endpoint/structured-output docs; MEDIUM for recommended provider default and model configuration.
- Architecture: MEDIUM; repository boundaries and MapService/EncounterService capabilities are clear; geometry bounds and acceptance behavior are now explicitly selected.
- Security: HIGH for current DM loopback auth, isolated renderer and private/public map publication boundaries; MEDIUM for proposed secrecy/privacy safeguards until adversarial tests prove them.
- Testing: HIGH for existing scripts/frameworks; LOW/MEDIUM for future AI-specific coverage since none exists yet.

**Research date:** 2026-11-07
**Valid until:** Recheck provider request/storage semantics, available model IDs and package/API behavior immediately before implementation; stable repository patterns valid while source remains unchanged.
