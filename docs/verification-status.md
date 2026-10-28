# Phase 1 verification status

Evidence recorded for the current Windows host after the integration corrections described below. These results are not equivalent to physical multi-monitor or macOS acceptance.

| Check | Result | Scope / caveat |
|---|---|---|
| Node tests via `npm test` | **Passed: 8/8** | Built-in Node tests. |
| .NET tests via `npm test` | **Passed: 5/5** | Correct project: `src/backend.tests/DungeonDeputy.Api.Tests.csproj`. |
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

Tests were rerun after these corrections. No new npm dependencies were added.

## Acceptance status

Automated and packaging checks pass for the scope above, but Phase 1 is **awaiting human review**, not approved. The physical Windows display workflow and macOS remain unverified. Review the [demo checklist](phase-1-demo.md), then explicitly approve Phase 1 or report defects before any Phase 2 work.
