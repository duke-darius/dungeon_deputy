# Phase 2: Playable Digital Battle Map - Research

**Researched:** 2026-10-28  
**Domain:** PixiJS v8 map canvas, React/Electron integration, SQLite persistence, private/public map projection  
**Confidence:** MEDIUM — core design is constrained by phase context and official docs, but macOS package execution and physical display integration remain untested.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Implementation Decisions

### Map editing and publishing
- Reuse the existing Stage 1 player display window and API authority; do not open/recreate another window when editing, showing, or blacking out a map.
- The DM edits a private draft map while the current approved public map remains unchanged. An explicit **Show on table** action publishes the draft map; **Black out** remains immediately available.
- Use PixiJS v8 in a React-owned map canvas. The backend remains authoritative for saved map/token state; PixiJS only renders and collects pointer gestures.
- A map can start from an included original tavern floorplan or a blank grid. The DM can toggle a square grid, pan/zoom, and change the basic grid scale.
- Add a small built-in hero/monster token library sufficient for the tavern demonstration (four heroes, three goblins). The DM can place, drag, rename, recolor, choose from bundled token artwork, and remove tokens.
- Persist token positions when a drag is committed and make an explicit save/resume path discoverable. Do not build collision, pathfinding, line-of-sight, or combat automation.
- Public map output uses a dedicated allowlisted projection with map asset, visible grid/scale settings, and approved tokens only. No dashboard, editor handles, selection state, notes, or private draft data reaches the public renderer.

### Persistence and local operation
- Add a local SQLite database under the OS per-user application data directory, not beside installed/read-only program resources.
- Use `Microsoft.Data.Sqlite` directly for the small Stage 2 schema unless research proves a justified EF Core need; keep schema setup and persistence code small and tested.
- Persist the campaign/session, maps, grid settings, and token definitions/positions needed for save/reload. Seed a helpful tavern demo without overwriting user changes.
- Electron passes a resolved data directory to the backend process. Continue binding only to loopback with the per-run backend token; no LAN access in this phase.
- Test save/reload after backend/application restart and verify packaged SQLite native assets load for supported RIDs; test at least the current Windows x64 host and report macOS unverified if unavailable.

### UI direction (Anthropic frontend-design skill)
- Continue the Stage 1 command-desk identity and existing ink/slate/chalk/oxidized-teal/brass palette. The memorable element is the large, tactile map canvas, not decorative dashboard cards.
- Layout: narrow scene/campaign rail at left; broad map editor in the center; compact right inspector for selected token/grid/scale; a restrained token tray below the canvas. Keep **Private draft** and **Showing on table** states plainly visible.
- Use the map canvas as the dominant visual area, align labels left, and keep live-use actions large and close to the map. Use sentence-case controls, keyboard focus, accessible labels, reduced-motion behavior, and responsive resizing.
- Keep the public renderer edge-to-edge map art/grid/tokens with no controls or editor chrome. The player display remains the same fullscreen window when map state changes.
- Follow the loaded frontend-design skill's two-pass process: propose and critique a concise Stage 2 design system before implementing; avoid generic card grids and do not use gradients as decoration.

### Agent discretion
- Choose the smallest reliable PixiJS scene graph and pointer pan/zoom implementation; add no viewport helper unless it is justified and separately audited.
- Choose a simple relational schema/API shape for campaign/session, maps, and tokens; use parameterized SQL and transactions.
- Choose whether moves are sent on drag end or via small throttled updates, while ensuring failed saves are clearly surfaced and public state stays DM-approved.
- Choose the simplest imported map-image workflow needed for the demo, provided bundled maps work offline and rights/attribution are documented.
- Choose test boundaries for map transforms, grid snapping/scale calculations, persistence round trips, and public/private projection.

