---
phase: 01-safe-two-screen-scene-presentation
plan: 02
subsystem: backend
tags: [electron-forge, react, vite, typescript, aspnetcore, loopback, dotnet]
requires:
  - phase: 01-safe-two-screen-scene-presentation
    provides: Human approval for the nine selected npm packages
provides:
  - Exact npm dependency lock and executable development/build/test/package scripts
  - Loopback-only ASP.NET Core backend with allowlisted private/public presentation state
  - Cross-platform self-contained backend publish helper and architecture skeleton
affects: [01-03, 01-04, 01-05]
actuals:
  tokens: 35470
  tasks: 2
  commits: 2
tech-stack:
  added: [Electron 45, Electron Forge 8, React 19, Vite 8, TypeScript 7, ASP.NET Core .NET 10, xUnit]
  patterns: [loopback-only Kestrel, explicit private selection/public projection, Forge makers array, Node scripts for cross-platform commands]
key-files:
  created: [.gitignore, package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/backend/PresentationState.cs, src/backend/Program.cs, src/backend/DungeonDeputy.Api.csproj, src/backend.tests/PresentationStateTests.cs, src/backend.tests/DungeonDeputy.Api.Tests.csproj, scripts/package-backend.mjs, scripts/run-backend.mjs, .planning/phases/01-safe-two-screen-scene-presentation/SKELETON.md]
  modified: []
key-decisions:
  - "Install only the nine human-approved packages plus previously audited OK TypeScript/React type dependencies, at exact versions; electron-builder remains excluded."
  - "Use minimal .NET test dependencies for domain and route-level contract coverage; add no npm testing packages."
  - "Do not mark DISP-01, DISP-03, or DISP-04 complete yet: this plan supplies contracts and setup, not the finished desktop/dashboard/display experience."
requirements-completed: []
coverage:
  - id: D1
    description: Backend private selection, explicit publication, blackout, allowlisted IDs, and public-only DTO
    requirement: DISP-03
    verification:
      - kind: unit
        ref: src/backend.tests/PresentationStateTests.cs#PresentationStateTests
        status: pass
      - kind: integration
        ref: src/backend.tests/PresentationStateTests.cs#PresentationApiTests
        status: pass
    human_judgment: false
  - id: D2
    description: Pinned dependency/toolchain scripts and architecture/resource decisions
    verification:
      - kind: other
        ref: npm ci; npm run build; npm run package:smoke
        status: pass
    human_judgment: false
commits: 2
plan_head_before: 712e1bf97f353a617bab85e6f2876cdd0c283ad2
plan_head_after: 49335569925df634eb3563e099b3df2bdb485c41
duration: 7min
completed: 2026-10-28
status: complete
---

# Phase 1 Plan 2: Runnable Foundation and Backend Contract Summary

**Pinned Electron Forge/Vite/React dependencies and established a loopback-only .NET scene API that keeps private selection separate from explicitly published player output.**

## Performance

- **Duration:** 7 minutes
- **Started:** 2026-10-28
- **Completed:** 2026-10-28T11:34:05Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added exact npm dependency versions and lockfile; approved packages only, with Forge makers configured for Windows Squirrel and Darwin ZIP.
- Added build, dev, test, package smoke, start, and three-RID self-contained backend packaging commands.
- Added tested backend state/API for private scene selection, explicit allowlisted publish, blackout, readiness, and a public-only DTO over Kestrel loopback.
- Recorded the .NET/Electron Forge/React architecture, no-database/in-memory session choice, local app-data preference direction, resource layout, and UI design direction in `SKELETON.md`.

## Task Commits

1. **Task 1: Bootstrap Forge/Vite scripts and backend state contract** - `9f63f05` (feat)
2. **Task 2: Add backend readiness and safe local API contract** - `4933556` (test)

