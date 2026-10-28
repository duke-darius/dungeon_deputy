# Architecture Patterns

**Domain:** Local-first tabletop DM desktop application (Electron + ASP.NET Core)
**Researched:** 2026-10-28
**Confidence:** HIGH for architecture direction; MEDIUM for implementation details requiring physical platform testing.

## Recommended Architecture

Use Electron's main process as the desktop coordinator, two deliberately separate React renderer windows for private control and public presentation, and a packaged, self-contained ASP.NET Core process as the owner of session state. Keep Stage 1's application protocol small: HTTP on loopback for scene catalogue, current public scene, preview and blackout commands. Electron alone owns native window/display actions. Do not make the browser renderer inspect displays or let the backend control windows.

```text
DM React renderer ── narrow preload API / IPC ──┐
                                                 │
Public React renderer ── public-only HTTP/DTO ───┼── Electron main
                                                 │      ├─ enumerate displays, position windows
                                                 │      ├─ launch/monitor/stop packaged backend
                                                 │      └─ respond to display add/remove events
                                                 │
                                                 └── ASP.NET Core (loopback only)
                                                       ├─ authoritative Stage 1 session state
                                                       ├─ private preview + public approved state
                                                       └─ bundled scene metadata/assets
```

Stage 1 does not need a database, SignalR, PixiJS, a service layer framework, or general event bus. Keep scenes as bundled assets and state as a small in-memory model; persist only lightweight preferences (last chosen display identifier and scene) if useful. Leave a clean seam for later SQLite-backed campaign state without building that layer early.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Electron main | Own process lifecycle, create windows, enumerate/select displays, move/resize/fullscreen public window; never render DM data in public window | DM preload IPC, backend local HTTP, both windows |
| DM dashboard renderer | Scene list, private preview, show/change and emergency blackout controls | Narrow preload/IPC for display commands; backend API for session actions |
| Public renderer | Display only approved presentation state; no navigation to dashboard or private routes/data | Read-only public DTO endpoint or narrowly scoped update channel |
| ASP.NET Core local backend | Authoritative session/scene state and command validation; explicitly projects approved public view | Electron + renderers over local HTTP |
| Packaged demo assets | Two or three sample scene images and safe fallback black screen | Backend catalogue / public renderer |

### Data Flow and privacy boundary

1. Electron starts the backend, waits for readiness, then creates the DM window and public window in a safe initial black state. Failure to start backend should leave an actionable error in the DM window and should not expose a half-initialized public scene.
2. DM renderer requests the bundled scene catalogue and changes a **private preview** selection. Preview is local to the DM view; it must not update the public state.
3. An explicit `Show` command promotes an approved scene ID to public state. `Blackout` is a distinct explicit command that sets a safe black public state (not a blank/failed render).
4. The public renderer receives only a purpose-built `PublicPresentation` projection: approved scene/image and presentation mode. It should not consume the full session model and hide private fields with UI conditionals. Prefer separate DTO shape/endpoint, making private notes and future hidden-token data structurally unavailable to that renderer.
5. Electron routes display selection and window movement through the main process. If the selected display disappears, public output fails closed to black/windowed safe preview; when reconnected, allow the DM to reselect or restore the target without publishing any private UI.

This boundary is defense-in-depth, not a claim that a local process is cryptographically isolated from the laptop owner. Renderers should use `contextIsolation: true`, sandboxing, `nodeIntegration: false`, and a minimal `contextBridge` API, consistent with Electron's documented process model. Do not pass broad IPC or arbitrary URL/navigation capability to the presentation window.

### Display and two-window model

Electron's `screen` module is only available after app readiness and exposes all current displays, display bounds/work areas, plus `display-added`, `display-removed`, and metrics-change events. Use those native APIs from Electron main; show human-friendly display labels/size in the dashboard and associate a selection with a currently enumerated display. Persist the selection as a preference, but revalidate it at startup because display IDs or topology may change. The brief says persist sensible preferences; it does not guarantee identifiers are stable across OS changes.

Create a normal DM `BrowserWindow` on the laptop and a separate borderless public `BrowserWindow` placed using selected display bounds. Make the public view full-screen only after a valid display is selected and the DM explicitly starts public presentation. On a one-display setup, do not force fullscreen: put a clearly labelled, ordinary windowed public preview beside/over the DM dashboard as space permits, preserving the acceptance test's safe preview. Provide an immediately reachable `Blackout` control in the DM window, and ensure blackout also occurs on public-window initialization/failure.

