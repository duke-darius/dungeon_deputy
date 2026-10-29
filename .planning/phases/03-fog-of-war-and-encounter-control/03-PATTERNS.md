# Phase 3: Fog of War and Encounter Control - Pattern Map

**Mapped:** 2026-10-29  
**Files analyzed:** 12 planned files/areas (including tests)  
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/renderer/src/map/MapCanvas.tsx` | component | event-driven, transform | `src/renderer/src/map/MapCanvas.tsx`, `canvasPolicy.mjs` | exact |
| `src/renderer/src/map/canvasPolicy.mjs` | utility | event-driven | same file | exact |
| `src/renderer/src/map/types.ts` | model | transform | `src/renderer/src/map/types.ts` | exact |
| `src/renderer/src/map/MapEditor.tsx` | component | request-response | same file | exact |
| `src/renderer/src/styles.css` | config/style | transform | same file | exact |
| `src/renderer/src/PublicDisplay.tsx` | component | request-response | same file | exact |
| `src/renderer/src/contracts.mjs` | utility / public DTO | transform | same file | exact |
| `src/backend/Maps/MapService.cs` | service / persistence model | CRUD, file-I/O | same file | exact |
| `src/backend/Encounters/EncounterService.cs` (proposed) | service / model | CRUD, request-response | `src/backend/Maps/MapService.cs` | role-match |
| `src/backend/Program.cs` | route / controller | request-response | same file | exact |
| `src/backend.tests/*` (fog and encounter coverage) | test | CRUD, request-response | `src/backend.tests/MapApiTests.cs` | exact |
| `src/renderer/src/map/*test.mjs`, `contracts.test.mjs`, E2E | test | event-driven, request-response | `MapCanvas.lifecycle.test.mjs`, `contracts.test.mjs` | exact / none for E2E |

## Pattern Assignments

### Renderer fog brush — `MapCanvas.tsx`, `canvasPolicy.mjs`, `types.ts`

**Analogs:** `src/renderer/src/map/MapCanvas.tsx` and `src/renderer/src/map/canvasPolicy.mjs` (tracked).

**Lifecycle and mutable latest-props pattern** (`MapCanvas.tsx:12-20,31-46`):
```tsx
const drawRef = useRef<() => Promise<void>>(async () => {});
const latest = useRef({ image, gridVisible, scale, tokens, onMove });
latest.current = { image, gridVisible, scale, tokens, onMove };
useEffect(() => {
  let cancelled = false;
  app = new Application();
  const lifecycle = attachCanvas(app, host.current!, async initialized => {
    // Create stage/world, install renderer and input lifecycle once.
  });
  return () => { cancelled = true; detachPointers?.(); lifecycleRef?.dispose(); };
}, []);
useEffect(() => { void drawRef.current(); }, [image, gridVisible, scale, tokens]);
```

**Pointer lifecycle** (`canvasPolicy.mjs:31-43`):
```js
const end = event => { finishDrag(event); panEnd(); };
stage.on('pointerup', end);
stage.on('pointerupoutside', end);
stage.on('globalpointermove', move);
stage.on('pointerdown', panStart);
return () => { stage.off('pointerup', end); /* remove matching handlers */ };
```
Adapt as a distinct brush mode: use `screenToMap` (`MapCanvas.tsx:34-37`) for map-space stamp centers/radius, avoid token drag/pan while painting, finalize on pointer-up/outside, and detach/reset on mode change or cleanup. Keep persisted map data contracts in `types.ts:1-3`; extend explicitly rather than storing fog only in component state.

### DM workspace — `MapEditor.tsx`, `styles.css`

**Analog:** `src/renderer/src/map/MapEditor.tsx` (tracked).

The established API/state/error pattern (`MapEditor.tsx:32-40,93-111`) loads via `command`, updates state only after successful requests, catches errors into `notify`, and uses `applySavedMap` to merge authoritative results with current draft-only editor fields (`89-91`). Add fog and encounter controls in the current toolbar/inspector rather than creating a route/window. Follow token command convention (`104-111`) for visibility updates and avoid optimistic public success.

**Toolbar/control styling:** `src/renderer/src/styles.css:81,98-108,117-129,152-154` establishes toolbar flex/wrap, labeled range controls, accent-selected primary action, inspector borders, and tablet/mobile stacking. Reuse these selectors and breakpoints for brush and compact encounter controls; follow UI-SPEC labels, focus, target size, and DM-only markers.

### Backend map persistence and API — `MapService.cs`, `Program.cs`

**Analogs:** `src/backend/Maps/MapService.cs` and `src/backend/Program.cs` (tracked).

**Persistence/validation** (`MapService.cs:13-23,48-60`):
```csharp
private readonly SemaphoreSlim _writeGate = new(1, 1);
// DB path is per-user data directory; SQLite initializes in constructor.
public bool Save(MapDocument map)
{
    _writeGate.Wait();
    try { return SaveCore(map); }
    finally { _writeGate.Release(); }
}
// SaveCore validates bounds, opens SQLite transaction, serializes JSON, commits.
```
Token transitions use lock + read/modify/validate/save (`61-84`). Add authoritative validated map/fog/visibility changes through this serialized persistence pattern; maintain migration defaults for old JSON. Encounter values should remain separate/private rather than entering public map DTOs.

**Route/auth pattern** (`Program.cs:14-30,44-56`):
```csharp
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));
app.Use(async (context, next) => {
    // Verify X-Dungeon-Token with FixedTimeEquals; reject with 401.
    await next();
});
app.MapGet("/api/map", (MapService maps) => Results.Ok(maps.Get()));
app.MapPut("/api/map/draft", (MapDocument map, MapService maps) =>
    maps.Save(map) ? Results.NoContent() : Results.BadRequest());
