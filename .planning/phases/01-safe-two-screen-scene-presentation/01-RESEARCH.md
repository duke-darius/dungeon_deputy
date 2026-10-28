# Phase 1: Safe Two-Screen Scene Presentation - Research

**Researched:** 2026-10-28  
**Domain:** Electron multi-display windows, local .NET backend, desktop packaging  
**Confidence:** MEDIUM — official API shape confirmed; actual macOS/Windows display behavior still needs physical acceptance testing.

## Summary

Keep Electron main as the owner of display enumeration, player-window placement, lifecycle, and display-change recovery. `screen.getAllDisplays()` is available in the main process after Electron's `app` is ready; the `screen` module emits `display-added` and `display-removed`. Keep React renderers isolated: the private DM window receives dashboard capabilities, while the player window receives only an allowlisted scene-or-black presentation model.

Keep Stage 1 a small vertical slice: local backend state for selected/private and public scene, a distinct show action, immediate blackout, bundled scenes, and saved preferences. A removed or invalid display should fail closed and allow the DM to reselect; a single-display setup should use a normal windowed player preview, not a mirrored dashboard. Physical monitor behavior and packaging must be labeled unverified where not tested.

The npm package gate classified some well-known dependencies as `SUS` because their latest versions were published very recently. Their registry presence, weekly download counts, repository URLs, and lack of a declared postinstall script were checked, but GSD requires a blocking human verification checkpoint before installing each flagged package. Do not silently install them.

**Primary recommendation:** Use a least-privilege Electron main/preload/renderer split, a local self-contained .NET backend with a readiness handshake, and an explicit scene-only public state contract.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|---------------|----------------|-----------|
| Display enumeration and native window placement | Electron main | — | Uses Electron screen and BrowserWindow APIs; renderers should not own OS display behavior. |
| Authoritative selected/public scene state | ASP.NET Core backend | Electron main bridge | Backend owns domain state; main mediates renderer capability boundaries. |
| Private dashboard and scene preview | DM React renderer | Backend API | Private preview is not public until an explicit action. |
| Public scene or blackout rendering | Player React renderer | Electron main | Dedicated window consumes only allowlisted public presentation state. |
| Persistent last-scene/display preferences | Backend or small local preferences file | Electron main | Keep simple and revalidate display IDs on launch. |
| Build/package lifecycle | Electron build scripts + self-contained .NET publish | — | Installed application should not require a system .NET/Node runtime. |

## Standard Stack

### Core

| Library | Version observed | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| Electron | 45.1.0 (published 2026-10-27) | Cross-platform desktop shell and display windows | Explicitly selected in the project brief; official Electron display APIs support this architecture. |
| React | 19.3.1 (published 2026-10-14) | Dashboard and player renderer UI | Explicitly selected in the brief; established component UI framework. |
| React DOM | 19.3.1 (published 2026-10-14) | Renderer mounting | Required React browser renderer. |
| Vite | 8.3.5 (published 2026-10-21) | Renderer development/build | Small, common TypeScript/React build workflow. |
| TypeScript | 7.0.2 (published 2026-07-08) | Electron and renderer source | Explicit language direction; type-checkable boundary contracts. |
| ASP.NET Core / .NET | .NET 10 SDK | Local authoritative backend | Explicit backend direction in project brief; self-contained publish avoids end-user runtime dependency. |

### Supporting

| Library | Version observed | Purpose | When to Use |
|---------|-----------------|---------|-------------|
| `@vitejs/plugin-react` | 6.1.2 (published 2026-10-05) | React transform and fast refresh | Renderer development/build. |
| `electron-builder` | 26.18.0 (published 2026-10-20) | Desktop packaging | Stage 1 must prove the installed-app shape, with platform-specific packaging limitations documented. |
| `@types/react` | 19.3.0 | React TypeScript types | Type-checking React renderer. |
| `@types/react-dom` | 19.3.0 | React DOM TypeScript types | Type-checking renderer bootstrap. |
| `@types/node` | 26.6.5 | Node/Electron main TypeScript types | Type-checking Electron main/preload. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Electron | Native SwiftUI / WinUI applications | Separate implementations and UI behavior for each release platform; conflicts with selected cross-platform direction. |
| React + Vite | A single static HTML renderer | Fewer dependencies but less maintainable as the DM dashboard grows; not the chosen UI direction. |
| Separate React player window | Mirroring the DM window | Simpler initially but directly violates the privacy boundary; rejected. |
| Self-contained .NET publish | Require end users to install .NET | Reduces bundle size but fails the brief's installed-app requirement; rejected. |

## Package Legitimacy Audit

