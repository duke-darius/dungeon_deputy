---
phase: "05"
slug: "offline-2024-srd-compendium"
status: planning-contract
---

# Phase 5 — UI Design Contract

## Design direction
Extend the existing DM dashboard/workspace, not the public renderer or a new window. Reuse Phase 4 ink/slate/chalk surfaces, restrained brass/teal accents, system body font and serif headings, visible focus, compact command-desk layout, and existing CSS only. No UI library or dependency. “Compendium · DM only” and a lock indicator remain visible.

## Layout and interaction
- Reach Compendium from existing DM workspace navigation; Battle map remains the default workspace.
- Provide category navigation for spells, conditions, actions, monsters, equipment, and class/species definitions, with category-specific supported/partial/unavailable status.
- Search is labelled, keyboard operable, bounded by API limits; results show name/category and a concise supported status. Selecting a result opens a detail pane with structured detail text plus source, upstream snapshot/release, official comparison status, license, attribution and modification information.
- Search results/details are immutable reference data. An explicit “Add to encounter” action is available only on supported monster records and requires deliberate confirmation. It creates a private encounter actor only; it must not add a map token or publish any state. Show authoritative save success/failure.
- Coverage messaging always says supported subset and exposes known omissions. Never say “complete SRD” unless separately verified and approved.

## States and accessibility
Cover loading, populated, empty query, unavailable category, no matching record, API failure, selected detail, Add pending/success/failure, and long text. Imported text is inert plain text; no HTML rendering, remote assets, or external content loads. All controls have semantic labels, keyboard access, visible focus and practical 44px targets; announce result and action state through an accessible status region. On narrow screens stack category/results/detail and scroll rather than clip.

## Privacy and safety
No compendium route/control is added to the player-facing renderer or preload. Do not use public presentation contracts for catalog or encounter data. Source references and legal links may be displayed as text; network is not needed to read records. Do not render arbitrary source URLs as auto-loaded links.