```
Register all new DM endpoints beneath the existing global auth middleware and before `app.Run`; use typed command records and consistent 400/404 results.

### Private encounter domain — proposed `EncounterService.cs`

**Analog:** `src/backend/Maps/MapService.cs` (tracked; role-match, same SQLite authority). No encounter domain service currently exists.

Copy the constructor's per-user SQLite location/initialization (`MapService.cs:17-39`), semaphore-guarded writes and transaction-backed persistence (`48-60`), and validate-before-save shape. Keep actor HP, conditions, initiative/tie order, turn, and dice records in private encounter persistence. Route actions through `Program.cs:44-54` style typed handlers. `src/backend/PresentationState.cs:17-23` is a useful state-transition analogy, but not a persistence substitute.

### Public projection and rendering — `PublicDisplay.tsx`, `contracts.mjs`

**Analogs:** `src/renderer/src/PublicDisplay.tsx`, `src/renderer/src/contracts.mjs`, and `src/backend/Maps/MapService.cs`.

**Fail-closed polling** (`PublicDisplay.tsx:13-22`):
```tsx
const refresh = async () => {
  try { const value = publicView(await getPresentation()); if (alive) setPresentation(value); }
  catch { if (alive) setPresentation(black); }
};
void refresh();
const timer = window.setInterval(() => void refresh(), 1000);
return () => { alive = false; window.clearInterval(timer); };
```

**Strict allowlist** (`contracts.mjs:8-18`):
```js
if (value?.mode === 'black') return black;
if (value?.mode === 'map' && /* validate bounded visual fields */) {
  return { mode:'map', id:value.id, image:value.image, gridVisible:value.gridVisible,
    scale:value.scale, tokens:value.tokens.map(({id,name,kind,color,x,y,artwork})=>
      ({id,name,kind,color,x,y,artwork})) };
}
return black;
```
Backend `MapService.cs:117` constructs the public DTO explicitly from approved visual fields. Extend both sides with a minimal revealed-terrain visual representation; filter hidden tokens server-side and never include visibility flags or encounter values. Cold start should retain the explicit black presentation until “Show encounter” (UI-SPEC); successful committed fog/token visual operations then update active presentation for existing polling.

### Tests — backend, renderer, E2E

**Backend analog:** `src/backend.tests/MapApiTests.cs` (tracked). Temporary database setup and reopen durability are shown at `10-23`; test validation and partial transitions at `47-63`; concurrent updates at `65-80`. Add persistence/reopen, bounds/rejection, visibility default, private field exclusion, and encounter transition assertions. `PresentationStateTests.cs:20-30,42-72` shows projection serialization assertions and authenticated HTTP behavior; `81-99` verifies unauthorized and camelCase API contract.

**Renderer analogs:** `src/renderer/src/map/MapCanvas.lifecycle.test.mjs:26-49` mocks Pixi event registration/cleanup and tests coordinate roundtrip; extend for paint begin/move/end/cancel, mode separation and zoom-independent brush coordinates. `src/renderer/src/contracts.test.mjs:11-32` verifies forbidden data omission, malformed payload blackout, and public allowlisting; extend with hidden token/fog/private combat cases.

**E2E:** No tracked E2E source analog is present; `scripts/e2e/` files currently on disk are untracked and are intentionally not cited. Add the requested workflow coverage using tracked backend and renderer test conventions above, or rely on the project's approved E2E harness once tracked. No existing encounter E2E scenario found.

## Shared Patterns

### Auth and authority
**Source:** `src/backend/Program.cs:19-30`; **apply to:** every new DM backend endpoint. Keep the existing loopback bind and token middleware; public reads still use the sanitized presentation only.

### Persist-before-publish
**Sources:** `src/backend/Maps/MapService.cs:48-60,108-117`, `src/backend/Program.cs:54`, `src/renderer/src/map/MapEditor.tsx:104-110`. Persist validated completed actions first, then derive/update public visual projection; on error report failure and preserve prior visible state.

### Public data boundary
**Sources:** `src/backend/Maps/MapService.cs:11,117`, `src/renderer/src/contracts.mjs:8-18`, `src/renderer/src/PublicDisplay.tsx:15-21`. Explicitly construct public fields, omit hidden tokens and private values entirely, reject malformed responses to black.

### UI feedback
**Source:** `src/renderer/src/map/MapEditor.tsx:22-40,93-110`; **apply to:** fog and encounter actions. Use `notify`/`role=status` patterns for failed and successful authoritative requests; do not announce an uncommitted action as successful.

## No Analog Found

No existing encounter service/domain model or tracked encounter E2E workflow exists. Use the SQLite/auth/test patterns above; do not imply an existing encounter implementation.

## Metadata

**Analog search scope:** `src/renderer/src/map`, `src/renderer/src`, `src/backend`, `src/backend.tests`. All named existing source analogs verified with `git ls-files`; no ignored mirror paths used.  
**Pattern extraction date:** 2026-10-29
