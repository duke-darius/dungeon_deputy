# Phase 1 verification status

Evidence recorded for the current Windows host after the integration corrections described below. These results are not equivalent to physical multi-monitor or macOS acceptance.

| Check | Result | Scope / caveat |
|---|---|---|
| Node tests via `npm test` | **Passed: 10/10** | Built-in Node tests, including fullscreen stability on scene changes. |
| .NET tests via `npm test` | **Passed: 6/6** | Correct project: `src/backend.tests/DungeonDeputy.Api.Tests.csproj`; includes per-run token enforcement for `/health`. |
| Standalone .NET test command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Exact test project; do not use `src/backend/DungeonDeputy.Api.csproj` as the test project. |
| `npm run build` | **Passed** | Frontend, Electron, and backend build. |
| `npm run package:backend -- win-x64` | **Passed** | Self-contained Windows x64 backend publish. |
| `npm run package:smoke` | **Passed on Windows** | Packages resources and probes the backend. Not a physical second-display test. |
| Browser accessibility snapshot | **Observed** | Dashboard content present; no console errors after graceful API fallback. |
| Browser screenshot | **Unavailable** | Screenshot tool required a visible desktop tab; no screenshot captured. |
| Physical HDMI / second-display flow | **Unverified** | No physical hot-plug or second-display workflow performed. |
| macOS x64 | **Unverified** | Packaging/platform/hardware not tested. |
| macOS arm64 | **Unverified** | Packaging/platform/hardware not tested. |

## Integration corrections included in the tested state

- Kept the fallback public window frameable/windowed.
- Excluded the primary monitor from the external-display selector.
- Blacked out public output when the selected monitor changes.
- Protected the health endpoint with the backend token.
- Refreshed the display list in the dashboard.
- Compiled the sandboxed Electron preload as CommonJS `.cjs` and verified the emitted runtime file before launch/package.
- Limited fullscreen repositioning to actual display-topology changes; scene selection and blackout no longer trigger fullscreen toggles or window recreation.
- Reapplied bounds on same-display metrics changes without leaving fullscreen.

Tests were rerun after these corrections. No new npm dependencies were added.

## Acceptance status

**Phase 1 approved by the user on 2026-10-28.** This approval completes the review checkpoint and authorizes proceeding to Phase 2 planning/implementation. It does not change the evidence above: physical HDMI/second-display hot-plug behavior and macOS x64/arm64 remain unverified, and no such tests are claimed.
