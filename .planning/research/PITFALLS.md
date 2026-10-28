# Domain Pitfalls

**Domain:** Cross-platform Electron tabletop DM presentation app with bundled local .NET backend  
**Researched:** 2026-10-28  
**Evidence confidence:** LOW per the configured provider-confidence classifier; findings below are cross-checked against cited official documentation where available. Validate on physical macOS and Windows hardware before claiming platform support.

## Critical Pitfalls

### Pitfall 1: Display topology changes leave the public window stranded or expose the wrong screen
**What goes wrong:** HDMI is connected/disconnected, the OS rearranges displays, resolution/scale/rotation changes, or the remembered display identifier is stale. A presentation window can remain off-screen, move to the laptop, use stale bounds, or fail to recover. A stale selected display must never result in private UI being moved into public view.
**Why it happens:** Display topology and bounds are runtime state, not a durable preference. Electron reports display-added, display-removed, and display-metrics-changed events; display identity and arrangement can vary across reconnection and OS sessions.
**Warning signs:** Only enumerates displays at startup; relies on display array index or saved bounds; no visible “display disconnected” state; fullscreen is assumed to recover automatically; tests only use one monitor.
**Prevention:** Subscribe to Electron `screen` topology/metrics events. Persist a best-effort preference, then revalidate against current displays on launch and every change. On disconnect, immediately show a safe neutral/black state, mark presentation unavailable, and require an explicit safe re-selection or fall back to a normal windowed preview on the DM display. Recompute bounds before showing; keep “blackout” as a reliable action independent of selected scene. Never auto-move a public window onto the private dashboard without a deliberate, visibly safe fallback.
**Phase:** Stage 1, before the first dual-screen demo; repeat hot-plug and resolution/arrangement checks in each platform acceptance pass.

### Pitfall 2: Private DM content crosses the public-display boundary
**What goes wrong:** Dashboard routes, notes, unrevealed scene content, dialogs, error overlays, or debug UI appear on the table screen. A navigation or renderer bug accidentally loads DM UI into the presentation window. This is the core trust failure, not a cosmetic defect.
**Why it happens:** Treating two windows as two placements of one unrestricted application view, sharing state/data indiscriminately, or using renderer-side filtering as the only privacy control.
**Warning signs:** Same route/component and broad API exposed to both windows; player window can request raw session data; development errors and browser dialogs appear publicly; test asserts only scene image and not absence of DM UI/private strings.
**Prevention:** Make the presentation renderer a distinct, allowlisted view that receives only explicitly approved public presentation data. Keep authoritative/private session state in the backend/main process; expose narrow preload APIs, not unrestricted Node or backend access. Ensure black/empty public state is the default before content arrives and on errors. Add privacy regression checks for both windows, including assertions that private labels/notes and dashboard controls never render in the player window. For Stage 1, limit public payload to the selected bundled image and blackout state—do not build future game-state machinery.
**Phase:** Stage 1 architecture and acceptance gate; re-audit whenever later stages introduce hidden tokens, fog, notes, prompts, player clients, or generated content (Stages 2–7).

### Pitfall 3: Backend lifecycle races, leaks, or port collisions
**What goes wrong:** Electron opens before ASP.NET Core is listening; frontend sees transient connection failures; backend crashes silently; closing the UI leaves a server process behind; a fixed port conflicts with another app or stale process; restart/relaunch produces duplicate backends.
**Why it happens:** Starting a child process is asynchronous, and window lifecycle does not itself establish backend readiness or guarantee child cleanup. A fixed local HTTP port may already be occupied.
**Warning signs:** Arbitrary startup sleep instead of readiness detection; renderer retries forever; errors only appear in a hidden console; process termination is tied only to window close; fixed port without collision/error handling; credentials or private data exposed on a broadly bound interface.
**Prevention:** Electron main process owns backend spawn/monitor/termination. Use an explicit readiness handshake with bounded timeout and actionable startup error; pass a selected local port or otherwise detect conflicts; bind to loopback for desktop-only Stage 1. Handle child `error`, `exit`, app quit and unexpected shutdown; close windows only after safe cleanup where practical, and ensure app shutdown cannot orphan the child. Keep secrets out of command lines/logs. Make startup/shutdown paths testable without launching the whole UI.
**Phase:** Stage 1 foundation and packaging smoke test; revisit network binding/authentication when local-network player access is added in Stage 6.