Do not assume a display stays attached. Subscribe to display events and re-check bounds before repositioning. On removal, black/close or demote the public window to a safe windowed preview on the primary display and inform the DM; never move private dashboard contents into that window. Validate behavior physically on Windows and macOS, especially mixed-DPI monitors, Spaces/fullscreen behavior, display reordering, HDMI unplug/replug, and sleep/wake.

### Backend packaging and lifecycle

Publish the ASP.NET Core app as a **self-contained, RID-specific deployment** for each supported OS/architecture (e.g. Windows x64 and macOS arm64/x64 as release requirements dictate), bundled as an Electron application resource. Microsoft documents that self-contained publishing includes the .NET runtime and means end users need not install it; the tradeoff is larger platform-specific output and application-owned runtime updates. Avoid single-file publishing initially unless tested: it changes extraction/startup behavior without helping Stage 1's core acceptance.

Electron main launches the packaged executable with a child-process API, supplies a per-run ephemeral loopback port (or safely discovers a free port), and waits for a readiness probe with a bounded timeout before loading app windows. Bind explicitly to loopback, not all interfaces. Main owns the child handle and logs exit/error; app shutdown requests graceful backend termination, waits briefly, then terminates only its owned process if required. Handle startup crash, port collision, backend exit while open, and app relaunch. Never leave a detached backend orphaned. A simple HTTP readiness endpoint is enough; avoid elaborate service supervision.

Port/endpoint bootstrap is an implementation decision not fully specified by the brief. Prefer an OS-assigned port communicated through a one-run startup argument or a small stdout readiness line; avoid predictable fixed ports and avoid secrets/config passed through renderer code. Local HTTP over loopback is reasonable for a single-user same-machine Stage 1 service; when the later phone client is added, separately revisit LAN exposure, authentication/join codes, firewall prompts and transport security. Do not bind to LAN now.

## Patterns to Follow

### Explicit private preview vs public commit
**What:** Keep `previewSceneId` and `publicSceneId` as distinct state fields; a preview action only changes the first, while `Show(sceneId)` validates the ID and atomically changes public state. Blackout is an explicit presentation mode.
**When:** Every stage where DM can inspect/edit upcoming material while current output remains public.
**Example:** `POST /api/session/public-scene { sceneId }` changes the public projection; `GET /api/public/presentation` returns only `{ mode: "scene", assetUrl: ... }` or `{ mode: "black", ... }`. Never serialize the private session aggregate as the response.

### Main-process ownership of platform integration
**What:** Keep display enumeration, window coordinates/fullscreen, child-process start/stop and display events in Electron main. Expose named, validated operations through preload IPC.
**When:** Electron needs OS capabilities that renderer code should not possess.
**Why:** Electron's process-model docs define main as the window manager/native API entry and each BrowserWindow renderer as a separate process; its security docs support narrow APIs rather than exposing unrestricted Node access.

### Vertical slice before abstraction
**What:** Stage 1 proves launch → choose display → preview privately → publish scene → blackout → single-display fallback, with real bundled assets, demo checklist, minimal state tests, and packaged startup.
**When:** First milestone and each later stage.
**Why:** This validates the project's core value and packaging/display risk before maps, persistence architecture or multiplayer. Keep ports/adapters and domain abstractions proportionate; backend authoritative state is sufficient without event sourcing.

## Anti-Patterns to Avoid

### One shared UI/page mirrored to a second screen
**What:** Reusing the DM dashboard window as a duplicate/mirrored player surface or hiding DM panels by CSS.
**Why bad:** Accidental private control, notes, prompts or unrevealed content exposure; violates core requirement.
**Instead:** Distinct public renderer, distinct route/build entry if practical, public-only projection, safe default-black startup, and tests asserting forbidden private values are absent from public payload.

### Public renderer reads full session and filters locally
**What:** Sending all session state to the presentation renderer and relying on components to suppress private information.
**Why bad:** A later UI regression, debug panel, or renderer compromise can reveal hidden fields.
**Instead:** Backend creates allowlisted public DTO; presentation process never receives private notes/hidden actor data.

### Fixed-port, broad-bind backend or untracked process
**What:** Listening on `0.0.0.0` or a hard-coded port, starting backend without tracking its handle, or relying on installed global `dotnet`.
**Why bad:** Port conflicts, unintended LAN exposure, orphan processes, and install failure on clean user machines.
**Instead:** Loopback-only ephemeral endpoint, readiness handshake, child lifecycle ownership, self-contained RID-specific publish.

