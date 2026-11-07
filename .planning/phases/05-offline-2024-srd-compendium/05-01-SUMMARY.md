---
phase: 05-offline-2024-srd-compendium
plan: 01
subsystem: srd-compendium
tags: [srd, provenance, offline, react, aspnet, sqlite]
requires:
  - phase: 03-fog-of-war-and-encounter-control
    provides: Private encounter persistence and allowlisted public projection
provides:
  - Official SRD 5.2.1 source pin and one reviewed Bandit record
  - Validated offline catalog and authenticated private monster-add API
  - DM-only compendium search, details, provenance, and encounter Add flow
affects: [phase-05, srd-catalog, encounters]
actuals:
  tokens: 17374
  tasks: 2
  commits: 0
commits: 0
plan_head_before: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
plan_head_after: e3de3a7eb15474cbfc3a092a5f2255c169e3da72
tech-stack:
  added: []
  patterns: [source-hash-pinned curated records, private stat snapshots, allowlisted public projection]
key-files:
  created: [assets/srd/2024/source/SRD_CC_v5.2.1.pdf, assets/srd/2024/records.json, assets/srd/2024/manifest.json, assets/srd/2024/attribution.md, assets/srd/2024/coverage.json, scripts/srd/import.mjs, scripts/srd/import.test.mjs, src/backend/Srd/SrdCatalog.cs, src/backend.tests/SrdCatalogTests.cs, src/renderer/src/compendium/Compendium.tsx, src/renderer/src/compendium/compendium.test.mjs]
  modified: [package.json, src/backend/DungeonDeputy.Api.csproj, src/backend/Encounters/EncounterService.cs, src/backend/Program.cs, src/renderer/src/api.ts, src/renderer/src/map/MapEditor.tsx]
decisions:
  - "Use only the official English SRD 5.2.1 CC-BY-4.0 PDF; do not consult or include 5e-bits data."
  - "Ship one directly verified Bandit record and explicitly report unsupported categories and unreviewed monsters as coverage gaps."
  - "Represent an added monster as a private encounter actor with source/version and copied stat snapshots, never as a map token."
  - "Do not create commits, preserving the user's explicit no-commit instruction and existing uncommitted work."
requirements-completed: [SRD-02, SRD-03]
coverage:
  - id: D1
    description: "Pinned official PDF provenance and validated the one curated record offline."
    requirement: SRD-02
    verification:
      - kind: unit
        ref: scripts/srd/import.test.mjs#pinned official PDF provenance and curated record validate deterministically offline
        status: pass
      - kind: other
        ref: "SHA-256: 8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87"
        status: pass
    human_judgment: true
    rationale: Record extraction and legal attribution were manually verified against the official PDF.
  - id: D2
    description: "Authenticated private catalog search and Add creates a durable stat-linked encounter actor without public/map exposure."
    requirement: SRD-03
    verification:
      - kind: integration
        ref: src/backend.tests/SrdCatalogTests.cs#SearchAndAddArePrivateDurableAndDoNotPublishEncounterData
        status: pass
    human_judgment: false
  - id: D3
    description: "Reachable DM-only compendium provides bounded search, details, provenance, and deliberate Add interaction."
    verification:
      - kind: unit
        ref: src/renderer/src/compendium/compendium.test.mjs
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
metrics:
  duration: 30min
  completed: 2026-10-31
status: complete
---

# Phase 5 Plan 1: Verified Monster Tracer Summary

**A source-hash-pinned official Bandit record now flows through an authenticated offline catalog into a private encounter actor, with a DM-only searchable compendium and no public or map-token exposure.**

## Performance

- **Duration:** approximately 30 minutes
- **Tasks:** 2/2
- **Files modified:** 17 plan implementation files (excluding this summary and pre-existing user changes)
- **Task commits:** none, as explicitly requested; no git history changes were made.

## Accomplishments

- Retrieved and pinned the official English SRD 5.2.1 PDF. SHA-256: `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`. License and attribution are recorded in the asset bundle.
- Curated one Bandit record against printed page 261, section “Monsters A–Z — Bandit.” Import validation checks PDF hash, release/license/source metadata, stable IDs, supported fields, and direct record provenance; coverage identifies omitted categories and unreviewed monster entries.
- Added authenticated catalog/search/detail and monster-add endpoints. Encounter adds retain `srd521:monster:bandit`, ruleset version, and copied HP/AC/ability snapshots in private persistence. They do not make map tokens.
- Added a reachable DM-only Compendium workspace with bounded search, text-only rendering, record details, source/license/hash citation, and explicit Add action.
- No package dependencies were added and no 5e-bits content was used.

