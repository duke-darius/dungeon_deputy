---
phase: 03-fog-of-war-and-encounter-control
plan: 05
subsystem: api
tags: [electron, raster, png, fog-of-war, csp, privacy]
requires:
  - phase: 03-fog-of-war-and-encounter-control
    provides: Persisted fog strokes, token visibility, authenticated map publication, and scene renderer
provides:
  - Trusted DM-side PNG raster publication with opaque unrevealed pixels
  - Backend persisted imageData with bounded PNG checks and exact public visible-token DTO
  - Public renderer that consumes PNG data only, CSP source denial, package-smoke and Electron E2E privacy evidence
affects: [03-06, public-renderer, map-publication]
actuals:
  tokens: 14628
  tasks: 2
  commits: 3
commits: 3
plan_head_before: 7293533ac54e0aef387f9701ac8164c4e8e4e649
plan_head_after: b7dda1dfd6b4b8f1b5877be4788946165b4ff138
tech-stack:
  added: []
  patterns: [DM-side Canvas raster to bounded PNG data URL, persist-before-presentation mutation, restrictive public CSP with data-only images]
key-files:
  created: []
  modified: [src/renderer/src/map/MapCanvas.tsx, src/renderer/src/map/MapEditor.tsx, src/renderer/src/api.ts, src/renderer/src/contracts.mjs, src/renderer/src/contracts.d.mts, src/renderer/src/contracts.test.mjs, src/renderer/src/PublicDisplay.tsx, src/renderer/public.html, src/backend/Maps/MapService.cs, src/backend/PresentationState.cs, src/backend/Program.cs, src/backend.tests/MapApiTests.cs, scripts/e2e.mjs, scripts/package-smoke.mjs, .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md]
key-decisions:
  - "Treat rasterized PNG imageData as the only map terrain crossing to the public renderer; ordered fog operations and source identity stay DM-side."
  - "Keep public CSP data-image-only and embed allowed scene illustrations as data URLs so existing scene presentation remains functional."
patterns-established:
  - "Authenticated publication stores and validates the sanitized PNG before updating in-memory PresentationState."
  - "Public map projection is Mode/Id/ImageData/Tokens; each token is exactly id,name,kind,color,x,y,artwork."
requirements-completed: [ENCT-01, ENCT-03]
coverage:
  - id: D1
    description: Trusted raster and persistence boundary prevent source terrain and raw fog strokes from crossing into the public API.
    requirement: ENCT-01
    verification:
      - kind: integration
        ref: dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release
        status: pass
      - kind: unit
        ref: npm test
        status: pass
    human_judgment: false
  - id: D2
    description: Public renderer cannot retrieve source terrain and displays sanitized pixels, with opaque black outside reveal regions.
    requirement: ENCT-03
    verification:
      - kind: integration
        ref: npm run package:smoke
        status: pass
      - kind: e2e
        ref: artifacts/e2e/2026-10-29T20-49-34.076Z-cb4fa745/screenshots/06b-fog-encounter-published-player.png
        status: pass
    human_judgment: false
duration: 30min
completed: 2026-10-29
status: complete
---

# Phase 03 Plan 05: Sanitized Public Map Raster Summary

**Trusted DM-side Canvas rasterization now publishes bounded PNG imageData, while public clients receive only the sanitized raster and allowlisted visible-token DTO under a source-denying CSP.**

## Performance

- **Duration:** 30 min (approximate; execution started before the first recorded E2E run)
- **Started:** 2026-10-29T20:20:00Z
- **Completed:** 2026-10-29T20:50:37Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added trusted Canvas rasterization of bundled tavern terrain with ordered fog operations baked into opaque black unrevealed pixels; authenticated publication persists PNG imageData before presentation state changes.
- Added bounded server PNG data-URL/size/dimension checks and reduced the public map contract to imageData plus exact visible-token fields; startup stays black until explicit Show.
- Removed public source-terrain and fog-operation rendering. Public CSP blocks same-origin image/fetch, frames, and objects while preserving approved scene/token art as data URIs.
- Added package smoke and Electron E2E assertions for valid PNG publication, strict DTO privacy, source fetch/image denial, cold-start black, and revealed versus unrevealed pixels.

