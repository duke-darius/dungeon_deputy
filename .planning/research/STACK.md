# Technology Stack

**Project:** DungeonDeputy  
**Researched:** 2026-10-28  
**Scope:** Stack and current compatibility, especially Stage 1 desktop packaging and multi-display scene presentation. The project's explicit .NET/Electron/React choices are retained.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| .NET SDK / ASP.NET Core | .NET 10 LTS; target `net10.0`, deploy latest 10.0 servicing patch | Local authoritative HTTP API and later session backend | .NET 10 is the current LTS line, supported through November 2028. ASP.NET Core ships with the .NET release and has matching support lifecycle. It is cross-platform and fits a local process without a cloud dependency. |
| Electron | Latest stable major at project setup (45.0.0 was current on research date); pin exact version in lockfile and keep current supported line | Windows/macOS desktop shell, window and display management | Electron is explicitly selected and provides access to OS display/window APIs with a shared Chromium UI. It also means shipping Chromium/Node; keep its version maintained for security fixes. |
| TypeScript | Current stable 5.9.x line; pin exact patch | Type-safe UI, Electron main/preload, and shared API contracts | Mature stable line with `strict` type checking and current React/Vite support. Use separate TS configs for renderer and Electron main/preload because their runtime globals and module environments differ. |
| React | 19.2.x; pin exact patch | DM control UI and player-facing renderer | Current stable React generation. Keep DM and player views as distinct renderer routes/components and expose no privileged Electron API to either renderer. |
| Vite | Current stable release selected by the React + TS template; lock exact version | Frontend dev server and production asset build | React's official from-scratch guide points to Vite and a `react-ts` template. Vite's output is static assets; package them inside Electron rather than requiring a development server at runtime. |
| Electron Forge | Current stable compatible release; use Forge CLI, Packager, and platform makers together | Package and create platform artifacts | Official Electron packaging path, with Forge lifecycle covering packaging and macOS signing/notarization integration. Avoid introducing multiple overlapping packaging systems at MVP. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SQLite | Native engine bundled by the selected provider | Local campaign/session data in later stages | Local-first and offline-friendly. Stage 1 only presents bundled scenes and can use in-memory state; do not add persistence until a stage has user-owned data to save. |
| `Microsoft.Data.Sqlite` | 10.0.x, aligned with .NET 10 | ADO.NET SQLite provider when persistence begins | Microsoft's lightweight provider and a direct fit for a small local backend. Add only when needed. Start with this provider directly; add EF Core SQLite only when migrations and a meaningful relational model justify its abstraction. Test native SQLite loading for every publish RID. |

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Kestrel / ASP.NET Core hosting | Included with ASP.NET Core 10 | In-process-machine local API, started and stopped by Electron main process | Keep backend authoritative while avoiding a separately installed service. Bind to loopback only; select a free local port, communicate it to Electron through a startup handshake, and expose a readiness endpoint before loading the renderer. Do not expose a LAN listener in Stage 1. |
| Electron Forge makers | Current compatible Forge release | Windows installer and macOS app archive | Begin with Forge's Squirrel.Windows maker for a Windows installer and ZIP maker for macOS distribution/testing. Package/sign/notarize on platform-appropriate CI/hosts; signing credentials and Apple notarization are release prerequisites, not runtime dependencies. Choose a DMG maker only when user-facing macOS installation experience is in scope. |
| .NET self-contained publish | .NET 10 SDK, per target RID | Ship backend runtime without requiring user-installed .NET | Publish separate Windows and macOS architecture artifacts (at minimum `win-x64`, `osx-x64`, `osx-arm64` as supported by target machines). Treat Electron package and .NET publish output as one release unit. Self-contained means runtime included, not necessarily one file. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@microsoft/signalr` | Match ASP.NET Core 10 client/server generation | Realtime updates/clients | Defer: Stage 1 uses request/response and local window coordination. Introduce SignalR when player clients or push synchronization arrive; it supports WebSockets with fallback transports. |
| `pixi.js` | Stable v8.x at adoption (8.19.0 shown in official docs on research date) | Later 2D map canvas | Defer to the map stage. PixiJS 8 supports WebGL/WebGL2 and WebGPU; its own renderer docs recommend WebGL for production while WebGPU remains maturing. Stage 1's static scene display does not need a rendering engine. |
| `@types/react`, `@types/react-dom` | Match React 19.x | React TypeScript declarations | Needed for TS UI type checking; keep aligned with installed React major. |
| React testing library / Vitest | Current stable versions compatible with Vite | UI and view-model tests | Add to validate state transitions, DM/public separation, blackout, and display-selection behavior. Choose versions at project setup and pin in the npm lockfile. |

## Stage 1 Desktop and Display Implications

1. **One app, two isolated windows.** Electron main owns lifecycle, display enumeration, window creation and backend process management. Create a private DM `BrowserWindow` and a separate player `BrowserWindow`; never mirror the DM renderer or expose its store/API to the public renderer. Backend responses for the public view should be an explicitly approved presentation model, not a full session object with hidden fields.
2. **Use Electron's display APIs rather than browser assumptions.** Enumerate displays through Electron's `screen` API after readiness; let the DM select the destination. Position the player window using the chosen display's bounds/work area and support windowed preview on the same/only display. Account for display hot-plug, different scaling/DPI, resolution changes, and window-placement failures. A normal windowed mode is the safe fallback; fullscreen is a user-triggered display mode, not a startup assumption.
3. **Blackout is an explicit public-display state.** Make blackout a public-renderer state that replaces scene content immediately, survives scene/window transitions, and is independent from DM preview. Test the failure path where backend connection is lost; public renderer should fail closed to black/neutral content rather than stale unrevealed scene data.
4. **Local backend bootstrap is packaging-critical.** Electron main starts the self-contained ASP.NET Core child process, waits for readiness, then loads local packaged UI against loopback. Handle ephemeral port selection, stale process cleanup, clean app shutdown, startup errors, and logs. Do not assume `localhost` resolves identically in every environment; bind explicitly to `127.0.0.1` and use a per-run port/secret capability if API access needs protection. Do not listen on `0.0.0.0`.
5. **Renderer security defaults remain on.** `nodeIntegration: false`, `contextIsolation: true`, renderer sandbox enabled; expose narrowly scoped, validated methods via preload `contextBridge`. Restrict navigation and new windows, validate IPC senders, and use a restrictive Content Security Policy. UI and all production assets are local; no remote code or internet is required.
6. **Runtime bundling and platform validation are distinct.** Electron includes Chromium/Node; .NET self-contained publish includes .NET runtime. Package both, so a customer needs neither .NET nor Node. Build and smoke-test each OS/architecture separately, including launch from an installed package, second-monitor selection, single-monitor preview, black screen, app restart and shutdown. A Windows build is not evidence that macOS was tested; physically verify both target operating systems before claiming support.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend build | Vite React + TypeScript template | Next.js / server-rendered React framework | Stage 1 is a local desktop SPA with no cloud hosting, SSR, or public SEO requirement. A server-centric framework adds runtime/deployment complexity without solving the desktop shell problem. |
| Electron packaging | Electron Forge | Manually compose Packager + ad hoc installer scripts | Forge is the official all-in-one packaging/distribution workflow and has platform makers and signing integrations. Avoid hand-maintaining glue until a concrete distribution need exceeds Forge's capabilities. |
| Windows installer | Forge Squirrel.Windows maker | Bring in a separate installer system immediately | Squirrel maker yields a user-friendly install artifact; extra packaging system increases duplicated configuration for a two-platform MVP. Revisit if update/enterprise-install requirements demand another format. |
| SQLite access | `Microsoft.Data.Sqlite` directly first | EF Core SQLite immediately | Early stages have little or no persistent relational data. ORM, migrations, and model abstraction would be premature; adopt EF Core when schema evolution and relationships pay for it. |
| Realtime | ASP.NET Core SignalR later | WebSocket/SignalR layer in Stage 1 | There are no networked player clients in Stage 1. Keep simple local HTTP/state transitions first; do not build unused realtime infrastructure. |
| Map rendering | PixiJS later, WebGL path | PixiJS/WebGPU first or general game engine | PixiJS is selected for later 2D maps, but Stage 1 only presents a few static scenes. PixiJS docs call WebGL stable/recommended and WebGPU still maturing; defer both until the canvas stage. |
| .NET deployment | Self-contained per RID | Framework-dependent install | Framework-dependent deployment contradicts the explicit requirement that users need not install .NET. Self-contained makes the app artifact larger, but predictable and offline-ready. |

## Installation / Version Policy

Do not rely on floating dependencies in release builds. At project bootstrap, select current supported stable versions, commit `global.json` with SDK roll-forward policy, commit `package-lock.json` (or one chosen npm-compatible lockfile), and pin Forge/Electron/React/TS/Vite. For .NET, target `net10.0` and regularly consume supported 10.0 servicing patches. Keep Electron on a supported stable release and update promptly for Chromium security updates. Avoid prereleases and experimental WebGPU for production.

Illustrative commands (resolve package versions to current stable at implementation time):

```bash
# Frontend/desktop packages; use the React + TypeScript Vite template, then add Electron + Forge.
npm create vite@latest ui -- --template react-ts
npm install react react-dom
npm install -D electron @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-zip

