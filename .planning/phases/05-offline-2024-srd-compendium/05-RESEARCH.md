# Phase 5: Offline 2024 SRD Compendium — Research

**Researched:** 2026-10-31
**Domain:** Licensed tabletop rules data, offline data ingestion, local search, encounter integration
**Confidence:** HIGH for source/license direction; LOW for record coverage until individual entries are reviewed.

## Summary

Use only the official English **SRD 5.2.1** PDF and content verified directly against it. The upstream 5e-bits API/data repository is excluded entirely: its data README identifies the underlying content as OGL 1.0a, so neither structured API output nor repository-derived records may be acquired, transformed, or bundled. The official PDF is directly licensed CC-BY-4.0 and supplies the required exact attribution. Label only individually PDF-verified records SRD 5.2.1; do not make broad completeness or parity claims. Pin the exact PDF SHA-256, and retain record-level page/section citations, trace/hash evidence, transformation/modification notes, and known gaps. [VERIFIED BY USER: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf; official PDF attribution and CC-BY-4.0 license]

The PDF is the sole content source. Create a small curated structured JSON subset through manual, reviewed extraction or deterministic local PDF extraction tooling; preserve direct source citations and record-level PDF SHA-256 traceability. Store source/license/attribution, modifications, and gaps in the manifest. Never silently fill source gaps with remembered rules, model-generated rules, or OGL repository data.

The app already has an authenticated loopback ASP.NET API and a DM-only encounter inspector with token-backed actors. Keep compendium records read-only and separate from encounter/session state. Adding a monster should be an explicit DM action that copies only its display name and stat fields into the private encounter actor model and optionally creates a map token; it must not publish monster data, reveal hidden actors, or alter the public presentation projection. [VERIFIED: src/backend/Program.cs:15-20,91-106; src/backend/Encounters/EncounterService.cs:20-36,49-61; src/renderer/src/map/MapEditor.tsx:344-362]

**Primary recommendation:** Pin the official PDF by exact SHA-256, create a reviewable curated JSON subset, and bundle only records individually verified against that PDF. A real, genuine record in each of seven required categories (spells, conditions, actions, monsters, equipment, classes, species) is a hard completion gate. Search remains offline and all coverage claims describe only the reviewed subset.

## User Constraints

No Phase 5 CONTEXT.md was present at research time. Requirements and roadmap are listed below as the controlling constraints.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRD-01 | Bundle searchable offline 2024 SRD-family data for supported spells, conditions, actions, monsters, equipment, and key class/species definitions. | Pin structured source data; category-aware normalized records; bundled static dataset and local search. |
| SRD-02 | Each imported dataset records version, attribution, license, and provenance; exclude non-SRD and report missing data rather than fabricate. | Store manifest, hashes, exact source references and explicit coverage/missing-data records; compare to official SRD. |
| SRD-03 | DM can open compendium details and add an SRD monster, with stat information, to current encounter. | DM-only details UI and explicit private actor creation with monster reference and copied stats. |

## Source Choice, Coverage, and Legal Provenance

### Recommended source workflow