Audit run through the GSD package-legitimacy check against npm on 2026-10-28. Registry metadata and source repositories were cross-checked with `npm view`; no declared `scripts.postinstall` was found for the listed packages. The gate's `SUS` verdict is based on very recent latest-version publication, despite high download counts and matching upstream repositories. Treat every `SUS` as requiring a blocking human verification checkpoint before installation.

| Package | Registry | Age / latest observed version | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-------------------------------|-----------|-------------|---------|-------------|
| `electron` | npm | ~1 day / 45.1.0 | 7,636,299/wk | github.com/electron/electron | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `electron-builder` | npm | ~8 days / 26.18.0 | 4,999,391/wk | github.com/electron-userland/electron-builder | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `typescript` | npm | ~112 days / 7.0.2 | 267,244,286/wk | github.com/microsoft/TypeScript | OK | Approved; no declared postinstall. |
| `vite` | npm | ~7 days / 8.3.5 | 171,580,460/wk | github.com/vitejs/vite | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `react` | npm | ~14 days / 19.3.1 | 165,732,882/wk | github.com/facebook/react | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `react-dom` | npm | ~14 days / 19.3.1 | 155,665,230/wk | github.com/facebook/react | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `@vitejs/plugin-react` | npm | ~23 days / 6.1.2 | 82,827,925/wk | github.com/vitejs/vite-plugin-react | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `@types/node` | npm | ~19 days / 26.6.5 | 404,009,479/wk | github.com/DefinitelyTyped/DefinitelyTyped | [SUS] | Human verification checkpoint before install; no declared postinstall. |
| `@types/react` | npm | ~49 days / 19.3.0 | 149,013,762/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved; no declared postinstall. |
| `@types/react-dom` | npm | ~49 days / 19.3.0 | 127,180,405/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved; no declared postinstall. |

**Packages removed due to [SLOP] verdict:** none.  
**Packages flagged as suspicious [SUS]:** `electron`, `electron-builder`, `vite`, `react`, `react-dom`, `@vitejs/plugin-react`, `@types/node` — add a human verification checkpoint before each install.

## Architecture Patterns

### Main-process display ownership

Electron's `screen` module is main-process-only and must be accessed after `app` is ready. Enumerate displays with `screen.getAllDisplays()`, select a valid display, and subscribe to display-added/removed changes. Keep a saved display identifier as a preference, not as permanent truth; revalidate against current monitors before positioning the player window.

**Sources:** Electron screen API, https://www.electronjs.org/docs/latest/api/screen ; Context7 search authenticated 2026-10-28.

### Private-to-public state contract

Represent selected preview separately from public presentation. An explicit show action copies an approved scene identifier/content into public presentation state. Blackout sets a distinct black state. Project only public fields to the player window; do not send the full session/dashboard model and hide controls with CSS.

### Local backend readiness

Electron main starts the self-contained .NET process, waits on a loopback-only readiness endpoint before loading dashboard functionality, handles startup/exit failures explicitly, and terminates the child process on app shutdown. Avoid exposing a network listener to the LAN in this stage.

## Common Pitfalls

### Player window lands on the wrong display after reconnect
**What goes wrong:** Saved coordinates or display identifiers become stale and public content opens over the DM dashboard or off-screen.  
**How to avoid:** Re-enumerate and validate displays at startup and on screen events; fail to a windowed preview and make the player window movable/reselectable.  
**Warning signs:** disconnected display IDs, negative/out-of-bounds bounds, or a public window no longer visible.

### Private data crosses into player renderer
**What goes wrong:** Hidden notes or UI can leak because both windows receive the same app state.  
**How to avoid:** Define an allowlisted presentation DTO and a separate IPC/API channel; test that private fields are absent.  
**Warning signs:** passing complete campaign/session objects or reusing the dashboard renderer with controls conditionally hidden.

### Unpackaged development success mistaken for installed-app success
**What goes wrong:** Backend starts only because the developer machine already has .NET/Node or source paths.  
**How to avoid:** publish self-contained, resolve assets relative to packaged app resources, test a clean packaged build, and label unsupported cross-platform artifacts clearly.  
**Warning signs:** use of `dotnet run` or a dev server required at app launch.

## Stage 1 Verification Notes

- Automated tests: private selected scene does not mutate public scene until explicit show; blackout yields only a black public view; display removal invalidates target and preserves safe fallback; player payload excludes DM-only fields.
- Manual: with an external display, select it and verify show/change/blackout; disconnect/reconnect/reassign and recover; on one display, verify a windowed preview while dashboard remains usable.
- Platform honesty: this environment is Windows; macOS and physical HDMI/display behavior must be marked unverified until tested on real devices.

---

*Last updated: 2026-10-28 after Phase 1 research*