# Deferred libraries: add only when their stage begins.
# npm install @microsoft/signalr
# npm install pixi.js

# Backend: target net10.0; publish a self-contained artifact per supported RID.
dotnet publish src/DungeonDeputy.Api -c Release -r win-x64 --self-contained true
dotnet publish src/DungeonDeputy.Api -c Release -r osx-arm64 --self-contained true
```

Avoid assuming `PublishSingleFile=true` alone makes every native dependency disappear: validate native library extraction/loading and data-file paths in packaged builds. Keep app data and SQLite files (when added) in the OS per-user application-data directory, never beside read-only installed resources.

## Sources

Primary official sources checked on 2026-10-28; version availability can change, so resolve and lock versions when implementation starts.

- [Microsoft .NET releases and support](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support) — .NET 10 LTS lifecycle and servicing.
- [ASP.NET Core overview, .NET 10](https://learn.microsoft.com/en-us/aspnet/core/overview?view=aspnetcore-10.0) — framework capabilities and cross-platform support.
- [.NET deployment overview](https://learn.microsoft.com/en-us/dotnet/core/deploying/) and [single-file deployment considerations](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview) — self-contained and single-file publish behavior.
- [Electron release timeline/support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines) and [Electron Releases](https://releases.electronjs.org/) — latest stable and supported majors. Release listing showed Electron 45.0.0 (2026-10-20) on the research date.
- [Electron security tutorial](https://www.electronjs.org/docs/latest/tutorial/security), [process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [screen API](https://www.electronjs.org/docs/latest/api/screen), and [BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window) — renderer isolation, preload, multiple displays, and window behavior.
- [Electron packaging tutorial](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging), [Electron Forge](https://www.electronforge.io/), [Squirrel.Windows maker](https://www.electronforge.io/config/makers/squirrel.windows), [Forge macOS signing](https://www.electronforge.io/guides/code-signing/code-signing-macos) — packaging outputs, makers, signing and notarization.
- [React versions](https://react.dev/versions), [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2), and [React: build from scratch](https://react.dev/learn/build-a-react-app-from-scratch) — current React generation and Vite recommendation.
- [TypeScript 5.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) — current stable language/compiler line verified in official docs.
- [Vite Getting Started](https://vite.dev/guide/) — React TypeScript template and static build tooling.
- [Microsoft.Data.Sqlite overview](https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/) — supported provider choice.
- [ASP.NET Core SignalR overview, .NET 10](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction?view=aspnetcore-10.0) and [JavaScript client](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0) — realtime functionality and client package.
- [PixiJS v8 renderer guide](https://pixijs.com/8.x/guides/components/renderers) and [PixiJS June 2026 update](https://pixijs.com/blog/june-2026) — WebGL recommendation and version line.

## Confidence

**MEDIUM overall.** Core technology decisions and .NET/Electron/Pixi behavior are supported by current official project documentation; search surfaced the official sources and current release pages. Exact patch versions for most npm and NuGet packages should be re-resolved at project bootstrap, and Windows/macOS packaging, native SQLite loading, and real multi-display behavior require smoke tests on actual target systems. The initial Context7 MCP connection was quota-limited; after the user's new key was configured, an authenticated Context7 search confirmed Electron's current main-process display enumeration and hot-plug event APIs.

## Package Legitimacy Audit

Phase 1's npm package audit was run with the GSD package-legitimacy gate on 2026-10-28. Nine selected packages—`electron`, `vite`, `react`, `react-dom`, `@vitejs/plugin-react`, `@types/node`, and the Electron Forge CLI/Squirrel/ZIP maker packages—received `[SUS]` only because their latest versions were very recently published, despite high weekly download counts and matching upstream repositories. `electron-builder` was also `[SUS]` due to recency, but is explicitly excluded and must not be installed. The gate reported `typescript`, `@types/react`, and `@types/react-dom` as `OK`. No declared postinstall scripts were found, and no package was `[SLOP]`. Before installing each selected `[SUS]` package, include an individual blocking human verification checkpoint; full version/date/download/repository evidence is in `.planning/phases/01-safe-two-screen-scene-presentation/01-RESEARCH.md`.