1. Use the official [D&D Beyond SRD page](https://www.dndbeyond.com/srd) to fetch and pin **SRD v5.2.1 English PDF** (published May 1, 2025 according to the page at research time). That page states the SRD is content creators may use under Creative Commons and publishes current/previous release links. [CITED: https://www.dndbeyond.com/srd]
2. Use the official PDF at `https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf` as the exclusive content source. Store a local pinned copy for repeatable extraction; calculate and record its exact SHA-256 before creating records.
3. Manually review each curated JSON record against the PDF, or use deterministic local extraction with human validation. Each record must identify source page and section and link to the exact PDF hash; include only facts faithfully supported by that citation. A record may be transformed into structured form, with the modification recorded.
4. Do not consume any 5e-bits repository/API data, including as extraction assistance or a comparison source. The repository data README explicitly says the underlying material is OGL 1.0a; that source is outside the allowed provenance chain.

Ship this exact attribution in `assets/srd/2024/attribution.md`: “This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.” Record the exact PDF URI and SHA-256, the structured-data modifications, and any omissions/gaps. Do not imply Wizards endorsement.

### Supported coverage — not completeness

| Category | Guidance |
|---|---|
| Spells | Curate only PDF-cited spell records; omit unsupported entries and record gaps. |
| Conditions | Curate PDF-cited condition text; the existing encounter condition catalog is not a source for rule text. [VERIFIED: src/backend/Encounters/EncounterService.cs:8-18] |
| Actions | Curate only PDF-cited actions and distinguish types only where the PDF supports the distinction. |
| Monsters | Curate PDF-cited stat information only. No claim of full SRD or Monster Manual coverage. |
| Equipment | Curate PDF-cited equipment only; do not infer from commercial product lists. |
| Class/species | Curate PDF-cited definitions and mark partial progression/options. This reference subset is not a character builder; Phase 6 owns calculations. |

The precise counts and completeness per category are intentionally not claimed. Every category must nevertheless contain at least one genuine record with direct PDF evidence before phase completion; absence in any category blocks Phase 5 and SRD-01. Never fabricate missing records.

### Important source caveat

Do not use any 5e-bits repository or API structured dataset: its data README states the underlying content is OGL 1.0a. The official PDF's CC-BY-4.0 license applies to content sourced directly from that PDF, not to that separate repository's dataset.

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|---|---|---|---|
| ASP.NET Core / .NET | Existing target `net10.0` | Read-only local compendium API, search validation, private monster-to-encounter command | Existing backend authority and offline packaging path. [VERIFIED: src/backend/DungeonDeputy.Api.csproj:1-5] |
| JSON | Curated records and manifest are JSON | Reviewed structured subset and offline dataset | Plain JSON keeps MVP no-migration and dependency footprint low. |
| React + TypeScript | Existing app stack | DM search/results/details UI | Existing DM workspace is React and already hosts encounter inspector. [VERIFIED: src/renderer/src/App.tsx:1-5; src/renderer/src/map/MapEditor.tsx:12-25] |

No new dependency is necessary for a first bounded subset. Prefer a small importer using the runtime already available in the repo/build. If dataset size or search profiling later justifies SQLite FTS, use the existing `Microsoft.Data.Sqlite` reference rather than introducing a second storage system; keep that as measured optimization, not a requirement. [VERIFIED: src/backend/DungeonDeputy.Api.csproj:7-9]

### Suggested bundled layout

```text
assets/srd/2024/
  source/SRD_CC_v5.2.1.pdf   # official source pinned by SHA-256
  manifest.json              # release, PDF hash, license, citation policy, modifications
  attribution.md             # exact official attribution and modification notice
  records.json               # small reviewed JSON subset with record-level citations/hashes
  coverage.json              # category minimums, known gaps and explicit availability
```

Ship data as application resources, not under the writable per-user campaign data directory. Resolve its location from packaged app resources and test packaged Windows/macOS builds. Keep source snapshots distinct from generated output, so every output is reproducible from reviewed inputs. [ASSUMED]

## Architecture Patterns

### Data pipeline

```text
Pinned official SRD 5.2.1 PDF + SHA-256 ──manual review / deterministic local extraction
                                               └─ curated record JSON with page/section citation
                                                          v
                                           deterministic validation + manifest/coverage
                                                          v
Packaged backend static catalog ──authenticated loopback──> DM search/detail UI
                                                          |
                              explicit Add monster ──> private encounter state
                                                          └─> optional map token after DM confirmation

Public player window <── approved presentation projection only (no catalog/encounter data)
```

### Record model and safe search

Use a stable internal record envelope, adapting fields only when evidence supports them:

```json
{
  "id": "source-stable-id",
  "category": "monster",
  "name": "Source name",
  "summary": "Plain text excerpt or structured source summary",
  "details": {},
  "provenance": {
    "dataset": "SRD 5.2.1 (individually PDF-verified subset)",
    "sourceRef": "PDF page and section",
    "sourceHash": "sha256:<pinned PDF hash>",
    "license": "CC-BY-4.0"
  }
}
```

The record envelope is illustrative. Keep schema version separate from ruleset version; each record carries its exact PDF page/section citation and PDF SHA-256. Preserve only structured values directly supported by the cited text. Treat descriptions as data, render escaped text, bound query length/result count, and whitelist category filters. [ASSUMED]

For initial data volume, load a bundled JSON index once in backend and do case-insensitive normalized substring/prefix search with bounded pagination; provide search/category filters and detail selection. Benchmark before choosing SQLite FTS. Never query a remote API in renderer or backend. [ASSUMED]

### Monster-to-encounter linking

Current encounter actor state is a private SQLite JSON document keyed to map token IDs and only accepts actor conditions/HP/initiative today. [VERIFIED: src/backend/Encounters/EncounterService.cs:20-36,54-60,72-80] Add an explicit operation that (a) validates a monster record ID against the bundled catalog, (b) asks the DM for confirmation/quantity and placement if token creation is desired, (c) creates a private actor with catalog reference and initial HP/max HP copied from verified record values, (d) optionally creates corresponding map token through existing map service, and (e) handles failure atomically or rolls back/repairs partial side effects. Avoid storing entire duplicate stat block when a stable bundled record reference suffices; retain snapshot-critical identity/version so future dataset updates do not silently rewrite an active encounter. [ASSUMED]

Do not touch public contracts/routes or presentation state for this action. Current presentation endpoint is an allowlisted public projection, while encounter endpoints require the backend auth middleware; regression tests already assert public output omits initiative and current HP. [VERIFIED: src/backend/Program.cs:23-38,91-106; src/backend.tests/EncounterApiTests.cs:18-20,74-75]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Licensed source content | Model-generated rules or content from third-party datasets | Official PDF with human-reviewed manual extraction or deterministic local extraction | Prevent fabricated rules and exclude OGL repository material. |
| License attribution | Informal one-line credit without source/revision | Exact SRD-provided attribution, CC-BY-4.0 link, source URI, modifications/version manifest | Attribution and modification notices are license obligations. [CITED: https://creativecommons.org/licenses/by/4.0/legalcode] |
| Data truth / coverage | Assume the curated subset is exhaustive | Record-level PDF citation plus explicit coverage report | Each record is individually verified; the subset makes no completeness claim. |
| Public/private safety | Reuse public presentation DTO for compendium/encounter | Existing authenticated private API and explicit public projection boundary | Table display must receive only approved visuals. [VERIFIED: src/backend/Program.cs:23-38] |

## Common Pitfalls

1. **Unsupported release label.** A record may carry the 5.2.1 label only after direct verification against the pinned official PDF.
2. **OGL source contamination.** Never use 5e-bits data/API or derived records; its data README says underlying material is OGL 1.0a.
3. **False completeness.** Explicitly document unreviewed/missing entries and block unsupported additions; no completeness claims are allowed.
4. **Non-deterministic imports.** Downloading mutable data on every ordinary build can alter the shipped game without review. Pin the official PDF hash; import must be offline and repeatable from that input. [ASSUMED]
5. **Narrative injection/XSS from licensed text.** License does not make strings safe as HTML or instructions. Escape/render as text, bound payloads, and never execute imported content. [ASSUMED]
6. **Monster duplicate identity or public leak.** Monster entry should remain distinct from a map token ID; adding a creature must only mutate private encounter/map state after explicit action. Test public presentation continues to omit private encounter fields. [VERIFIED: src/backend.tests/EncounterApiTests.cs:74-75]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Node built-in test runner + xUnit (.NET) |
| Config file | `src/backend.tests/DungeonDeputy.Api.Tests.csproj`; no separate JS test config required for Node tests |
| Quick run command | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` |
| Full suite command | `npm test` |

Existing test script runs Node tests and backend xUnit tests. [VERIFIED: package.json:12-13]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| SRD-01 | Bundled records searchable offline across supported categories; query filters/bounds and details work | Unit/API integration + packaged smoke | `npm test` plus offline package smoke | Wave 0 needed for catalog/search tests |
| SRD-02 | Manifest has exact release/source/hash/license/attribution; importer rejects unapproved/non-SRD records and reports gaps | Importer deterministic test + fixture validation | `npm test` plus importer check command | Wave 0 needed |
| SRD-03 | Explicit monster addition validates ID, preserves HP/stat reference and is durable/private; public payload unchanged | Backend API integration | `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` | Existing encounter test suite; add relevant cases |

### Wave 0 Gaps

- [ ] Add pinned source JSON fixture(s) and manifest/coverage artifact after licensing review.
- [ ] Add importer validation command and deterministic-output test (same sources -> same hash/output).
- [ ] Add catalog API/UI search/detail tests, including empty/missing-data and malicious-text cases.
- [ ] Add monster-to-encounter tests for invalid IDs, valid stats, persistence, duplicate attempts, rollback, and no public-state leakage.
- [ ] Add a packaged-offline acceptance check that disconnects network (or denies outbound requests) and searches a spell/condition/monster/item.

## Security Domain

No new package is recommended. Keep the existing local API auth and loopback-only listener; all source records are untrusted text despite licensed provenance. Apply input bounds for search/IDs, safe JSON deserialization limits, output size limits, HTML escaping and tests that DM-only monster/encounter data never appears in public presentation. [VERIFIED: src/backend/Program.cs:15-33]

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | Yes | Existing token-authenticated local private API; avoid weakening middleware. |
| V3 Session Management | No new web sessions | Keep local token lifecycle separate from compendium data. |
| V4 Access Control | Yes | Authenticated DM-only catalog and encounter routes; public projection remains allowlisted. |
| V5 Input Validation | Yes | Bound query/category/record IDs; strict source schema validation and escaped text. |
| V6 Cryptography | Yes, narrowly | SHA-256 for build provenance/checksums, not as a substitute for source trust. |

## Environment Availability

No extra runtime service or network dependency is permitted. Build-time source acquisition may need internet, but it must not be required for normal build from checked-in pinned source or for installed-app runtime. Validation commands already present: `npm test`; `npm run build` (check project environment before execution). [VERIFIED: package.json:11-13]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Bundle normalized JSON first; defer SQLite FTS unless measured data size warrants it. | Standard Stack | Search performance or memory may require a different storage/index plan. |
| A2 | Local PDF extraction tooling may be available; manual reviewed extraction is also acceptable. | Source workflow | Choose based on installed tooling without adding an unapproved external dependency. |
| A3 | Shipped data belongs under packaged app resources and is suitable as static immutable data. | Suggested layout | Forge resource inclusion/path behavior needs package smoke validation. |
| A4 | A backend API route is the best integration seam for catalog/search and monster-add, not renderer-local data mutation. | Architecture | If app composition demands another seam, retain backend authority/privacy invariants. |

## Open Questions — Resolved Decisions and Execution Gates

1. **Exact source release — resolved:** The official English SRD 5.2.1 PDF is the sole content source. Only directly verified records may carry the 5.2.1 label; no broad completeness claim is made.
2. **Monster actor schema — resolved decision / execution gate:** Before implementation, inspect the current `EncounterService` actor model, persistence contract, and API tests; integrate against that observed contract rather than assumed fields. Preserve the source record ID/version and verified encounter-critical stat snapshot so catalog updates cannot silently rewrite active actors. Plan 05-01 and 05-04 require this inspection before integration.
3. **Source redistribution — resolved:** Source only from the official PDF licensed CC-BY-4.0; ship its exact attribution, source URI, PDF SHA-256, modifications, and known gaps. Exclude all 5e-bits dataset/API content.

## Sources

### Primary / authoritative

- [Official D&D SRD page](https://www.dndbeyond.com/srd) — English SRD 5.2.1 release, version history, CC-BY information, content exclusions/changes.
- [Official SRD 5.2.1 PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) — exclusive content source; CC-BY-4.0 and exact attribution verified by user.
- [Creative Commons Attribution 4.0 legal code](https://creativecommons.org/licenses/by/4.0/legalcode) — attribution, source URI, modifications, license-link requirements.
- [5e-bits data repository](https://github.com/5e-bits/5e-srd-api) — exclusion evidence: its data README identifies underlying content as OGL 1.0a.
- Repository source files read this session: `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/config.json`, `tabletop_dm_gsd_brief.md`, `src/backend/Program.cs`, `src/backend/Encounters/EncounterService.cs`, `src/backend.tests/EncounterApiTests.cs`, `src/backend.tests/EncounterServiceTests.cs`, `src/renderer/src/App.tsx`, `src/renderer/src/api.ts`, `src/renderer/src/map/MapEditor.tsx`, `src/backend/DungeonDeputy.Api.csproj`, `package.json`, `.planning/phases/04-soundboard-scenes-and-12-key-control/04-UI-SPEC.md`.

## Metadata

**Confidence breakdown:**
- Source/license direction: HIGH for using the directly CC-BY-4.0 official PDF; no legal opinion and no full record review performed.
- Architecture: HIGH — grounded in current API, encounter service, tests, and approved UI contract.
- Coverage completeness: LOW — exact counts and v5.2.1 parity intentionally not asserted.

**Research date:** 2026-10-31
**Valid until:** 2026-11-30 (recheck upstream source status and current SRD version before import)
