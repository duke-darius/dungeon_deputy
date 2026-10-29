# DungeonDeputy

DungeonDeputy is a local-first desktop app for keeping the Dungeon Master's controls private while showing only explicitly approved visuals on a player-facing display. Phase 2 adds a private tavern/blank map editor, grid and camera controls, editable tokens, explicit map publication, blackout, and per-user SQLite save/reload. Later-stage encounter features remain out of scope.

## Requirements

- Windows x64 or macOS on a supported x64/arm64 host for development. macOS build targets are configured, but have not been verified on macOS.
- Node.js 24 and npm 11 for the verified development setup (Node 24.11.1/npm 11.6.2 were used for the Windows checks).
- .NET 10 SDK for building/running backend development and backend tests. The packaged backend is self-contained and does not require users to install .NET.

## Install, build, run

From the repository root:

```sh
npm ci
npm run package:backend -- win-x64
npm run dev
```

`npm run package:backend` publishes the self-contained backend to `artifacts/backend-win-x64`. Use `osx-x64` or `osx-arm64` instead when packaging on the corresponding macOS host; those targets are configured, not verified here. `npm run dev` launches the Vite renderer and Electron host with the packaged backend. The bundled scene assets are local, so the demo does not need an internet connection.

Build and verify:

```sh
npm run build
npm test
npm run test:e2e
npm run package:smoke
```

`npm test` runs the Node test suite and then the .NET integration tests. Exact standalone .NET test command:

```sh
dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
```

Do not substitute `src/backend/DungeonDeputy.Api.csproj`: that is the API application project, not the test project.

`npm run test:e2e` builds the Electron host, starts or safely reuses this project's Vite dashboard, and drives the actual Electron app plus its isolated packaged backend through Stage 1 scene presentation and Stage 2 map editing/publication/restart flows. It uses the already-installed Electron runtime and `playwright-core` without browser downloads. Paired manager/player screenshots and the run log are written to ignored `artifacts/e2e/<run-id>/`; failures retain the bundle. E2E windows stay hidden/windowed so the test does not take over the desktop. Physical HDMI/fullscreen behavior still requires manual hardware review.

## Package and launch

First publish the backend for the current host as above, then create the Forge installer/package:

```sh
npm run package
```

Forge places packaged artifacts under `out/make/` (Windows Squirrel installer output; macOS ZIP output). Install and launch the generated artifact from there. `npm run start` is only a direct Electron development launch and expects the Vite dev server to already be running; use `npm run dev` for the complete development workflow.

For an installed package, launch it using the installer/application produced under `out/make/`. The Windows package smoke command builds the Electron and renderer assets, stages the Windows package resources, and starts/probes the packaged backend; it is not a physical display acceptance test.

## Phase 2 review

Follow [the Phase 2 demo checklist](docs/phase-2-demo.md), read [verification status](docs/verification-status.md) and [known limitations](docs/known-limitations.md), then provide explicit Phase 2 acceptance or report defects. Phase 3 has not started and must wait for this review.
