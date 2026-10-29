# Phase 3: Fog of War and Encounter Control - Research

**Researched:** 2026-10-29  
**Domain:** Local-first tabletop map projection, fog editing, and encounter state  
**Confidence:** HIGH for existing implementation and PixiJS API; MEDIUM for recommended extension shape

## User Constraints

### Locked Decisions

### Fog editing
- Fog uses a freeform circular paint brush independent of the optional square grid.
- Fog starts fully hidden when first enabled; the DM deliberately reveals explored areas.
- Reveal and Hide are separate, clearly indicated tools, not an implicit toggle.
- The brush has an adjustable size suitable for revealing rooms and corridors.

### Reveal behavior and privacy
- A completed Reveal/Hide stroke updates the player display immediately; do not add a second Show step for each fog action.
- A token remains hidden until explicitly made visible, even when its map location is revealed.
- Newly added tokens start visible; the DM can hide them during setup for an ambush.
- Fog and token visibility persist with the encounter through application restart.
- HP, conditions, initiative, and dice results remain DM-only. Public output is limited to revealed terrain and explicitly visible token visuals; no encounter controls or private combat values enter the public projection.
- Preserve the Phase 2 decision to defer SignalR until Phase 6/CHAR-04. Phase 3 still needs prompt public updates for completed fog/visibility actions using an appropriately small local mechanism; the player renderer must remain fail-closed.

### Encounter flow
- The DM can roll a d20 or manually enter initiative for an actor.
- Turn order sorts by descending initiative. The DM can manually resolve tied actors' order.
- Conditions use a curated built-in list in Phase 3. Keep condition definitions separate enough that a later Almanac can supply SRD and DM-authored definitions.
- The dice roller supports standard D&D dice (d4, d6, d8, d10, d12, d20, d100) with an optional modifier.
- The user calls the planned in-app knowledge database the **Almanac**: it will eventually store 5e rules, characters, effects, and spells. Full Almanac authoring and sourcing are not Phase 3 scope; record the integration path for later phases.

### Agent discretion
- Choose the smallest robust representation for painted fog and persistence while preserving editable map geometry and fail-closed public projection.
- Keep HP and condition controls compact and usable from the existing dashboard during play; combat details are DM-only unless a future approved public projection explicitly says otherwise.
- Keep encounter actions authoritative in the local backend and make each persistence/publication transition testable.
- Respect the existing roadmap boundary: no line-of-sight simulation, pathfinding, complex spell automation, or SignalR before Phase 6.

### Deferred Ideas (OUT OF SCOPE)
- Full Almanac data sourcing, general DM-authored Almanac entries, and broader 5e rules/character/effect/spell content belong to the later compendium/character stages, not this phase.
- SignalR, player phones, and real-time network synchronization remain Phase 6.
- Line-of-sight, pathfinding, complex spell automation, and automated tactical decisions remain out of scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENCT-01 | The DM can manually reveal or hide map regions and keep hidden tokens and unrevealed information off the player display. [VERIFIED: `.planning/REQUIREMENTS.md:24`] Quote: “The DM can manually reveal or hide map regions and keep hidden tokens and unrevealed information off the player display.” | Brush state/persistence, public projection, and fail-closed verification. |
| ENCT-02 | The DM can manage actor HP, simple conditions, initiative order, turn advancement, and basic dice rolls from the dashboard. [VERIFIED: `.planning/REQUIREMENTS.md:25`] Quote: “The DM can manage actor HP, simple conditions, initiative order, turn advancement, and basic dice rolls from the dashboard.” | Encounter domain model, validation, compact dashboard panel, and deterministic unit tests. |
| ENCT-03 | The DM can run a basic encounter without leaving the main dashboard, while only approved visual state is public. [VERIFIED: `.planning/REQUIREMENTS.md:26`] Quote: “The DM can run a basic encounter without leaving the main dashboard, while only approved visual state is public.” | Integrate controls in MapEditor; public DTO remains separate and sanitized. |

## Summary