### Deferred Ideas (OUT OF SCOPE)
- Fog of war, manual reveal/hide, hidden/private tokens, HP, initiative, conditions, dice, and turn advancement (Stage 3).
- Audio cues, soundboards, and macropad mappings (Stage 4).
- SRD compendium, character sheets, SignalR/player phones, and immediate push scene/blackout updates (Stages 5–6; CHAR-04 specifically belongs to the SignalR stage).
- AI map generation, automatic physical-miniature recognition, pathfinding, line-of-sight, collision, and 3D rendering.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAP-01 | The DM can create/edit a map scene with an optional square grid and basic zoom, pan, and scale controls. | Pixi scene graph, normalized camera transform, grid geometry, pointer input, scale model. |
| MAP-02 | The DM can add, move, rename, recolor, and remove digital character and monster tokens on the map. | Scene/token separation, normalized coordinates, backend mutations, simple built-in token catalog. |
| MAP-03 | The DM can save a campaign/session and restore maps and token positions after restarting the app. | Per-user SQLite store, transactions, seed idempotence, restart/packaging verification. |
</phase_requirements>

## Summary

Implement one end-to-end tavern slice over the existing Electron + React DM renderer, local ASP.NET Core backend, and persistent player display: create/load a starter map and seven tokens, manipulate them in Pixi, save authoritative draft state to SQLite, publish an explicit allowlisted snapshot into the existing public presentation contract, then restart and restore the saved campaign. The backend remains authoritative; PixiJS is a renderer and gesture source only. [CITED: https://pixijs.com/8.x/guides/components/application] [VERIFIED: src/backend/Program.cs:9-10]

Initialize Pixi v8 with `new Application()`, await `app.init({ resizeTo: host, ... })`, then append `app.canvas`; in React effects, own initialization and teardown, destroy the application on cleanup, and guard asynchronous initialization against unmount/StrictMode races. Use a small Container hierarchy (world/map/grid/tokens, plus editor-only selection overlay) and apply a camera transform to the world. For pan, use stage pointer events and pointer capture/up-outside handling; for token drag, convert global pointer coordinates into map-local coordinates and commit one backend mutation on release. Implement wheel zoom around the cursor and clamp scale. [CITED: https://pixijs.com/8.x/guides/components/application] [CITED: https://pixijs.com/8.x/guides/components/events]

Use `Microsoft.Data.Sqlite` directly, keeping migration/schema initialization and persistence in backend services. Transactions should atomically save a scene’s map/grid metadata and token changes. Keep draft and approved public map snapshots distinct; never serialize a DM aggregate to the public route. The stage explicitly does **not** introduce SignalR: Phase 6 owns immediate push updates for `CHAR-04`; Phase 2 should use current request/response mechanisms and update the existing player renderer in place without rebuilding its Electron window. [CITED: https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/] [VERIFIED: .planning/REQUIREMENTS.md:44]

**Primary recommendation:** Keep scope to one backend-authoritative, transactional map/session slice with Pixi v8 scene rendering, isolated draft/public DTOs, parameterized SQLite, and no extra rendering or realtime packages.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Map, grid, token render and pointer gestures | Browser / Client (React + PixiJS) | API / Backend | Canvas owns visual scene and transient gesture; backend validates/persists domain changes. |
| Campaign/session/map/token state | API / Backend | Database / Storage | Existing backend authority extends naturally to durable state; SQLite persists it. |
| Draft editing and save/resume UX | Browser / Client | API / Backend | React coordinates editor and API but does not own truth. |
| Approved public map presentation | API / Backend | Browser / Client (existing public renderer) | Backend creates allowlisted approved projection; existing player window renders only that projection. |
| SQLite file location and native runtime packaging | Electron main / packaging | API / Backend | Main resolves and passes per-user data location; backend opens DB; per-RID publish carries native provider assets. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pixi.js` | 8.22.0 requested by phase; npm registry reports this version exists; publish date 2026-10-01, age 27 days at research date | 2D GPU canvas and interaction scene | Locked by project direction and context; v8 async Application lifecycle and federated pointer events fit interactive map work. Package legitimacy verdict is SUS, so install only after human checkpoint. |
| .NET / ASP.NET Core | Existing net10.0 project | Domain/API and persistence authority | Matches existing backend and phase constraints. [VERIFIED: src/backend/DungeonDeputy.Api.csproj:1-6] |
| `Microsoft.Data.Sqlite` | 10.0.x aligned with net10.0; resolve patch before install | Direct ADO.NET SQLite access | Context decision; lightweight SQLite provider supports SQL commands, parameters, and transactions. [CITED: https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/] |
| SQLite | Provider-bundled native engine | Local offline persistence | Per-user file survives application restarts without service installation. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing React / TypeScript | Existing locked project versions | Canvas host/editor controls and typed API boundary | Keep Pixi Application lifecycle inside a focused canvas component; do not replace current React architecture. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `Microsoft.Data.Sqlite` | EF Core SQLite | EF brings model/migration abstraction; unnecessary for this deliberately small initial schema unless schema complexity clearly grows. |
| Built-in Pixi transforms/events | `pixi-viewport`, `@pixi/react` | Extra dependency and abstraction not justified for one map and basic pan/zoom; do not add absent a demonstrated gap. |
| Direct Pixi scene construction in React component | Imperative Pixi canvas independent of React | More framework churn and weaker ownership/cleanup integration; React effect/ref can own a small imperative renderer. |

**Installation:** `npm install pixi.js@8.22.0` (blocked on human review due `[SUS]`; do not install in research). Backend NuGet package version must be chosen and audited during planning before install.

**Version verification:** `npm view pixi.js@8.22.0` confirmed registry version 8.22.0, registry timestamp 2026-10-01, repo `github.com/pixijs/pixijs`, packed unpacked size 76,274,721 bytes. Request required exact version; resolve a currently compatible `Microsoft.Data.Sqlite` 10.0.x at implementation time.

## Package Legitimacy Audit

GSD package-legitimacy seam checked `pixi.js` for npm on 2026-10-28: verdict `[SUS]`, signal `publishedAt=2026-10-01T21:58:04.868Z`, `weeklyDownloads=1,155,137`, repository `git+https://github.com/pixijs/pixijs.git`, `deprecated=false`, `postinstall=null`; reason: `too-new`. Registry check `npm view pixi.js@8.22.0` confirmed exact version and repository. No declared postinstall field was returned. This is not an approval: require a blocking human verification checkpoint before adding/installing it. No npm package installed during research.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `pixi.js@8.22.0` | npm | 27 days since 2026-10-01 | 1,155,137/week (GSD legitimacy signal) | github.com/pixijs/pixijs | [SUS] | Flagged — planner must insert `checkpoint:human-verify` before install; no declared postinstall. |
| `Microsoft.Data.Sqlite` | NuGet | Not audited this research pass | Not audited | Official Microsoft docs identify provider | Not assessed | Resolve exact version and audit package source before adding package. |

**Packages removed due to [SLOP] verdict:** none.  
**Packages flagged as suspicious [SUS]:** `pixi.js@8.22.0` — checkpoint required.  
**Packages with assumed identity/authority:** none recommended beyond above; no viewport/React-Pixi package recommendation.

## Architecture Patterns

### System Architecture Diagram

```text
DM input (pointer / controls)
          |
          v
React MapEditor -> Pixi Canvas [camera, map art, grid, tokens, selection overlay]
          |                         |
          | API commands            | gestures only; local coordinate transforms
          v                         v
ASP.NET Core authoritative map/session service <----> SQLite in per-user data directory
          |
          +-- save/load draft
          +-- explicit approve/show -> allowlisted PublicMap snapshot
          +-- blackout -------------> existing public presentation state
                                      |
                                      v
                        Existing separate player renderer/window
```

### Recommended Project Structure

```text
src/renderer/src/
├── map/MapEditor.tsx       # React lifecycle/host, controls and editing state
├── map/MapCanvas.ts        # Pixi Application and scene graph lifecycle
├── map/mapTransforms.ts    # pure world/screen, zoom and grid math
├── map/mapTypes.ts         # renderer-facing draft/public contracts
└── PublicDisplay.tsx       # existing renderer extended with safe map projection
src/backend/
├── Maps/                   # API/domain validation, persistence, public projection
└── Data/                   # SQLite initialization/schema and repositories
```

### Pattern 1: React owns the Pixi lifecycle
**What:** Create `Application` asynchronously in a React effect after host DOM exists; append canvas; initialize scene graph; on cleanup remove listeners and destroy renderer/resources. Maintain an `alive`/generation check after `await app.init` so cleanup during initialization cannot append a stale canvas. Keep Pixi object graph out of React state; React state holds serializable editing/domain data. [CITED: https://pixijs.com/8.x/guides/components/application]
**When to use:** Single interactive map canvas embedded in existing dashboard.
**Example:**
```tsx
useEffect(() => {
  const host = hostRef.current;
  if (!host) return;
  let disposed = false;
  let app: Application | undefined;
  void (async () => {
    const next = new Application();
    await next.init({ resizeTo: host, background: 0x171a1b });
    if (disposed) { next.destroy(true); return; }
    app = next;
    host.appendChild(next.canvas);
    // Build world Container with map/grid/tokens; register pointer listeners.
  })();
  return () => { disposed = true; app?.destroy(true, { children: true }); };
}, []);
```
Code follows current PixiJS v8 docs; verify exact `destroy` overload against installed typings during implementation. [CITED: https://pixijs.com/8.x/guides/components/application]

### Pattern 2: Backend records canonical map coordinates; canvas maps to pixels
Persist token position in map-space independent of canvas size/camera zoom. Use a single transform function/inverse for screen-to-world interactions; optionally store grid cell coordinates only if snapping is required by UX. On pointerdown, record pointer and object origin; while moving update Pixi preview; on `pointerup` or `pointerupoutside`, convert to map coordinates and submit one save/move command. Stage context specifically defers collision/grid snapping; avoid adding rules that constrain free positions.

### Pattern 3: Approval is snapshot publication, not rendering shared editor state
Keep draft aggregate and public projection separate. The show operation snapshots current permitted map asset, grid/scale and approved visible tokens into public state. Blackout remains a separate immediate command. Public endpoint returns only the allowlist; editor selection, drag handles, names/notes not intended for players, and draft-specific metadata are excluded by construction. Existing public renderer currently consumes `publicView(...)` and fails closed to black; extend a separate discriminated public DTO and validate it before render. [VERIFIED: src/renderer/src/contracts.mjs:7-12] [VERIFIED: src/renderer/src/PublicDisplay.tsx:9-18]

### Pattern 4: SQLite schema and writes
Use relational rows for campaign/session, map, token, with foreign keys and bounded values. The precise schema is a planner decision; suggested minimal relationship: campaign -> session -> map -> tokens, plus persisted grid visibility/size/units and map asset key. Keep image bytes out of relational rows if bundled assets suffice; persist a validated relative asset key. Use `Microsoft.Data.Sqlite` parameters for all user-provided values and a transaction for multi-row save/seed. Make demo seeding idempotent (insert only when no campaign/demo record exists; never overwrite modified state). SQLite has single-writer characteristics: keep writes short, commit on drag end, and serialize overlapping saves or use concurrency/version checks to prevent an older response overwriting a newer edit.

### Anti-Patterns to Avoid
- **Initialize Pixi during render:** React rerenders can create duplicate canvases/renderers; allocate only in effect and destroy on teardown.
- **Put token movement only in React/Pixi local state:** restart loses edits; persist on drag commit and surface API failure without claiming saved state.
- **Publish the full editor aggregate:** hidden/private data or selection UI can leak; project through explicit backend DTO allowlist.
- **Save every pointermove synchronously:** generates excess API/SQLite writes and visible lag; render movement locally and persist on drag completion.
- **Use app installation/resources folder for SQLite:** may be read-only and updates can replace it; keep DB in the per-user application data directory passed by Electron.
- **Assume generic self-contained publish packages SQLite correctly for all RIDs:** validate actual published native assets and launch smoke test each supported RID.
- **Add SignalR or implement later-stage hide/reveal now:** out of scope; request/response is enough for Stage 2 and retain explicit publish approval.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 2D renderer, asset loading, scene graph, hit-testing | Custom canvas/WebGL engine | PixiJS v8 | Rendering and interaction lifecycle complexity; selected project technology. |
| SQLite native access | Custom interop or raw P/Invoke | `Microsoft.Data.Sqlite` | Provider handles ADO.NET integration and platform native dependency flow. |
| Renderer/public privacy boundary | UI-only conditional hide or shared store | Dedicated backend public projection | Explicit allowlisting is auditable and testable; UI hiding does not prevent data delivery. |
| Map transforms and grid math | Duplicate formulas across UI/event handlers | Small pure transform/grid functions | Inverse coordinate math and zoom anchoring must remain consistent and unit-testable. |

**Key insight:** Keep custom code to the tiny domain rules and projection boundary. Use the selected graphics and database providers; do not add a viewport or ORM layer for the seven-token vertical slice.

## Common Pitfalls

### Pixi v8 async startup/unmount race
**What goes wrong:** React StrictMode or route unmount while `app.init()` is pending creates an orphan canvas/renderer, duplicate listeners, or GPU memory leak.  
**Why it happens:** v8 initialization is asynchronous while React effect cleanup is synchronous.  
**How to avoid:** disposed flag/generation token, append only after successful init, teardown listeners and `Application`; exercise mount-unmount-remount in tests/manual dev.  
**Warning signs:** duplicate canvases, callbacks after navigation, graphics memory growth.

### Drag lost outside canvas / coordinate drift
**What goes wrong:** pointer released beyond canvas leaves token stuck or position is wrong after zoom/pan.  
**How it happens:** handling only local `pointermove` or mixing screen coordinates with world/map coordinates.  
**How to avoid:** use Pixi federated `globalpointermove`, `pointerup`, `pointerupoutside`; preserve pointer IDs if needed; transform through parent/world local coordinates consistently. Pixi v8 uses `eventMode='static'` on interactive objects. [CITED: https://pixijs.com/8.x/guides/components/events]  
**Warning signs:** stuck drag, offset proportional to zoom, inability to release outside canvas.

### Wheel zoom loses cursor anchor / reaches unusable scale
**What goes wrong:** zoom drifts away from pointer or map becomes microscopic/huge.  
**How to avoid:** transform pointer into world coordinates before and after scale; adjust world position so anchor remains stable; clamp scale; test both bounds and resize.

### Public approval leaks draft changes
**What goes wrong:** players observe movement/renames before DM approves.  
**How to avoid:** persisted draft and approved public snapshot must be independent; public refresh reads public snapshot only; test that edits leave public DTO byte-for-byte unchanged until show. Blackout must be available regardless of save/publish errors.

### SQLite missing native library on packaged platform
**What goes wrong:** API starts in dev but database open fails in self-contained package, especially non-host RID.  
**How to avoid:** test the publish output, not only `dotnet test`; preserve provider native files in package rules; verify win-x64 host and macOS RIDs on real target systems. macOS execution is unavailable here and remains unverified. [VERIFIED: scripts/package-backend.mjs:4-12]

### Asset traversal / untrusted image inputs
**What goes wrong:** user-editable map path can escape bundled/user asset root, load unintended local content, or public renderer receives unsafe URL.  
**How to avoid:** Phase 2 needs bundled original map and bundled token assets only unless importer is essential; treat asset identifiers as validated keys, reject arbitrary paths/schemes, cap dimensions/size if an import path is added, and serve only approved asset IDs publicly. Document attribution/rights for all bundled artwork.

## Code Examples

### Pixi pointer interaction model (v8)
```ts
stage.eventMode = 'static';
stage.hitArea = app.screen;
stage.on('pointerdown', onPointerDown);
stage.on('globalpointermove', onPointerMove);
stage.on('pointerup', onPointerUp);
stage.on('pointerupoutside', onPointerUp);
```
For draggable token sprites, set `eventMode = 'static'`; drag-preview locally, then persist one normalized map-space position on release. [CITED: https://pixijs.com/8.x/guides/components/events]

### Parameterized ADO.NET command / atomic persistence
```csharp
await using var transaction = await connection.BeginTransactionAsync();
await using var command = connection.CreateCommand();
command.Transaction = (SqliteTransaction)transaction;
command.CommandText = "UPDATE Tokens SET X = $x, Y = $y WHERE Id = $id AND MapId = $mapId";
command.Parameters.AddWithValue("$x", position.X);
command.Parameters.AddWithValue("$y", position.Y);
command.Parameters.AddWithValue("$id", tokenId);
command.Parameters.AddWithValue("$mapId", mapId);
await command.ExecuteNonQueryAsync();
await transaction.CommitAsync();
```
Use provider parameters and transactions, validate identifiers/coordinate bounds in domain code, and consider transaction API types against the selected provider version. [CITED: https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PixiJS v7 synchronous Application setup | PixiJS v8 `new Application()` then `await app.init(options)`; attach `app.canvas` | PixiJS v8 | Component lifecycle must account for asynchronous init and cancellation. [CITED: https://pixijs.com/8.x/guides/components/application] |
| Legacy mouse/touch interaction plugins | PixiJS federated events, `eventMode` and pointer events | PixiJS v7+ / v8 docs | Use `pointerdown`/global move/up events and static mode rather than old interaction plugin patterns. [CITED: https://pixijs.com/8.x/guides/components/events] |
| Persist whole session object from renderer | Backend authority + purpose-built approved projection | Project Stage 1 architecture | Extends existing public allowlist to map data without exposing editing domain objects. [VERIFIED: src/renderer/src/contracts.mjs:7-12] |

**Deprecated/outdated:** Do not follow PixiJS v7 `new Application(options)` examples for v8. Avoid a third-party viewport helper unless acceptance tests reveal the minimal camera implementation is insufficient.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PixiJS 8.22.0 is suitable for current project runtime/build and license/assets are acceptable after review. [ASSUMED] | Standard Stack | Human checkpoint needed; package may be too-new despite registry and official docs. |
| A2 | Map/token positions can use floating map-space coordinates and grid controls are display scale rather than mandatory snap constraints. [ASSUMED] | Architecture Patterns | UX acceptance could require cell snapping or a specific measurement model. |
| A3 | Bundled original tavern and token art can be supplied with documented rights/attribution. [ASSUMED] | Common Pitfalls | Asset rights or production effort may affect acceptance. |
| A4 | Save on drag end is responsive enough for the live use case; app reports failed save and offers retry. [ASSUMED] | Architecture Patterns | May need throttled writes if user expects multi-client synchronization (not in scope). |
| A5 | Native SQLite package loading works with existing self-contained RID pipeline after provider package is added. [ASSUMED] | Common Pitfalls | Packaged app could fail on a target architecture; smoke test required. |

## Open Questions

1. **What does basic grid scale mean for the UI?** Context permits scale but does not specify whether it is pixel/grid-cell size or a tabletop distance unit. Recommend implement a clearly labeled grid-size control with simple unit/scale display, make the choice visible in planning/UI critique, and avoid promising physical measurement precision.
2. **How much map image import is needed?** A bundled tavern plus blank grid covers current visible acceptance. Recommend defer arbitrary file import unless the requirement is explicitly interpreted to require it; this avoids file validation/path and packaging scope.
3. **Exact campaign/session lifecycle semantics?** Acceptance says save/resume; no multi-session or version-history requirements. Use one discoverable demo campaign/session with safe idempotent initialization and a basic selection/save path; do not build archive/export/cloud support.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | UI/build and npm registry verification | ✓ | 24.11.1 | — |
| npm | UI package/version validation | ✓ | 11.6.2 | — |
| .NET SDK | backend and Windows publish/test | ✓ | 10.0.114 | — |
| macOS host | osx-x64/osx-arm64 native package execution | ✗ | — | Build artifacts may be produced, but macOS load/runtime behavior remains unverified until tested on macOS. |
| Physical external/HDMI display | public map/window acceptance | Not established by environment probe | — | Windowed preview/manual simulation; do not claim physical display verification. |

**Missing dependencies with no fallback:** None for code/test planning.  
**Missing dependencies with fallback:** macOS hosts and physical display; run available Windows checks and explicitly report those acceptance items unverified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Existing xUnit backend test project; Node built-in test suite in Stage 1 |
| Config file | `src/backend.tests/DungeonDeputy.Api.Tests.csproj`; `package.json` scripts (review at planning) |
| Quick run command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj` |
| Full suite command | `npm test` plus `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj` (confirm exact npm script before plans lock command) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | Grid on/off and scale; pan/zoom transform and zoom-anchor math | Unit + renderer interaction | Existing project test command; add pure `mapTransforms` tests | ❌ Wave 0 |
| MAP-02 | Create/move/rename/recolor/remove tokens; public projection excludes draft/editor data | Backend integration + contract unit | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj` plus renderer contract tests | ❌ Wave 0 |
| MAP-03 | Campaign/map/grid/token save and restore after DB reopen/restart; seed preserves modifications | Backend integration / persistence | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj` | ❌ Wave 0 |
| MAP-03 | Native SQLite opens in packaged win-x64 app; publish output includes provider assets | Packaging smoke | `npm run package:backend -- win-x64` (verify actual script name) then launch artifact | ❌ Wave 0/manual |

### Sampling Rate
- **Per task commit:** focused pure transform tests or backend test filter for touched behavior.
- **Per wave merge:** `npm test` and `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj`.
- **Phase gate:** full suites green, Windows packaged restart round-trip, public display approval/blackout acceptance before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Pure map coordinate/scale/grid transform test module and test-runner configuration if absent.
- [ ] Backend SQLite repository/schema, transaction and restart integration tests.
- [ ] Public map projection tests asserting allowlist and unchanged approved state during draft edits.
- [ ] Pixi canvas lifecycle/interaction test boundary; separate pure math and pointer mapping from GPU canvas to keep automated tests deterministic.
- [ ] Packaged win-x64 native SQLite smoke checklist; macOS tests remain platform-blocked.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (local API capability token) | Preserve per-run random backend token and constant-time comparison; all new API routes stay behind existing middleware. [VERIFIED: src/backend/Program.cs:13-24] |
| V3 Session Management | yes, limited local app process | Per-run token, process lifecycle and fail-closed public output; do not add LAN clients or long-lived player sessions here. |
| V4 Access Control | yes | Restrict map editing commands to DM IPC route/sender and publish only separate approved DTO. Validate window role and sender for any new Electron bridge method. [VERIFIED: src/main.ts:59-61] |
| V5 Input Validation | yes | Validate IDs, strings, colors, finite/bounded coordinates, grid dimensions, and asset IDs; parameterize SQL; never construct file paths from untrusted strings. |
| V6 Cryptography | limited | No custom crypto; retain existing generated backend token and constant-time comparison. No secrets in campaign DB or public map projection. |

### Known Threat Patterns for Electron + React + ASP.NET Core + PixiJS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer script/IPC invokes arbitrary backend route | Elevation of privilege | Keep narrow allowed commands, validate sender/role/path and API DTOs; do not expose raw fetch or filesystem. |
| Public DTO accidentally contains notes/draft or editor metadata | Information disclosure | Dedicated allowlisted projection type and regression tests for absence of private fields. |
| User-controlled map asset path traverses local filesystem | Information disclosure / Tampering | Use catalog asset IDs or constrain canonicalized paths to approved root; do not accept arbitrary schemes. |
| Unbounded map/token input causes expensive render/database work | Denial of service | Bound token counts/string lengths/dimensions; clamp map-space and zoom inputs; avoid per-move persistence. |
| Local network exposure introduced accidentally | Elevation / disclosure | Keep Kestrel loopback only; no SignalR, LAN bind, or player phone endpoints in Phase 2. [VERIFIED: src/backend/Program.cs:9] |

## Project Constraints (from AGENTS.md)

No project-level `AGENTS.md` was found in the working directory or source/project tree. Global OpenCode policy: prioritize correctness and focused verification; do not install GSD, commit, or push without authorization; preserve established conventions; report actual verification and platform limits. User explicitly authorized committing this research artifact only.

## Sources

### Primary (HIGH confidence)
- PixiJS v8 Application guide — async init, canvas attachment, resize and teardown: https://pixijs.com/8.x/guides/components/application (also confirmed by authenticated Context7 results supplied in task context).
- PixiJS v8 events guide — `eventMode='static'`, pointer and global pointer events: https://pixijs.com/8.x/guides/components/events (also confirmed by authenticated Context7 results supplied in task context).
- Microsoft.Data.Sqlite official overview — lightweight provider, parameterized commands/transactions: https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/ (also confirmed by authenticated Context7 results supplied in task context).
- GSD package-legitimacy check output for `pixi.js`, 2026-10-28; npm registry `npm view pixi.js@8.22.0`.
- In-repo stage decisions and source: `.planning/phases/02-playable-digital-battle-map/02-CONTEXT.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/research/STACK.md`, `tabletop_dm_gsd_brief.md`, and cited source files.

### Secondary (MEDIUM confidence)
- Electron security guidance: https://www.electronjs.org/docs/latest/tutorial/security
- SQLite transaction guidance: https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/transactions

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — Pixi official v8 guidance and exact npm version verified; package legitimacy is SUS, and NuGet exact package version not resolved here.
- Architecture: HIGH — follows explicit Phase 2 decisions and existing backend/public-display split, grounded in opened source files.
- Pitfalls: MEDIUM — lifecycle and event guidance is official; native packaging and real external-monitor results require hands-on platform checks.

**Research date:** 2026-10-28  
**Valid until:** 2026-11-27 for architectural guidance; recheck current package version/legitimacy at install time.