### Build infrastructure before user-visible slice
**What:** Introducing EF Core/SQLite, SignalR, plugin/event architectures, campaign abstractions or map renderer before Stage 1 can present a scene.
**Why bad:** Delays validation of the product's main differentiator without helping the first acceptance demo.
**Instead:** Minimal in-memory scene state + bundled assets now; add persistence and SignalR only with the roadmap stages that need them.

## Stage 1 Build Order

1. **Bootstrap runnable shell:** Electron main + React DM window and a minimal ASP.NET Core endpoint, one command to run in development. Verify both OS development build paths, but label hardware/platform acceptance honestly.
2. **Package backend early:** self-contained platform outputs, Electron resource resolution, process ownership, readiness/error reporting and clean app shutdown. Catch packaging and path differences before building interactions around an unshippable server.
3. **Prove two-window display behavior:** enumerate displays after app readiness; choose display; create public window black by default; implement single-monitor windowed fallback and topology-change handling.
4. **Add isolated state and scenes:** bundled images/catalogue, DM-only preview state, public-only presentation projection; tests for preview-not-publish, show, change and blackout.
5. **Close the demo loop:** add concise error/empty states and persistence of non-sensitive display preference as appropriate; verify on physical Windows and Mac with extended display, unplug/reconnect and privacy checks; deliver run steps and stop for review.

## Sources and Evidence

| Source | Evidence used | Confidence |
|---|---|---|
| Project brief, lines 39–47, 59–65, 142–150: `tabletop_dm_gsd_brief.md` | Explicitly selected stack, two independent windows, packaged .NET backend, backend authoritative state, local/offline architecture, Stage 1 demo and physical test expectations. | HIGH (project requirement) |
| Project context, `.planning/PROJECT.md` lines 19–23, 35–48, 55–59 | Core privacy objective, single-display fallback, stage boundaries, packaging and offline constraints. | HIGH (project requirement) |
| Electron screen API: https://www.electronjs.org/docs/latest/api/screen | `screen.getAllDisplays()`, display event surface, app-ready constraint, display bounds and DIP vs physical coordinate distinction. | HIGH (official docs, latest page fetched 2026-10-28) |
| Electron BrowserWindow API: https://www.electronjs.org/docs/latest/api/browser-window | Separate window creation, fullscreen APIs, renderer sandbox/context isolation defaults and lifecycle events. | HIGH (official docs, latest page fetched 2026-10-28) |
| Electron process model: https://www.electronjs.org/docs/latest/tutorial/process-model | Main manages app/windows/native APIs; each BrowserWindow has separate renderer; app lifecycle and utility process concepts. | HIGH (official docs, latest page fetched 2026-10-28) |
| .NET application publishing: https://learn.microsoft.com/en-us/dotnet/core/deploying/ | Self-contained publish includes runtime, is platform-specific and larger; single-file bundles have extraction/startup tradeoffs. Article updated 2026-07-27. | HIGH (official Microsoft documentation) |
| ASP.NET Core Kestrel, .NET 10: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel?view=aspnetcore-10.0 | Kestrel cross-platform and the default ASP.NET Core server; endpoint can be configured by host options/URLs. Article updated 2026-10-13. | HIGH (official Microsoft documentation) |

## Uncertainties and Follow-up Research

- Electron supports enumerating and reacting to displays, but exact macOS Spaces/fullscreen behavior, Windows mixed-DPI positioning and HDMI recovery need physical device acceptance tests; docs alone cannot establish the target user experience.
- Decide and verify package tooling and app resource layout (Electron Forge/builder not prescribed); test notarization/signing and platform-specific .NET runtime identifiers when release packaging becomes a phase task.
- An ephemeral port handoff and local-origin/CORS strategy should be confirmed in the first implementation spike. Keep endpoint loopback-only. HTTP on loopback is proposed for Stage 1 only; phone companion LAN access changes the threat model and needs its own research.
- Display identifier persistence/stability is not guaranteed by the cited docs; use as a best-effort preference and gracefully fall back to prompting.
- This research did not verify current Electron releases against Node child-process termination details or packaging tool integration. Confirm exact API behavior in implementation docs/tests before coding lifecycle escalation.
