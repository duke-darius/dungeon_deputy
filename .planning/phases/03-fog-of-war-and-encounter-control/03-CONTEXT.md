# Phase 3: Fog of War and Encounter Control - Context

**Gathered:** 2026-10-29  
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Stage 3: let the DM run a short, basic encounter from the main dashboard by painting revealed and hidden map regions, managing private token visibility, tracking actor HP/conditions and initiative, advancing turns, and making simple dice rolls. The player display must show only revealed terrain and explicitly visible tokens. Preserve the existing separate DM/public window boundary, local/offline operation, map editing and persistence. Do not add line-of-sight/pathfinding, complex spell automation, player clients/SignalR, or the full Almanac in this phase.

</domain>

<decisions>
## Implementation Decisions

### Fog editing
- Fog uses a freeform circular paint brush independent of the optional square grid.
- Fog starts fully hidden when first enabled; the DM deliberately reveals explored areas.
- Reveal and Hide are separate, clearly indicated tools, not an implicit toggle.
- The brush has an adjustable size suitable for revealing rooms and corridors.

### Reveal behavior and privacy
- A completed Reveal/Hide stroke updates the player display immediately; do not add a second Show step for each fog action.
- A token remains hidden until explicitly made visible, even when its map location is revealed.
- Newly added tokens start visible; the DM can hide them during setup for an ambush.
- Fog and token visibility persist with the encounter through application restart.
- On application restart, load the encounter privately but keep the public display black until the DM explicitly shows the encounter; persisted fog/visibility must never be auto-published during cold start.
- HP, conditions, initiative, and dice results remain DM-only. Public output is limited to revealed terrain and explicitly visible token visuals; no encounter controls or private combat values enter the public projection.
- Preserve the Phase 2 decision to defer SignalR until Phase 6/CHAR-04. Phase 3 still needs prompt public updates for completed fog/visibility actions using an appropriately small local mechanism; the player renderer must remain fail-closed.

### Encounter flow
- The DM can roll a d20 or manually enter initiative for an actor.
- Turn order sorts by descending initiative. The DM can manually resolve tied actors' order.
- Conditions use a curated built-in list in Phase 3. Keep condition definitions separate enough that a later Almanac can supply SRD and DM-authored definitions.
- The dice roller supports standard D&D dice (d4, d6, d8, d10, d12, d20, d100) with an optional modifier.
- The user calls the planned in-app knowledge database the **Almanac**: it will eventually store 5e rules, characters, effects, and spells. Full Almanac authoring and sourcing are not Phase 3 scope; record the integration path for later phases.

### Agent discretion
- Choose the smallest robust representation for painted fog and persistence while preserving editable map geometry and fail-closed public projection.
- Keep HP and condition controls compact and usable from the existing dashboard during play; combat details are DM-only unless a future approved public projection explicitly says otherwise.
- Keep encounter actions authoritative in the local backend and make each persistence/publication transition testable.
- Respect the existing roadmap boundary: no line-of-sight simulation, pathfinding, complex spell automation, or SignalR before Phase 6.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope and acceptance
- `tabletop_dm_gsd_brief.md` §Stage 3 — manual fog, hidden tokens, basic encounter controls, explicit acceptance flow, and out-of-scope combat simulation.
- `.planning/ROADMAP.md` §Phase 3 — goal, success criteria, dependencies, and phase boundaries.
- `.planning/REQUIREMENTS.md` §Encounters — ENCT-01, ENCT-02, and ENCT-03.
- `.planning/PROJECT.md` — DM authority, local/offline operation, public/private boundary, and staged delivery rules.
- `.planning/phases/02-playable-digital-battle-map/02-CONTEXT.md` — inherited map, publication, persistence, UI, and Phase 6 SignalR decisions.
- `docs/phase-2-demo.md` — current user-facing map/edit/publish workflow and acceptance evidence.

### Existing implementation and integration points
- `src/renderer/src/map/MapEditor.tsx` — main map workspace, DM controls, token inspector, and publication actions.
- `src/renderer/src/map/MapCanvas.tsx` — PixiJS canvas and pointer/pan/zoom lifecycle where fog painting can integrate.
- `src/renderer/src/map/types.ts` — current map/token data contracts.
- `src/renderer/src/PublicDisplay.tsx` — public player renderer and polling refresh loop.
- `src/renderer/src/contracts.mjs` — public allowlist and fail-closed projection; hidden data must not be added to public DTOs.
- `src/backend/Maps/MapService.cs` — current authoritative SQLite map/token persistence.
- `src/backend/PresentationState.cs` — currently active public presentation and blackout behavior.

No external specifications or technical APIs were introduced during discussion.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MapCanvas` already owns the PixiJS stage, map coordinate transforms, token pointers, camera pan/zoom, and lifecycle cleanup; it is the natural integration point for a fog brush.
- `MapEditor` already provides the DM workspace and selected-token inspector; encounter controls should extend this dashboard rather than create a separate app/window.
- `PublicDisplay` renders a separate public window from the strict `publicView` projection; reuse the same window and keep hidden state out of its contract.
- `MapService` owns SQLite-backed drafts and approved snapshots and serializes writes; extend authoritative persistence rather than storing encounter truth only in React.

### Established Patterns
- Public DTOs are explicitly allowlisted and malformed data fails to black.
- Stage 2 keeps the current player snapshot separate from the private draft; fog visibility is a distinct live encounter state and must not accidentally publish editor-only data.
- Backend requests are local, authenticated, and mediated by the Electron main process; the player preload remains narrow.
- The public renderer currently polls once per second. SignalR/immediate push for scene/blackout remains reserved for Phase 6, so Phase 3 must meet the live-reveal expectation without broadening that later scope.

### Integration Points
- Persist fog and token visibility alongside the encounter/map data, then project only revealed regions and visible tokens to the player renderer.
- Extend the existing authenticated backend routes and tests for fog strokes, token visibility, actor HP/conditions, initiative, turn advancement, and dice outcomes.
- Add encounter controls in the DM dashboard without changing the two-window lifecycle or fullscreen player behavior.

</code_context>

<specifics>
## Specific Ideas

- “The Almanac” is the planned name for the app's in-app knowledge database of 5e rules, characters, effects, and spells. Conditions should begin with a curated list in Phase 3 and be structured to integrate with future SRD and DM-authored Almanac entries.
- The visible encounter path is: reveal a room, expose enemies, roll or set initiative, move tokens, change HP, and advance turns without leaving the main dashboard.

</specifics>

<deferred>
## Deferred Ideas

- Full Almanac data sourcing, general DM-authored Almanac entries, and broader 5e rules/character/effect/spell content belong to the later compendium/character stages, not this phase.
- SignalR, player phones, and real-time network synchronization remain Phase 6.
- Line-of-sight, pathfinding, complex spell automation, and automated tactical decisions remain out of scope.

</deferred>

---

*Phase: 03-fog-of-war-and-encounter-control*  
*Context gathered: 2026-10-29*