### Pitfall 4: “Bundled .NET” still depends on target OS, architecture, or signing environment
**What goes wrong:** A package builds but fails on a clean machine because it is framework-dependent, wrong RID/CPU architecture, missing native runtime dependencies, excluded files, or an executable permission/signing issue. A package that works from a developer checkout can fail after installation, update, quarantine, or relocation.
**Why it happens:** RID-specific publish output is platform-specific; specifying a RID alone does not reliably mean self-contained on current SDK defaults. .NET single-file output is also OS/architecture-specific and does not eliminate every native dependency. Electron packaging/signing has platform-specific constraints.
**Warning signs:** Build uses developer-installed .NET; no clean-machine install test; only one publish artifact copied to all targets; runtime identifier or self-contained mode is implicit; resources referenced by source-tree-relative paths; signing/notarization is deferred until release week.
**Prevention:** Publish the .NET backend explicitly self-contained for each supported OS/architecture (at minimum the agreed Windows and macOS targets), and package the full publish directory as app resources rather than assuming a single executable is simpler. Resolve bundled scenes/backend paths relative to packaged app resources, not the working directory. Test actual installed artifacts without .NET/Node installed and offline. Establish signing/notarization and per-OS build-artifact strategy early enough to discover distribution blockers; report unverified architectures/platforms honestly.
**Phase:** Stage 1 establish a reproducible packaged build and install smoke tests. Stage 1 can use developer builds for rapid iteration, but acceptance must include the packaged artifact; mature signing/notarization belongs in release-readiness work, not a Stage 1 feature detour.

## Moderate Pitfalls

### Pitfall 5: Offline-first promise is undermined by startup/network assumptions
**What goes wrong:** First launch, scene display, or backend startup requires a remote asset, CDN, telemetry endpoint, internet check, or online account. A local HTTP call is incorrectly treated as “internet required” or a proxy/firewall interferes.
**Warning signs:** Bundled demo scenes are actually remote URLs; startup blocks on external fetch; app reports generic failure when offline; player presentation falls back to external hosted content.
**Prevention:** Bundle Stage 1 demo images and UI assets; keep backend local and loopback-bound; exercise launch, preview, display, blackout and relaunch with network disabled. Distinguish backend readiness from internet connectivity. Later local content remains local by default; optional network features must fail independently without blocking play.
**Phase:** Stage 1 offline acceptance test; maintain through all later stages.

### Pitfall 6: Tests validate mocked windows, not the physical dual-display failure modes
**What goes wrong:** Unit tests pass while real extended-desktop positioning, DPI scaling, fullscreen behavior, macOS permissions/Spaces, window focus, HDMI hot-plug, packaging, or OS-specific process cleanup fails.
**Warning signs:** “Cross-platform verified” based only on CI or one developer workstation; no physical external monitor check; no test after unplug/replug; manual acceptance has no explicit privacy assertion.
**Prevention:** Divide coverage: unit tests for display-selection/fallback and backend lifecycle state transitions; Electron integration tests for window roles and public payload; manual acceptance on real Windows and Mac hardware with an extended HDMI display, unplug/reconnect, blackout, focus, and single-display fallback. Keep a per-OS checklist and mark unavailable hardware as unverified. Do not attempt elaborate display emulation in Stage 1.
**Phase:** Stage 1 verification checklist; repeat targeted manual checks when later features affect presentation or packaging.