## Task Commits

1. Task 1: Publish trusted sanitized raster through authoritative persistence — c1f833b (fix).
2. Task 2: Prove public source denial and raster privacy in smoke and E2E — 7a2061a (test).
3. Task 1 follow-up: Render only sanitized public images — b7dda1d (fix; scene data-URI preservation under the restrictive CSP).

Plan metadata: final documentation commit records this summary and STATE/ROADMAP updates.

## Files Created/Modified

- src/renderer/src/map/MapCanvas.tsx — Rasterizes trusted source terrain and ordered fog to PNG.
- src/renderer/src/map/MapEditor.tsx and src/renderer/src/api.ts — Publishes imageData through authenticated Show/fog/visibility flows.
- src/backend/Maps/MapService.cs, src/backend/Program.cs, src/backend/PresentationState.cs — Validates and persists raster before public-state mutation; projects only safe DTO.
- src/renderer/src/contracts.mjs, contracts.d.mts, contracts.test.mjs and PublicDisplay.tsx — Exact contract validation and PNG-only rendering.
- src/backend.tests/MapApiTests.cs — PNG validation, persistence, privacy, and cold-start assertions.
- src/renderer/public.html, scripts/package-smoke.mjs and scripts/e2e.mjs — Public CSP and regression evidence.
- .planning/phases/03-fog-of-war-and-encounter-control/03-VALIDATION.md — Per-command validation rows and pending-row evidence note.

## Decisions Made

- Keep source artwork and raw fog state on the trusted DM side; only sanitized PNG and visible token DTO cross to public clients.
- Deny public same-origin image and network access; bundle approved scene illustrations as data URIs to retain existing scene behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. Rule 2 — Embed public scene illustrations as data URLs under the stricter CSP.**
- Found during: Task 2.
- Issue: The required data-only image CSP also blocked existing same-origin scene illustrations.
- Fix: Embedded the three approved scene SVGs as data URLs; no source map art is loaded by the public renderer.
- Files modified: src/renderer/src/PublicDisplay.tsx.
- Verification: npm run build, npm run package:smoke, and npm run test:e2e passed.
- Committed in: b7dda1d (supplemental Task 1 fix).

**2. Task 2 E2E harness submits a trusted fixture raster after direct API fog setup.**
- Issue: Existing E2E set fog through a direct API call, bypassing the renderer gesture callback that regenerates imageData.
- Fix: The Electron DM page creates a source-derived raster with a known reveal region and sends it through the authenticated publication endpoint; the public page verifies those pixels and DTO privacy. Production Show and token-visibility flows also exercise the renderer raster helper.
- Files modified: scripts/e2e.mjs.
- Verification: npm run test:e2e passed.
- Committed in: 7a2061a.

Total deviations: 2 (1 Rule 2 adjustment; 1 test-harness adjustment). No packages added.

## Issues Encountered

- Initial E2E assertions expected same-origin scene SVG paths. Updated them for embedded data URIs while retaining scene presentation.
- Expected CSP denial diagnostics from deliberate source probes are excluded from unrelated renderer-error checks only after the probe asserts fetch and image loading are blocked.

## Verification

- npm test — passed: 28 Node tests and 20 xUnit tests.
- dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release — passed: 20 tests.
- npm run build — passed.
- npm run package:smoke — passed for win-x64 with a generated valid 1200x760 PNG fixture.
- npm run test:e2e — passed. Latest evidence: artifacts/e2e/2026-10-29T20-49-34.076Z-cb4fa745/ (paired screenshots, source denial diagnostics, and run.log). Existing screenshot evidence was preserved.

## Known Stubs

None.

## Next Phase Readiness

- CR-01 is closed; 03-06 can address the remaining canvas lifecycle and encounter editor review warnings.
- Physical display and macOS platform behavior remain unverified; automated E2E does not attest to hardware behavior.

## Self-Check: PASSED

- Task commits c1f833b, 7a2061a, and b7dda1d are ancestors of HEAD.
- All task files and commits were verified before the final documentation commit.

---
*Phase: 03-fog-of-war-and-encounter-control*
*Completed: 2026-10-29*
