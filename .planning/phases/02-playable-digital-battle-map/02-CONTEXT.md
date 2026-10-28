# Phase 2: Playable Digital Battle Map - Context

**Gathered:** 2026-10-28  
**Status:** Ready for planning  
**Source:** Project brief + PRD express path

<domain>
## Phase Boundary

Deliver Stage 2 only: a DM can create or edit a map scene with an optional square grid, zoom/pan, and basic scale; place and manipulate digital hero/monster tokens; publish only approved map visuals to the player display; and save/resume the campaign/session and token positions across app restarts.

The visible acceptance target is a tavern encounter with four heroes and three goblins, saved and restored after quit/relaunch. Preserve the Stage 1 dual-window, blackout, offline, and privacy behavior. Do not implement Stage 3 fog/hidden tokens, HP/initiative/combat, Stage 4 audio, SRD reference, phone clients, or AI.

</domain>

<decisions>
## Implementation Decisions

### Map editing and publishing
- Reuse the existing Stage 1 player display window and API authority; do not open/recreate another window when editing, showing, or blacking out a map.
- The DM edits a private draft map while the current approved public map remains unchanged. An explicit **Show on table** action publishes the draft map; **Black out** remains immediately available.
- Use PixiJS v8 in a React-owned map canvas. The backend remains authoritative for saved map/token state; PixiJS only renders and collects pointer gestures.
- A map can start from an included original tavern floorplan or a blank grid. The DM can toggle a square grid, pan/zoom, and change the basic grid scale.
- Add a small built-in hero/monster token library sufficient for the tavern demonstration (four heroes, three goblins). The DM can place, drag, rename, recolor, choose from bundled token artwork, and remove tokens.
- Persist token positions when a drag is committed and make an explicit save/resume path discoverable. Do not build collision, pathfinding, line-of-sight, or combat automation.
- Public map output uses a dedicated allowlisted projection with map asset, visible grid/scale settings, and approved tokens only. No dashboard, editor handles, selection state, notes, or private draft data reaches the public renderer.

### Persistence and local operation
- Add a local SQLite database under the OS per-user application data directory, not beside installed/read-only program resources.
- Use `Microsoft.Data.Sqlite` directly for the small Stage 2 schema unless research proves a justified EF Core need; keep schema setup and persistence code small and tested.
- Persist the campaign/session, maps, grid settings, and token definitions/positions needed for save/reload. Seed a helpful tavern demo without overwriting user changes.
- Electron passes a resolved data directory to the backend process. Continue binding only to loopback with the per-run backend token; no LAN access in this phase.
- Test save/reload after backend/application restart and verify packaged SQLite native assets load for supported RIDs; test at least the current Windows x64 host and report macOS unverified if unavailable.

### UI direction (Anthropic frontend-design skill)
- Continue the Stage 1 command-desk identity and existing ink/slate/chalk/oxidized-teal/brass palette. The memorable element is the large, tactile map canvas, not decorative dashboard cards.
- Layout: narrow scene/campaign rail at left; broad map editor in the center; compact right inspector for selected token/grid/scale; a restrained token tray below the canvas. Keep **Private draft** and **Showing on table** states plainly visible.
- Use the map canvas as the dominant visual area, align labels left, and keep live-use actions large and close to the map. Use sentence-case controls, keyboard focus, accessible labels, reduced-motion behavior, and responsive resizing.
- Keep the public renderer edge-to-edge map art/grid/tokens with no controls or editor chrome. The player display remains the same fullscreen window when map state changes.
- Follow the loaded frontend-design skill's two-pass process: propose and critique a concise Stage 2 design system before implementing; avoid generic card grids and do not use gradients as decoration.

### Agent discretion
- Choose the smallest reliable PixiJS scene graph and pointer pan/zoom implementation; add no viewport helper unless it is justified and separately audited.
- Choose a simple relational schema/API shape for campaign/session, maps, and tokens; use parameterized SQL and transactions.
- Choose whether moves are sent on drag end or via small throttled updates, while ensuring failed saves are clearly surfaced and public state stays DM-approved.
- Choose the simplest imported map-image workflow needed for the demo, provided bundled maps work offline and rights/attribution are documented.
- Choose test boundaries for map transforms, grid snapping/scale calculations, persistence round trips, and public/private projection.

</decisions>

<canonical_refs>
## Canonical References

### Product scope and acceptance
- `tabletop_dm_gsd_brief.md` — Stage 2 scope, tavern acceptance scenario, display privacy, and explicit later-stage exclusions.
- `.planning/PROJECT.md` — core value, platform constraints, local-first architecture, and staged delivery.
- `.planning/REQUIREMENTS.md` — MAP-01, MAP-02, MAP-03 and the later SignalR realtime requirement CHAR-04.
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria.
- `.planning/phases/01-safe-two-screen-scene-presentation/01-CONTEXT.md` — inherited Stage 1 UI, public/private, and fullscreen contracts.
- `.planning/phases/01-safe-two-screen-scene-presentation/01-VERIFICATION.md` — Stage 1 verification and known platform limitations (when available).

### Existing implementation
- `src/main.ts` — Electron display/window/backend lifecycle and per-user preferences.
- `src/backend/Program.cs` — authenticated loopback API endpoints.
- `src/backend/PresentationState.cs` — Stage 1 private/public scene state.
- `src/renderer/src/App.tsx` — DM dashboard entry.
- `src/renderer/src/PublicDisplay.tsx` — separate public renderer entry.
- `src/renderer/src/contracts.mjs` — public projection allowlist.
- `scripts/package-backend.mjs` and `forge.config.ts` — self-contained RID publishing and offline packaged resources.

### Visual and technology references
- `C:/Users/aaron/.config/opencode/skills/frontend-design/SKILL.md` — intentional visual design, critique, accessibility, and restraint.
- `.planning/research/STACK.md` — PixiJS v8 and SQLite integration decisions; avoid adding unnecessary canvas or persistence frameworks.

</canonical_refs>

<specifics>
## Specific Ideas

- The demo starts with a tavern floorplan, an optional square grid, four hero tokens, and three goblin tokens.
- Selecting/dragging/renaming tokens only updates the private editor/draft. Public output remains the last explicitly approved map until **Show on table**.
- Save the campaign/session and all seven token positions, quit/relaunch, and restore the same map and positions.
- Keep public blackout and fullscreen window stability from Stage 1; map edits update content in-place rather than opening another window.

</specifics>

<deferred>
## Deferred Ideas

- Fog of war, manual reveal/hide, hidden/private tokens, HP, initiative, conditions, dice, and turn advancement (Stage 3).
- Audio cues, soundboards, and macropad mappings (Stage 4).
- SRD compendium, character sheets, SignalR/player phones, and immediate push scene/blackout updates (Stages 5–6; CHAR-04 specifically belongs to the SignalR stage).
- AI map generation, automatic physical-miniature recognition, pathfinding, line-of-sight, collision, and 3D rendering.

</deferred>

---

*Phase: 02-playable-digital-battle-map*  
*Context gathered: 2026-10-28 via PRD Express Path*