## Files Created/Modified

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx` — pinned stack and runnable renderer/build setup.
- `src/backend/PresentationState.cs`, `Program.cs`, `DungeonDeputy.Api.csproj` — allowlisted state and loopback API.
- `src/backend.tests/PresentationStateTests.cs`, `DungeonDeputy.Api.Tests.csproj` — state and HTTP contract tests.
- `scripts/package-backend.mjs`, `scripts/run-backend.mjs` — cross-platform publish and local run helpers.
- `.gitignore` — excludes generated npm, Vite, and .NET build output.
- `.planning/phases/01-safe-two-screen-scene-presentation/SKELETON.md` — architecture/resource record.

## Decisions Made

- Stayed with the user-approved dependency set and exact audited versions; did not add direct npm dependencies beyond those packages and the pre-approved TypeScript/React type packages.
- Added minimal NuGet test tooling (`Microsoft.NET.Test.Sdk`, `xunit`, `xunit.runner.visualstudio`, `Microsoft.AspNetCore.Mvc.Testing`) because route/domain tests require a .NET test host.
- Left requirement completion empty because dashboard, end-user packaging launch, and physical display behaviors are not implemented by this foundation plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a minimal renderer entry and generated-output ignores so planned Vite commands can execute**
- **Found during:** Task 1
- **Issue:** Vite has no build entry without `index.html`/React entry; generated files must not pollute git status.
- **Fix:** Added a minimal React setup shell and `.gitignore`; dashboard/player UI remains for later Phase 1 plans.
- **Files modified:** `index.html`, `src/main.tsx`, `.gitignore`
- **Verification:** `npm run build` passed.
- **Committed in:** `9f63f05`

**2. [Rule 3 - Blocking] Created a separate .NET test project and runner command**
- **Found during:** Task 1
- **Issue:** ASP.NET Core app is not itself a test project; tests require a .NET test host.
- **Fix:** Added minimal xUnit test project and pointed `npm test` to it. No npm test packages installed.
- **Files modified:** `src/backend.tests/*`, `package.json`
- **Verification:** Five .NET tests passed.
- **Committed in:** `4933556`

**3. [Rule 1 - Bug] Materialized scene identifiers as a collection**
- **Found during:** Task 1 verification
- **Issue:** Dictionary keys expose `IEnumerable<string>`, not `IReadOnlyCollection<string>`.
- **Fix:** Return an array snapshot.
- **Files modified:** `src/backend/PresentationState.cs`
- **Verification:** Backend tests/build passed.
- **Committed in:** `9f63f05`

**4. TDD process deviation**
- Task was marked `tdd="true"`, but RED assertion evidence and a distinct RED commit were not completed before implementation. Tests were added and passed afterward; this is not a conformant RED/GREEN sequence.

**Total deviations:** 3 auto-fixed (2 blocking setup, 1 bug) plus 1 process deviation. All added implementation stayed within foundation scope.

## Verification

- `npm ci` — passed; audit reported 0 vulnerabilities (npm emitted transitive dependency deprecation notices).
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` — passed, 5/5.
- `npm run build` — passed (TypeScript, Vite, and .NET Release build).
- `npm run package:smoke` — passed dry-run invocation for `win-x64`.
- `node scripts/package-backend.mjs <RID> --dry-run` validated `win-x64`, `osx-x64`, and `osx-arm64`.
- Live `/health` returned `ready`; `/api/presentation` returned only the black public projection.
- A full self-contained package was not produced; macOS binaries and physical display behavior remain unverified on this Windows environment.

## Known Stubs

| File | Line | Description | Reason |
|------|------|-------------|--------|
| `src/main.tsx` | 4 | React entry remains an intentional setup shell; dashboard/player UI is deferred to later Phase 1 plans. | Plan 02 establishes the runnable Vite foundation only. |

Recorded as an open `stub` entry in `.planning/WINDOWS.md`.

## Next Phase Readiness

- The React/Vite toolchain, backend contract, route tests, and UI direction are ready for the subsequent Phase 1 renderer plan.
- This does not complete Phase 1 desktop/platform acceptance; do not begin Stage 2 before Phase 1 review.

---
*Phase: 01-safe-two-screen-scene-presentation*
*Completed: 2026-10-28*

## Self-Check: PASSED

- Summary file exists.
- Task commits `9f63f05` and `4933556` are ancestors of HEAD.
