---
phase: 07-optional-ai-preparation-and-map-proposals
plan: 02
subsystem: api
tags: [aspnetcore, ai-proposals, validation, srd]
requires:
  - phase: 07-01
    provides: Backend-only AI provider service and per-request consent boundary
provides:
  - Five typed, independently validated private AI proposal kinds
  - Closed schema enforcement, bounded map geometry and hostile JSON rejection
  - Canonical local selected-SRD reference resolution separated from narrative
affects: [07-03, 07-04, 07-05]
tech-stack:
  added: []
  patterns: [closed System.Text.Json DTOs, server-side proposal validation, catalog-backed provenance]
key-files:
  created:
    - src/backend/AiPreparation/ProposalValidator.cs
    - src/backend.tests/ProposalValidatorTests.cs
  modified:
    - src/backend/AiPreparation/AiContracts.cs
    - src/backend/AiPreparation/AiPreparationService.cs
    - src/backend/Program.cs
    - src/backend.tests/AiPreparationServiceTests.cs
decisions:
  - "Expose each proposal kind through a kind-scoped DM API path; reject kinds outside the five closed contracts."
  - "Provider reference IDs are accepted only when they match records selected from the local catalog; returned reference metadata is replaced with canonical selected-record data."
  - "Narrative/mechanics suggestions remain marked unverified; generated encounters contain no invented statistics."
metrics:
  duration: "approximately 20 minutes"
  completed: 2026-11-07
  status: complete
actuals:
  tokens: 4400
  tasks: 2
  commits: 0
  plan_head_before: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
  plan_head_after: 83dc60eef2c049e0d2b193cf7045eb2184344e6b
requirements-completed: [AI-01]
---

# Phase 7 Plan 2: Bounded Proposal Contracts Summary

Five AI proposal kinds now have closed typed contracts, strict local validation, bounded geometry, and selected-catalog-only reference provenance before private preview.

## Accomplishments

- Added structured NPC, encounter, short-adventure, scene-description, and map-geometry proposal DTOs.
- Enforced unknown/duplicate-property rejection, bounded text/list sizes, finite in-map geometry, supported primitive kinds, and a 64 KiB proposal limit.
- Added kind-specific strict provider schemas and server-side semantic validation before results leave the provider service.
- Generation routes resolve only explicitly selected local SRD IDs. Model-authored citation IDs must correspond to those selected records; response references use canonical selected record names, excerpts, and provenance rather than model-supplied labels.
- Encounter ideas carry names/rationales and optional selected monster IDs, not generated combat statistics. All provider output remains transient and unverified; generation has no mutation path.

## Verification

- Test-first RED: focused validator test command initially failed because `ProposalValidator` did not yet exist.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter "FullyQualifiedName~ProposalValidatorTests|FullyQualifiedName~AiPreparationServiceTests"` - passed, 14 tests.
- `dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release` - passed, 90 tests.
- No real provider key, network call, or provider account was used.

## Deviations from Plan

None. User instruction prohibits commits; all existing unrelated working-tree changes were left untouched. No push was performed.

## Outstanding / Scope Notes

- AI-02 acceptance and revalidation of edited proposals remain for a later Phase 7 plan; this plan adds no acceptance or campaign mutation behavior.
- Phase 6 physical phone/operator UAT remains outstanding and is not verified by these tests. No Phase 6 or project-completion claim is made.
- STATE.md and roadmap counters were not altered; this execution was limited to Plan 07-02 and the requested summary, and the working tree already contained unrelated planning edits.

## Self-Check: PASSED

- `ProposalValidator.cs`, `ProposalValidatorTests.cs`, and this summary exist.
- Verification commands completed successfully (focused 14 tests; backend suite 90 tests).
- HEAD remained `83dc60eef2c049e0d2b193cf7045eb2184344e6b`; no commits or push were made as instructed.

---
*Phase: 07-optional-ai-preparation-and-map-proposals*
*Completed: 2026-11-07*
