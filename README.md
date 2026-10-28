# DungeonDeputy

DungeonDeputy is a local-first desktop app for keeping the Dungeon Master's controls private while showing only an explicitly approved scene on a player-facing display. Stage 1 provides the separate dashboard and public display, three bundled offline demo scenes, explicit scene publication, blackout, and a windowed fallback. Map editing and later-stage gameplay features are not part of this release.

## Requirements

- Windows x64 or macOS on a supported x64/arm64 host for development. macOS build targets are configured, but have not been verified on macOS.
- Node.js and npm (versions compatible with the lockfile and Electron 45).
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
npm run package:smoke
```

`npm test` runs the Node test suite and then the .NET integration tests. Exact standalone .NET test command:

```sh
dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
```

Do not substitute `src/backend/DungeonDeputy.Api.csproj`: that is the API application project, not the test project.

## Package and launch

First publish the backend for the current host as above, then create the Forge package:

```sh
npm run package
```

Forge places packaged artifacts under `out/make/` (Windows Squirrel installer output; macOS ZIP output). To launch the app from the repository using its generated Electron entrypoint, after backend publish/package preparation, run:

```sh
npm run start
```

For an installed package, launch it using the installer/application produced under `out/make/`. The Windows package smoke command builds the Electron and renderer assets, stages the Windows package resources, and starts/probes the packaged backend; it is not a physical display acceptance test.

## Stage 1 review

Follow [the demo checklist](docs/phase-1-demo.md), read [verification status](docs/verification-status.md) and [known limitations](docs/known-limitations.md), then provide explicit Phase 1 acceptance or report defects. Do not begin Stage 2 until that review is approved.