### Pitfall 7: Fullscreen/window-manager assumptions make safe fallback unusable
**What goes wrong:** Fullscreen presentation steals focus, appears on the wrong display, gets trapped after monitor changes, or cannot be controlled when only one display is attached. A blacked-out display is confused with a closed/crashed window.
**Warning signs:** No normal windowed preview mode; blackout closes the player window; keyboard shortcuts depend on focus; fullscreen behavior is assumed identical on Windows and macOS.
**Prevention:** Treat fullscreen and windowed-preview as distinct modes. One-display mode must explicitly remain a normal windowed preview, with a persistent “not public” indication and safe controls. Blackout should render a neutral surface while keeping the window controllable/recoverable. Test focus and escape/recovery behavior on both OSes; avoid global shortcut complexity in Stage 1.
**Phase:** Stage 1, included in its visible acceptance criteria.

## Minor Pitfalls

### Pitfall 8: Stage 1 grows into future backend/game architecture
**What goes wrong:** Display presentation is delayed by designing campaign databases, SignalR, plugin/event systems, map engines, or generalized permission frameworks before the single-scene workflow is proven.
**Warning signs:** Stage 1 has persistence/domain abstractions for features not yet present; no working scene-on-HDMI demo while infrastructure expands.
**Prevention:** Keep Stage 1 data model to bundled scenes, current selection, display preference, public scene/blackout state, and lifecycle status. Make the privacy boundary explicit but minimal. Add future capabilities only when their stage requires them.
**Phase:** Stage 1 scope control.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Stage 1: two-screen shell | HDMI topology and private/public display confusion | Hot-plug-aware selection, black-safe failure state, windowed one-screen mode, manual Windows + Mac acceptance |
| Stage 1: bundled local backend | Startup race, stale child process, undeclared .NET dependency | Readiness handshake, bounded startup failure, lifecycle ownership, explicit self-contained RID publish and clean install/offline smoke test |
| Stage 2: maps and saved positions | Public renderer receives full editor/private map state | Continue allowlisted presentation payload; test hidden/preview state separately before adding later hidden-token features |
| Stage 3: fog and hidden actors | Accidental disclosure through rendering/API/debug paths | Treat all hidden data as private by default; test public projections and transitions (reveal/hide) explicitly |
| Stage 4: audio/hotkeys | Focus and OS shortcut differences disrupt normal typing | Start with configurable ordinary shortcuts; test on both OSes and document limitations |
| Stage 6: local-network sheets | Desktop-only loopback assumption no longer fits LAN; local service becomes an attack surface | Phase-specific threat model, explicit opt-in LAN binding, join authorization, and network/privacy testing before enabling access |
| Packaging/release readiness | Untrusted or unsigned install artifacts blocked or warn users | Per-platform artifacts, clean install tests, signing/notarization workflow, disclose unsigned development builds |

## Sources

- [Electron `screen` API](https://www.electronjs.org/docs/latest/api/screen/) — display-added, display-removed and display-metrics-changed events (official documentation; websearch-derived, LOW provider confidence).
- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) — Electron main/renderer/utility process roles and lifecycle context (official documentation; websearch-derived, LOW provider confidence).
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) — recommends context isolation and avoiding Node integration in renderers (official documentation; websearch-derived, LOW provider confidence).
- [.NET application publishing overview](https://learn.microsoft.com/en-us/dotnet/core/deploying) — self-contained and RID-specific publishing; framework/runtime dependencies (Microsoft Learn; websearch-derived, LOW provider confidence).
- [.NET single-file deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview) — single-file apps remain OS/architecture specific (Microsoft Learn; websearch-derived, LOW provider confidence).
- [electron-builder multi-platform build](https://www.electron.build/docs/features/multi-platform-build/) and [macOS code signing](https://www.electron.build/docs/features/code-signing/code-signing-mac/) — native dependency and signing constraints (official project docs; websearch-derived, LOW provider confidence).

## Research Limits

- No physical Windows/macOS display tests were conducted; macOS Spaces/fullscreen, monitor identity stability and individual GPU/driver quirks need Stage 1 hardware validation.
- Packaging framework choice and exact supported CPU architectures are not yet settled; make them explicit before producing release artifacts.