## Files Created/Modified

- `assets/srd/2024/` — pinned source, reviewed record, manifest, attribution, and coverage gaps.
- `scripts/srd/import.mjs`, `scripts/srd/import.test.mjs` — offline bundle validation and tests.
- `src/backend/Srd/SrdCatalog.cs`, `src/backend/Program.cs` — validated catalog and authenticated endpoints.
- `src/backend/Encounters/EncounterService.cs` — private stat-linked actor snapshot persistence.
- `src/backend.tests/SrdCatalogTests.cs` — auth, persistence, invalid ID, no-token, and public-projection checks.
- `src/renderer/src/compendium/Compendium.tsx`, `compendium.test.mjs` — DM catalog UI and guard tests.
- `src/renderer/src/api.ts`, `src/renderer/src/map/MapEditor.tsx` — typed API methods and workspace navigation.
- `package.json`, `src/backend/DungeonDeputy.Api.csproj` — test inclusion and packaged record asset.

## Decisions Made

- The legal source is the official SRD 5.2.1 PDF under CC-BY-4.0, not a third-party data API.
- Only the reviewed Bandit is claimed as available; SRD-01's full requested category coverage remains unmet and is intentionally not marked complete.
- Preserve private/public separation by keeping catalog access behind authenticated private API middleware and adding no public DTO fields.
- No commits, per user instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test validity] Strengthened importer negative-test fixtures**
- **Found during:** Task 1
- **Issue:** The initial negative fixtures used invalid PDF bytes, so they could pass by failing the PDF-header check rather than exercising missing hash/citation and metadata validation.
- **Fix:** Use a valid PDF-shaped test buffer and assert each provenance/hash failure independently.
- **Files modified:** `scripts/srd/import.test.mjs`
- **Verification:** Importer tests pass and validate the curated pinned PDF.

**2. [Rule 2 - Validation] Require all supported monster stat fields and bounded attack strings**
- **Found during:** Task 1
- **Issue:** Import validation previously allowed absent encounter-relevant stats and malformed attack lists.
- **Fix:** Validate all current schema stats, ranges, attack list bounds/types, and nonempty modification provenance.
- **Files modified:** `scripts/srd/import.mjs`
- **Verification:** `npm test` passes.

**3. [Rule 3 - Test integration] Include the new test suites in the standard test command**
- **Found during:** Task 2
- **Issue:** Existing `npm test` did not execute the planned SRD importer tests or new compendium tests.
- **Fix:** Add the test file globs without adding dependencies.
- **Files modified:** `package.json`
- **Verification:** `npm test` reports 76 Node tests and 22 .NET tests passing.

### Scope/Process Deviation

- The prescribed per-task/final commits were intentionally omitted because the user explicitly prohibited commits. Existing Phase 4 and unrelated uncommitted work was left untouched.

## Verification Evidence

- `npm test` — PASS: 76 Node tests; 22 .NET tests passed, 0 failed.
- `npm run build` — PASS: TypeScript, Electron, Vite, and .NET Release build; 0 backend warnings/errors.
- `git diff --check` — PASS (only existing line-ending conversion warnings).
- Independent PDF SHA-256 — PASS: `8974902D109D6E63672D7C490BDE9CCF052410503D9CFA768237154FBC5E3D87`.
- Backend privacy test verifies missing auth is unauthorized, Add persists an actor, no `mapTokenId` is produced, public presentation omits source monster details, and invalid IDs are rejected.

## Known Stubs

None. Empty search results are an intentional coverage state; the UI explicitly states that unreviewed entries are unavailable.

## Remaining Requirement Gap

- **SRD-01 remains incomplete:** only one monster is bundled; spells, conditions, actions, equipment, classes, species, and unreviewed monsters remain gaps. No completeness claim is made. Later Phase 5 plans must expand only from verified, properly attributed source records.

## Self-Check: PASSED

- Summary exists at `.planning/phases/05-offline-2024-srd-compendium/05-01-SUMMARY.md`.
- Tests and production build passed; the PDF hash matches the manifest.
- No commits were made. Pre-existing Phase 4/UAT and unrelated user changes remain present.

---
*Phase: 05-offline-2024-srd-compendium*
*Completed: 2026-10-31*