Extend the existing map document and backend authority rather than create a second renderer or install dependencies. The app already uses a singleton `MapService`, SQLite JSON documents, an authenticated loopback API, PixiJS 8.22, and a separate strict public projection. The most straightforward design is to persist terrain visibility (initially hidden; represent revealed regions as normalized circular brush stamps or compact strokes in map coordinates) alongside map state, and token visibility alongside each token; keep encounter-only actor values in a separate private encounter document/table. [VERIFIED: `src/backend/Maps/MapService.cs:7-11, 28-39`; quote: “public sealed record MapToken(string Id, string Name, string Kind, string Color, double X, double Y, string Artwork = \"hero.svg\");” and “CREATE TABLE IF NOT EXISTS map_draft (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS approved_map (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL);”]

Fog/visibility actions are exceptional to Phase 2's show-map snapshot: after the backend validates and persists a completed action, update the active public map projection directly. No SignalR is needed for this local two-window app: the existing public renderer's one-second `/api/presentation` polling can refresh the live fog state promptly (bounded by a polling interval), and can remain the refresh transport. Ensure the live presentation state is updated as part of the same authoritative backend transition, not via a renderer-only state shortcut. [VERIFIED: `src/renderer/src/PublicDisplay.tsx:13-21` quote: “const timer = window.setInterval(() => void refresh(), 1000);”; `src/backend/Program.cs:14,19-30,54` quote: “options.Listen(IPAddress.Loopback, port)” and “app.Use(async (context, next) =>”]

**Primary recommendation:** Implement encounter actions in authenticated ASP.NET routes backed by transactional SQLite persistence; form a dedicated allowlisted public map DTO from authoritative map/fog/token data, and publish only the sanitized visual projection after successful persistence. Treat a malformed projection or failed public fetch as black/empty, never as permission to reuse stale private data. [VERIFIED: `src/renderer/src/contracts.mjs:10-18` quote: “return black;”; `src/renderer/src/PublicDisplay.tsx:15-17` quote: “catch { if (alive) setPresentation(black); }”]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stroke gestures and brush preview | Browser / Client | API / Backend | Pixi owns pointer coordinates/preview; backend owns persisted fog truth. Existing canvas owns gesture lifecycle. [VERIFIED: `src/renderer/src/map/MapCanvas.tsx:12-15,34-38`] |
| Fog/token filtering and public projection | API / Backend | Browser / Client | Backend must be authoritative; dedicated projection prevents private properties entering public DTO. [VERIFIED: `src/backend/Program.cs:44-54`; `src/renderer/src/contracts.mjs:10-18`] |
| HP, conditions, initiative, turn and dice | API / Backend | Browser / Client | Domain transitions and persistence belong in local backend, UI sends commands/displays responses. [CITED: `tabletop_dm_gsd_brief.md:39-47`] |
| Restart durability | Database / Storage | API / Backend | Existing SQLite map document is persisted beneath per-user data path; extend this authority. [VERIFIED: `src/backend/Maps/MapService.cs:17-23,28-39`] |
| Public map refresh | Browser / Client | API / Backend | Existing player renderer polls `/api/presentation` every second; backend returns active allowlisted presentation. [VERIFIED: `src/renderer/src/PublicDisplay.tsx:13-21`; `src/backend/Program.cs:34`] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PixiJS | 8.22.0 (already pinned) | 2D fog overlay, brush pointer interaction, preview | Existing canvas already uses Pixi containers/Graphics and federated pointer lifecycle; no new package. [VERIFIED: `package.json:21-25` quote: `"pixi.js": "8.22.0"`; [CITED: PixiJS v8.22 event docs](https://github.com/pixijs/pixijs/blob/v8.22.0/src/events/__docs__/events.md)] |
| ASP.NET Core / .NET | .NET 10 project (existing) | Authenticated local encounter/fog API and domain authority | Existing minimal API and loopback auth middleware. [VERIFIED: `src/backend/Program.cs:5-30` quote: `builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));`]; [ASSUMED] exact installed SDK needs executor confirmation. |
| Microsoft.Data.Sqlite | Existing project reference | Durable map/fog/encounter JSON or relational records | Existing SQLite direct access, per-user database, simple write gate and transaction patterns. [VERIFIED: `src/backend/Maps/MapService.cs:1,15-23,54-60`] |
| React + TypeScript | Existing pinned dependencies | Encounter panel and command UI | Existing dashboard and renderer state. [VERIFIED: `package.json:21-25` quote: `"react": "19.3.1"`; `src/renderer/src/map/MapEditor.tsx:10-20`] |

### Supporting
No additional dependencies recommended. Draw fog with `Graphics` and persist simple normalized circle strokes; keep stable curated condition data in a domain catalog interface/record shape, not an Almanac integration dependency. [ASSUMED]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-map JSON extension for fog | New normalized fog-stroke table | JSON is smallest and consistent with current one-document map data; separate rows become preferable only if measured stroke volume/query needs justify it. [VERIFIED: current JSON design at `src/backend/Maps/MapService.cs:30,39,59`] |
| Existing one-second poll | SignalR/websocket/push | Avoid: SignalR is explicitly Phase 6; polling already supports a local small mechanism with at most roughly one second latency. [VERIFIED: `PublicDisplay.tsx:20`; [VERIFIED: `.planning/phases/02-playable-digital-battle-map/02-CONTEXT.md:92`] quote: “SignalR/player phones, and immediate push scene/blackout updates (Stages 5–6; CHAR-04 specifically belongs to the SignalR stage).” |

**Installation:** None. Do not add packages in this phase.

## Package Legitimacy Audit

No external packages are proposed or installed. Existing pinned packages remain unchanged; no legitimacy gate is required for this phase.

## Architecture Patterns

### System Architecture Diagram

```text
DM pointer stroke / encounter control
        ↓ authenticated Electron DM bridge (X-Dungeon-Token)
Local ASP.NET API → validate command → SQLite transaction (map/fog/token or private encounter)
        ↓ after successful persisted visual action
Sanitized public map projection → active presentation state → PublicDisplay 1s poll
        ↓
revealed terrain + explicitly visible token visuals (no encounter values)
```

The bridge/API and polling path are existing repository behavior; transaction ordering and data split are proposed phase work. [VERIFIED: `src/preload.cts:6-10`; `src/backend/Program.cs:19-30,34,44-54`; `src/renderer/src/PublicDisplay.tsx:13-21`; proposed additions [ASSUMED]]

### Recommended state split

* **Map/fog/token visual state:** extend the map document JSON to include an explicit fog-enabled/visibility representation and per-token `visible` boolean. New tokens get `visible: true`; migrated existing tokens should also default visible to preserve Phase 2 output. Fog enabled with no reveal strokes means entirely hidden terrain. Apply stroke operations in map coordinates independent of grid scale. [ASSUMED: design recommendation; current token shape source `src/backend/Maps/MapService.cs:7-9`]
* **Encounter state:** separate private record/table keyed by campaign/session and actor/token ID; contain HP/max HP, condition IDs, initiative value/manual-vs-roll metadata, tie-break order, active turn/index, and private roll history if history is retained. Keep this out of `PublicPresentation` and `PublicMap`. [ASSUMED]
* **Condition catalog:** use stable machine IDs plus display labels and optional future source/reference IDs; Phase 3 supplies curated built-ins, with an interface/record shape that can later be fed by Almanac data without requiring an Almanac now. [ASSUMED]
* **Public rendering:** compose active map art/grid plus revealed terrain and only visible tokens; remove invisible tokens server-side before DTO creation, not just in CSS/client render. Retain explicit field selection and validation at the renderer boundary. [VERIFIED: `src/backend/Maps/MapService.cs:117` quote: `approved.Tokens.Select(t => new MapToken(t.Id,t.Name,t.Kind,t.Color,t.X,t.Y,t.Artwork)).ToList()`; `src/renderer/src/contracts.mjs:12-13` quote: `tokens.map(({id,name,kind,color,x,y,artwork})=>({id,name,kind,color,x,y,artwork}))`]

### Public data-flow threat paths

| Threat path | Failure mode | Planner-level control |
|---|---|---|
| Private map draft or encounter JSON accidentally returned from GET/API | HP, notes, hidden token identifiers leak | Separate private response route/DTO from public presentation; public map constructor only copies allowlisted visual values. Test serialized public JSON does not contain HP/conditions/initiative/roll fields. [VERIFIED: `src/backend/Maps/MapService.cs:41-47,117`; `src/renderer/src/contracts.mjs:10-18`] |
| Hidden token merely hidden in renderer | Token payload is inspectable in public window and devtools | Filter token out in backend projection before response; visibility boolean is private control metadata, not public DTO. [ASSUMED] |
| Fog clipped/approximated only visually | Asset pixels beneath overlay remain available or reveal incorrect areas | Public projection must deliver only revealed terrain as a mask/clip or server-derived display representation; never send the original full terrain in a way that bypasses the mask. Local trusted display is not a substitute for projection tests. [ASSUMED] |
| Persistence commits but presentation fails, or reverse | Display could show unpersisted reveal / restart reverts | Persist validated action first, then update active presentation from persisted authoritative state; report failure and retry/reload. Avoid renderer optimistic publication. [ASSUMED] |
| Poll/HTTP failure | Stale public frame may continue exposing an earlier state | Current catch path blacks display; preserve fail-closed behavior and verify malformed/unauthorized responses black out. [VERIFIED: `src/renderer/src/PublicDisplay.tsx:15-17`] |
| Token visibility separate from terrain | Revealed room implicitly reveals enemies | Keep independent boolean; public token set = visible tokens only, regardless of revealed mask. [CITED: `.planning/phases/03-fog-of-war-and-encounter-control/03-CONTEXT.md:23-27`] |

### Pixi pointer lifecycle

Use map-space brush radius and convert Pixi global coordinates through the current camera transform (`screenToMap`) to avoid zoom-dependent persisted sizes. Register brush handling in the existing stage lifecycle; distinguish brush mode from token drag/pan so gestures cannot accidentally move tokens while painting. Ensure stroke is finalized on `pointerup` and `pointerupoutside`, and cancelled/reset on `pointercancel`, component cleanup, tool switch, and API failure. Pixi v8 docs confirm global pointer movement fires regardless of hit target and `pointerupoutside` handles release outside the original target. [CITED: https://github.com/pixijs/pixijs/blob/v8.22.0/src/events/__docs__/events.md; existing transform/event source `src/renderer/src/map/MapCanvas.tsx:34-38`]

Do not recreate Pixi application per brush state update. Current `MapCanvas` uses an initialized stage, latest-props ref, draw callback, and listener cleanup; extend that lifecycle and keep state/API code in React/backend. [VERIFIED: `src/renderer/src/map/MapCanvas.tsx:14-20,31-46` quote: `const latest = useRef({ image, gridVisible, scale, tokens, onMove }); latest.current = { image, gridVisible, scale, tokens, onMove };`]

### Recommended Project Structure

```text
src/backend/Maps/MapService.cs             # map + fog/token visibility authority
src/backend/Encounters/EncounterService.cs # private encounter state / transitions
src/backend/Program.cs                    # authenticated route bindings
src/renderer/src/map/MapCanvas.tsx         # brush input/render overlay
src/renderer/src/map/MapEditor.tsx         # fog toolbar + encounter panel integration
src/renderer/src/PublicDisplay.tsx         # sanitized visible map/fog view only
src/renderer/src/contracts.mjs             # allowlisted public projection validation
```

Structure is an implementation recommendation, not a claim that these new paths already exist. [ASSUMED]

### Encounter ordering / dice patterns

Keep initiative as numeric value plus an explicit, DM-editable tie-break ordering key; stable sort descending value then ascending manual order. Do not infer order from actor name or insertion order for ties. D20 and manual entry share the same validation/recorded transition. Dice input should be a finite modifier and closed die enum of d4/d6/d8/d10/d12/d20/d100; validate server-side and use an injectable/testable random source if reproducibility is needed for tests. Do not expose private rolls on the public endpoint. [ASSUMED]

### Anti-Patterns to Avoid

- Do not store encounter truth only in React or Pixi state; restart and concurrency would lose/contradict it. Backend persistence is authoritative. [CITED: `tabletop_dm_gsd_brief.md:39-47`]
- Do not reuse explicit “Show on table” for every reveal stroke; fog/visibility actions publish promptly by locked decision. [CITED: `03-CONTEXT.md:23-28`]
- Do not include a `visible: false` token in the public response; omit it entirely.
- Do not use a square grid mask, tile-only reveal, or line-of-sight computation; requirement is freeform circular brush and explicit scope excludes LoS/pathfinding.
- Do not let token dragging, panning, wheel zoom, painting, or pointer exit leave input mode stuck; single pointer lifecycle must clean up listeners and finish/cancel strokes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pointer-up-outside/global drag lifecycle | One-off DOM pointer handlers on top of Pixi | Existing Pixi federated events + `registerPointerLifecycle` pattern | Existing code already handles global moves, outside release, and listener disposal; official Pixi v8 docs describe these events. [VERIFIED: `canvasPolicy.mjs:31-43`; [CITED: Pixi events docs](https://github.com/pixijs/pixijs/blob/v8.22.0/src/events/__docs__/events.md)] |
| Public data filtering | Reuse full map/encounter object and hide UI fields | Explicit backend public DTO + `publicView` allowlist validation | Prevent accidental leakage by construction and fail closed on malformed values. [VERIFIED: `contracts.mjs:10-18`] |
| Persistence | Custom file format / renderer-local storage | Existing SQLite document persistence and transaction/write-gate pattern | Already durable across reopen and aligned with project authority. [VERIFIED: `MapService.cs:22,48-60`] |
| Real-time transport | SignalR / LAN push infrastructure | Existing authenticated local API plus public renderer polling | Satisfies local refresh without crossing Phase 6 boundary. [VERIFIED: `PublicDisplay.tsx:20`; cited Phase 2 context `02-CONTEXT.md:92`] |

**Key insight:** Public privacy is easiest to verify when the API physically omits private fields and hidden tokens; client-side hiding is not a security boundary.

## Common Pitfalls

### Pitfall 1: Leaking private values through a “convenient” shared DTO
**What goes wrong:** Encounter fields or hidden token metadata become available to the player renderer.  
**Why it happens:** Extending `PublicPresentation` or returning the saved private document directly.  
**How to avoid:** Separate DTOs; derive public response from persisted data with explicit property construction, then validate in renderer. Add contract tests for forbidden keys and hidden-token absence.  
**Warning signs:** Public endpoint returns `MapState`, token `visible` flag, actor stats, initiative, conditions, or dice records. [VERIFIED current separate conversion `src/backend/Maps/MapService.cs:117`; exact quoted statement above]

### Pitfall 2: Restart/publish split-brain
**What goes wrong:** In-memory active presentation shows a stroke that is lost on restart, or persisted truth is not reflected after a failed update.  
**Why it happens:** Current map draft/approved rows persist, while `PresentationState` active state is in memory. [VERIFIED: `MapService.cs:30-39`; `PresentationState.cs:17-23`]  
**How to avoid:** Document whether restart restores persisted live visibility or safely blacks out; ensure boot reconstruction uses persisted approved map plus persisted fog state if continuity is intended. Test both cold start and backend restart, including failed write/publication. [ASSUMED recommendation]  
**Warning signs:** Rendering state updated in browser before request succeeds; no startup restoration test.

### Pitfall 3: Wrong fog coordinate space or unbounded stroke growth
**What goes wrong:** Brush size changes with zoom, scribbles disappear after transform, or long sessions bloat serialized JSON.  
**Why it happens:** Persist screen coordinates or one point per raw pointer event.  
**How to avoid:** Persist normalized/map-coordinate circle centers and radii, simplify/dedupe nearby samples, constrain coordinate/radius/count/serialized size server-side, transact completed stroke batches. [ASSUMED]

### Pitfall 4: Race and stale writes from rapid drawing/polling
**What goes wrong:** Later stroke overwrites earlier stroke or public updates reorder.  
**Why it happens:** Async request per pointer move or whole stale document PUT.  
**How to avoid:** Send one bounded operation per completed stroke; serialize state transitions under existing write gate/transaction, derive active public projection from latest persisted state. [VERIFIED current write gate: `MapService.cs:15-16,48-60`; recommendation [ASSUMED]]

### Pitfall 5: Initiative tie order and invalid rolls
**What goes wrong:** Identical values flip on refresh or manual values/modifiers overflow or accept unsupported die sizes.  
**Why it happens:** Unstable sort / permissive UI-only validation.  
**How to avoid:** Explicit stored tie-break order; backend validation and tests for each accepted die, modifier bounds, zero/negative/large values, ties, and turn wrap. Exact numeric bounds are product decisions if not in context; choose bounded validation, document it. [ASSUMED]

## Code Examples

### Pixi pointer stream for brush lifecycle

Pixi v8 supports event mode `static`, `globalpointermove`, `pointerup`, and `pointerupoutside`; attach to the existing stage and always detach handlers at cleanup. [CITED: https://github.com/pixijs/pixijs/blob/v8.22.0/skills/pixijs-events/SKILL.md]

```ts
stage.eventMode = 'static';
stage.hitArea = app.screen;
stage.on('pointerdown', beginStroke);
stage.on('globalpointermove', appendMapSpaceBrushSample);
stage.on('pointerup', finishStroke);
stage.on('pointerupoutside', finishStroke);
stage.on('pointercancel', cancelStroke);
// On effect cleanup: stage.off each matching listener.
```

Avoid sending each sample to the backend: accumulate preview locally, simplify, then submit a single completed stroke.

### Existing auth/route pattern (extension point)

All current routes are behind middleware requiring `X-Dungeon-Token`; bind new encounter routes after middleware and before `app.Run()`. [VERIFIED: `src/backend/Program.cs:19-30,44-56` quote: `app.MapGet("/api/map", (MapService maps) => Results.Ok(maps.Get()));`]

```csharp
app.MapPost("/api/map/fog/strokes", (FogStrokeCommand command, MapService maps) =>
    maps.ApplyFogStroke(command) ? Results.NoContent() : Results.BadRequest());
```

The type/method above is illustrative and proposed, not an existing discrete repo value. [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pixi v7 interaction manager-era event setup | PixiJS v8 federated pointer events, `eventMode`, global pointer movement | v8 generation; exact change date not needed for this phase | Use current v8 event names and lifecycle; repo already pins 8.22.0. [CITED: official Pixi v8 docs; VERIFIED package version `package.json:22`] |
| SignalR for immediate local display changes | Existing one-second polling during Phase 3; SignalR in Phase 6 | Locked roadmap boundary | Achieve prompt local display updates without introducing deferred network synchronization. [CITED: `.planning/ROADMAP.md:94-103`] |

**Deprecated/outdated:** No need to add Pixi viewport plugins or a new real-time package. Avoid implementing older Pixi interaction APIs not used by the installed v8 stack. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Store compact brush stamps/strokes in map coordinates in map document; initially hidden means no reveal geometry. | Summary / Architecture | Map JSON growth and migration behavior need adjustment. |
| A2 | Separate encounter table/document keyed by session is smallest clean privacy boundary. | Architecture | May require schema/keying changes if multiple encounters per session are required. |
| A3 | Public refresh via existing 1-second polling is sufficiently prompt under locked “appropriately small local mechanism.” | Summary | User-perceived latency may be too high; confirm acceptance with demo, not SignalR. |
| A4 | Persisted encounter state and live public presentation can be reconstructed safely at startup. | Pitfalls | Must choose explicit cold-start behavior; incorrect assumption risks display/public privacy. |
| A5 | Brush stroke simplification, maximum points/radius/count, dice modifier bounds, and condition identifiers need implementation-defined safe limits. | Pitfalls / Encounter | Limits may constrain DM use; choose generous bounded values and test. |
| A6 | .NET 10 SDK presence/version on execution machine was not probed during this research. | Standard Stack | Build may need installed SDK/runtime; packaged app behavior unaffected if SDK only needed for build. |

## Open Questions

1. **Cold-start public behavior:** Restore last live revealed map after restart or safely return to blackout until explicit DM action? Context requires persisted fog/token visibility, but does not state automatic publication semantics. Recommend restore persisted visual visibility only if the existing app's safe presentation lifecycle approves it; otherwise keep public black while preserving private map state. [ASSUMED]
2. **Fog reset / new map behavior:** Should blank/new maps begin fully hidden immediately, and should a DM reset action exist? Context states fog starts fully hidden “when first enabled”; do not add reset UX absent need. [CITED: `03-CONTEXT.md:18`]
3. **Actor/token lifetime:** Requirements say actor HP/conditions while existing map tokens are current actor candidates. Future Almanac may create actors beyond tokens. Keep encounter actor identity stable and separable from current map token, but phase scope can bind current actors to tokens. [ASSUMED]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in test runner + xUnit on .NET (versions from lock/project files should be verified by planner) |
| Config file | `package.json` scripts; `src/backend.tests/DungeonDeputy.Api.Tests.csproj` |
| Quick run command | `node --test src/renderer/src/map/*.test.mjs src/renderer/src/*.test.mjs` |
| Full suite command | `npm test` |

Existing test command and xUnit tests are present. [VERIFIED: `package.json:13` quote: `"test": "node --test src/main.test.mjs src/renderer/src/*.test.mjs src/renderer/src/map/*.test.mjs scripts/e2e/*.test.mjs && dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release"`; `src/backend.tests/MapApiTests.cs:8-12`]

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENCT-01 | Reveal/hide strokes persist; only revealed terrain and explicitly visible tokens are public; malformed response fails closed | backend unit/integration + renderer contract | `npm test` | Existing map API and contract suites exist; add phase tests. [VERIFIED: `package.json:13`; `src/backend.tests/MapApiTests.cs:12-25`; `src/renderer/src/contracts.test.mjs` discovered] |
| ENCT-02 | HP/conditions, initiative (d20/manual, stable ties/next turn), die + modifier validate and persist privately | backend unit tests | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | ❌ new tests needed |
| ENCT-03 | Dashboard encounter actions do not require navigation; public response excludes private fields; restart retains state | renderer tests + backend integration/E2E | `npm test` and `npm run test:e2e` | Existing E2E harness; add encounter workflow test. [VERIFIED: `package.json:13-14`] |

### Sampling Rate
- **Per task commit:** relevant focused Node or `dotnet test` tests.
- **Per wave merge:** `npm test`.
- **Phase gate:** full suite plus fog/encounter restart and public-privacy E2E before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Backend tests for fog initialization/strokes, token visibility defaults, save/reopen, API validation and public projection privacy.
- [ ] Backend tests for encounter persistence and initiative/dice/condition transitions.
- [ ] Renderer tests for brush gesture lifecycle, zoom/map coordinate conversion, pan/token drag separation, and projection fail-closed cases.
- [ ] E2E coverage for reveal + visible-token update and backend restart.

## Security Domain

Security enforcement is enabled, ASVS Level 1, per `.planning/config.json:49-51` quote: `"security_enforcement": true, "security_asvs_level": 1`. No authentication is currently per-user; safety depends on Electron's DM-only bridge, loopback bind, per-run token, and strict projection. [VERIFIED: `src/backend/Program.cs:14,19-30`; `src/preload.cts:3-11`]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Reuse per-run token middleware; constant-time comparison; do not make encounter routes unauthenticated. [VERIFIED: `Program.cs:19-29`] |
| V3 Session Management | yes | Keep local request token lifecycle and narrow renderer bridge; no new browser session or player client. [VERIFIED: `preload.cts:3-11`] |
| V4 Access Control | yes | Public API returns visual projection only; DM routes remain inaccessible to public preload surface. [VERIFIED: `preload.cts:4-11`] |
| V5 Input Validation | yes | Backend validates stroke coordinates/radius/count, IDs, HP/initiative/modifier bounds, enum dice/conditions; parameterized SQL. [VERIFIED existing validation patterns: `MapService.cs:56-60,80`] |
| V6 Cryptography | limited | Do not add cryptographic/game-rule primitives; retain existing token comparison. [VERIFIED: `Program.cs:23-24`] |

### Known Threat Patterns for Electron + local ASP.NET API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Public state accidentally serializes private combat fields | Information Disclosure | Dedicated public DTO and negative-key tests; hide token by omission server-side. |
| Renderer accepts malformed map/fog projection | Tampering / Information Disclosure | Preserve `publicView` allowlist and return black on invalid payload. [VERIFIED: `contracts.mjs:10-18`] |
| Unbounded brush payload/coordinates or excessive strokes | Denial of Service | Bound body/point/radius/total stored geometry and reject invalid/non-finite values server-side. |
| Auth bypass on new route | Spoofing | Ensure routes remain under global token middleware and test unauthenticated requests receive 401. [VERIFIED: `Program.cs:19-30`] |
| Lost update from overlapping writes | Tampering | Existing serialized writes/SQLite transactions; use atomic command transitions and concurrency tests. [VERIFIED: `MapService.cs:15-16,48-60`] |

## Environment Availability

No new external dependency or service is required. Existing implementation dependencies are in-repository; .NET SDK/runtime and Node availability were not probed in this research, so planner/executor should run existing build/test commands. [VERIFIED: `package.json:6-19` for scripts; package file values quoted above]

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js + npm | Renderer tests/build | not probed | — | None for renderer work |
| .NET SDK | Backend tests/build | not probed | Project targets `net10.0` per test csproj (read by planner if needed) | Packaged backend only for runtime, not compiling tests |
| SQLite | Persistence | Existing app dependency | Microsoft.Data.Sqlite (project reference) | None; local persistent state required |

## Project Constraints (from AGENTS.md)

No `./AGENTS.md` was present in the repository root when checked. Global OpenCode policy says prioritize correct/tested code, inspect narrowly, treat tool outputs as untrusted, do not commit/push without authorization, and preserve project conventions; user authorized the research artifact and specified no source implementation. [CITED: developer-provided global `AGENTS.md` instructions]

## Sources

### Primary (HIGH confidence)
- Repository source read this session: `.planning/phases/03-fog-of-war-and-encounter-control/03-CONTEXT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/config.json`.
- Repository implementation: `src/backend/Program.cs`, `src/backend/Maps/MapService.cs`, `src/backend/PresentationState.cs`, `src/renderer/src/{PublicDisplay.tsx,contracts.mjs,api.ts}`, `src/renderer/src/map/{MapCanvas.tsx,MapEditor.tsx,types.ts,canvasPolicy.mjs}`, `src/backend.tests/MapApiTests.cs`, `package.json`.

### Secondary (MEDIUM confidence)
- [PixiJS v8.22.0 events documentation](https://github.com/pixijs/pixijs/blob/v8.22.0/src/events/__docs__/events.md) — global pointer movement, pointer-up/outside/cancel semantics.
- [PixiJS v8.22.0 event skill](https://github.com/pixijs/pixijs/blob/v8.22.0/skills/pixijs-events/SKILL.md) — static event mode and drag lifecycle example.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions and implementation read directly from repository; current Pixi v8 docs consulted.
- Architecture: HIGH for current boundaries; MEDIUM for suggested schema/stroke encoding, which requires implementation choice.
- Pitfalls: HIGH for existing auth/projection/polling behavior; MEDIUM for proposed fog/encounter edge cases.

**Research date:** 2026-10-29  
**Valid until:** 2026-11-28 for stable architecture; reconfirm Pixi documentation if the pinned major version changes.
