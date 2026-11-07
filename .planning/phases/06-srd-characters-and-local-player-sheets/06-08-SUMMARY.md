---
phase: 06-srd-characters-and-local-player-sheets
plan: 08
subsystem: character-rules
tags: [srd-5.2.1, characters, xp, spell-slots, resources, tests]
requires:
  - phase: 06-07
    provides: Adversarial E2E harness and Phase 6 coverage audit
provides:
  - XP-derived Barbarian/Dwarf progression through level 20 with PB/HP/AC calculations
  - Canonical starting equipment packages, gold accounting, proficiencies, Rage and Stonecunning resources
  - Bounded level-1 Wizard/Dwarf spell-slot, spellbook-name, preparation, DC/attack and Arcane Recovery calculations
  - Persisted character resources, DM controls, direct PDF citations and expanded E2E coverage
affects: [CHAR-01, character-api, dm-workspace, player-sheets]
tech-stack:
  added: []
  patterns: [source-cited-closed-character-rules, xp-derived-progression, server-authoritative-resource-state]
key-decisions:
  - "Support only explicitly bounded Barbarian/Dwarf levels 1-20 and Wizard/Dwarf level 1; do not imply all SRD options or spell effects are automated."
  - "Selected spell names are bookkeeping only, checked against the pinned PDF Wizard Spell List at printed page 79; no descriptions/effects are imported."
  - "A Barbarian shield selection consumes 10 GP from starting currency; unsupported gear or insufficient funds is rejected."
  - "Wizard skill choices use the exact listed set; Nature is rejected for Wizard."
requirements-completed: [CHAR-01]
verification:
  - "dotnet test src/backend.tests/DungeonDeputy.Api.Tests.csproj -c Release --filter FullyQualifiedName~CharacterDomainTests|FullyQualifiedName~CharacterApiTests — 36 passed"
  - "npm test — 97 Node and 75 .NET tests passed"
  - "npm run build — passed, 0 warnings/errors"
  - "npm run test:e2e — passed at artifacts/e2e/2026-11-07T14-41-25.353Z-0f123491"
---

# Plan 06-08: Source-backed character rules expansion

Implemented the bounded rules subset and the tests-first plan. Character records now derive progression from total XP, apply source-cited ability/proficiency/HP/AC rules, retain only enumerated starting inventory, and persist resource/spell-slot values as server-authoritative state.

The Barbarian/Dwarf profile supports levels 1–20, XP/PB transitions, Dwarven Toughness, Unarmored Defense with optional trained shield, two starting packages, source-backed skill/save/weapon proficiency calculations, Rage recovery and Dwarf Stonecunning. Shield acquisition deducts its listed cost from starting gold.

The Wizard/Dwarf profile is level 1 only. It supports three curated cantrip IDs, six level-1 spell names in the book, four prepared selections, two level-1 slots, Intelligence spell save DC/attack bonus, long-rest slot recovery and one-slot Arcane Recovery after a short rest. Spell names are verified on the pinned PDF's Wizard Spell List (printed p. 79); the sheet imports no spell descriptions and simulates no spell effects. Wizard class skill options and save proficiencies are closed to the listed set.

## Verification

- Focused character domain/API tests: 36 passed.
- `npm test`: 97 Node tests and 75 .NET tests passed.
- `npm run build`: passed; backend reported 0 warnings and 0 errors.
- `npm run test:e2e`: passed at `artifacts/e2e/2026-11-07T14-41-25.353Z-0f123491`, including both bounded character profiles and persisted calculations.

CHAR-01 is now covered for the explicitly documented subset. CHAR-02..04 remain open pending physical two-phone/private-Wi-Fi and operator transport-risk acceptance; this automation does not claim physical device, firewall, TLS, macOS, or external-network verification. Phase 6 remains open.
