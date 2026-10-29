# Phase 3: Fog of War and Encounter Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-10-29  
**Phase:** 3-fog-of-war-and-encounter-control  
**Areas discussed:** Fog editing, Reveal behavior, Encounter flow

---

## Fog editing

| Option | Description | Selected |
|--------|-------------|----------|
| Painted grid cells | Paint/reveal square cells; predictable when grid is enabled. | |
| Freeform brush | Paint arbitrary regions independent of the grid. | ✓ |
| Simple shapes | Place and resize rectangular or circular regions. | |
| Hide whole map | Fog starts hidden and the DM paints explored areas into view. | ✓ |
| Show whole map | Preserve the Phase 2 display until the DM paints hidden regions. | |
| Choose per map | Select the initial fog state for each map. | |
| Explicit Reveal/Hide tools | Select a clearly visible mode before painting. | ✓ |
| Toggle each brush pass | Each stroke flips its painted area. | |
| Reveal only | Erase fog; use a reset for hiding again. | |
| Adjustable circle | Visible circular brush with adjustable size. | ✓ |
| Fixed circle | One consistent brush size. | |
| Polygon lasso | Click points to outline precise regions. | |

**User's choice:** Freeform circular brush, initially fully hidden, separate Reveal and Hide tools, adjustable brush size.
**Notes:** Fog is independent of the optional square grid.

---

## Reveal behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately | Completed fog strokes update the player display at once. | ✓ |
| Explicit Show | Keep changes private until the DM presses Show. | |
| Batch then publish | Queue strokes and publish them together. | |
| Independent token visibility | Hidden tokens stay hidden even in revealed terrain. | ✓ |
| Reveal with terrain | Tokens appear automatically when their location is revealed. | |
| Per-token setting | Select whether each token follows fog or remains independent. | |
| New tokens visible | Newly added tokens appear unless the DM hides them. | ✓ |
| New tokens hidden | Explicitly reveal every newly added token. | |
| Defaults by type | Heroes visible and monsters hidden. | |
| Persist with encounter | Restore fog and token visibility after restart. | ✓ |
| Reset fog on restart | Keep map/tokens but hide the map again on launch. | |
| Ask on resume | Restore privately and ask the DM before showing. | |

**User's choice:** Fog actions update immediately; token visibility is independent and defaults visible for new tokens; fog and visibility persist across restarts.
**Notes:** HP, conditions, initiative, and dice outcomes are treated as private DM state under the existing public/private contract. Persist fog privately, but keep the public screen black after cold start until the DM explicitly shows the encounter. SignalR remains reserved for Phase 6.

---

## Encounter flow

| Option | Description | Selected |
|--------|-------------|----------|
| Roll d20 or enter | Roll initiative for an actor or type a table result. | ✓ |
| Enter only | DM types each value. | |
| Roll only | App rolls without manual entry. | |
| Descending initiative | Highest first; DM manually resolves ties. | ✓ |
| Descending, fixed ties | Preserve current order for tied values. | |
| Manual order | Drag actors; initiative does not sort. | |
| Curated quick list | Choose named conditions from a built-in list. | ✓ |
| Free-text labels | Type arbitrary condition names. | |
| Both | Common named conditions plus custom labels. | |
| Standard dice + modifier | Choose d4/d6/d8/d10/d12/d20/d100 and optional modifier. | ✓ |
| Dice expressions | Accept expressions such as `2d6+3`. | |
| d20 only | Roll d20 with optional modifier. | |

**User's choice:** Roll or enter initiative; sort descending with manual tie resolution; curated conditions; standard dice with optional modifier.
**Notes:** The user named the future in-app 5e knowledge database “the Almanac.” Conditions should later be sourced from SRD data and support DM-created Almanac entries; full Almanac authoring is deferred from Phase 3.

---

## The agent's Discretion

- Decide the compact encounter panel layout and minimal authoritative implementation details within the roadmap boundary.
- Preserve DM-only privacy for HP, conditions, initiative, and roll results.

## Deferred Ideas

- Full Almanac data sourcing and general DM-authored entries, for later compendium/character stages.
- SignalR and player clients, for Phase 6.
- Line-of-sight, pathfinding, and complex spell automation remain out of scope.
