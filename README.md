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

`npm run test:e2e` builds the Electron host, starts or safely reuses this project's Vite dashboard, and drives the actual Electron app plus its isolated packaged backend through Stage 1 scenes, Stage 2 map editing, and Stage 3 fog/encounter/privacy/restart flows. It uses the already-installed Electron runtime and `playwright-core` without browser downloads. Paired manager/player screenshots and the run log are written to ignored `artifacts/e2e/<run-id>/`; failures retain the bundle. E2E windows stay hidden/windowed so the test does not take over the desktop. Physical HDMI/fullscreen behavior still requires manual hardware review.

## Package and launch

First publish the backend for the current host as above, then create the Forge installer/package:

```sh
npm run package
```

Forge places packaged artifacts under `out/make/` (Windows Squirrel installer output; macOS ZIP output). Install and launch the generated artifact from there. `npm run start` is only a direct Electron development launch and expects the Vite dev server to already be running; use `npm run dev` for the complete development workflow.

For an installed package, launch it using the installer/application produced under `out/make/`. The Windows package smoke command builds the Electron and renderer assets, stages the Windows package resources, and starts/probes the packaged backend; it is not a physical display acceptance test.

## Optional AI preparation

AI preparation is optional and is not required for local campaign use. To enable the OpenAI Responses provider, set all three process environment variables before launching Electron (the model has no default):

```text
DUNGEON_DEPUTY_AI_ENABLED=1
OPENAI_API_KEY=<your key>
DUNGEON_DEPUTY_AI_MODEL=<supported model id>
```

The backend consumes the key; it is never entered in the renderer or saved in campaign data. AI status is local and does not contact the provider. Without the enable flag, key, model, or network connectivity, AI requests remain unavailable while local maps, encounters, compendium, characters, scenes, and display controls continue to work.

Each generation requires a fresh consent action. The prompt and only explicitly selected local SRD excerpts/provenance are sent to the configured provider. Never include player sheets, hidden map/fog state, encounter state, or other campaign secrets in the prompt. `store:false` disables Responses API application-state retention for that request; it does not prevent transmission, provider processing, abuse monitoring, or other retention under provider policy.

AI output is a private, editable proposal, not a rules authority. Acceptance is separate and revalidated. Only supported records in the local monster catalog can become encounter actors; current catalog coverage is limited, so do not assume arbitrary generated creatures are mechanically supported. Accepted tokens/geometry remain private until the DM separately uses Show.

Automated checks passed: `npm test` (102 Node and 99 .NET tests), `npm run build`, deterministic credential-free `npm run test:e2e`, and Windows x64 `npm run package:smoke`. E2E exercises the local fake provider and records no external requests. No live provider key, API call, model compatibility, or provider retention behavior has been verified. Phase 6 CHAR-02..04 physical phone/operator UAT remains outstanding. Physical HDMI/display behavior and macOS runtime remain unverified; see [Phase 7 verification](.planning/phases/07-optional-ai-preparation-and-map-proposals/07-VERIFICATION.md).

## Phase review

Phase 2 automated checks have passed, but the user visual-review/acceptance checkpoint remains pending; later Phase 3 and Phase 4 implementation is present in this repository and does not imply that review occurred. Run the [Phase 2 demo](docs/phase-2-demo.md), [Phase 3 demo](docs/phase-3-demo.md), [Phase 4 audio guide](docs/phase-4-audio.md), and read [verification status](docs/verification-status.md) plus [known limitations](docs/known-limitations.md). Physical HDMI/readability, native focus behavior, audible speaker output, untested codecs, and macOS runtime remain unverified.
