# Feature Landscape

**Domain:** Local-first, in-person D&D Dungeon Master companion
**Researched:** 2026-10-28
**Scope authority:** Project brief stages 1–7 and `.planning/PROJECT.md`; the brief's stage boundaries are preserved exactly. Complexity is relative to this product and reflects integration/privacy risk, not a delivery estimate.

## Stage 1 Table Stakes — First usable two-screen application

Stage 1 is deliberately a small presentation workflow, not a VTT or combat tool. The smallest useful demo must launch and safely present one of a few scenes.

| Feature | Why expected / acceptance | Complexity | Dependencies / notes |
|---|---|---:|---|
| Launchable desktop application on Windows and macOS | The user needs to run the companion at the physical table; both OSs are stated release targets. | High | Desktop host plus packaged local backend; test actual builds on each OS, and mark any untested platform unverified. |
| Select the table display and open a separate player-facing presentation window | Core two-screen workflow; HDMI display shows only approved visuals. | High | Display enumeration, independent windows, fullscreen/window lifecycle, robust behavior when display changes or disconnects. |
| Private DM dashboard with safe scene preview | DM needs to inspect the next scene without exposing it to players. | Medium | Keep DM UI/content in its own window; preview must not leak through mirroring, window reuse, or public renderer. |
| Two or three bundled demo scene images | New installation must have something immediately showable without setup or network access. | Low | Bundle local assets and choose usable licensed/owned images. |
| Explicit show/change scene and blackout controls | This is the central live-table presentation loop and safe fallback. | Medium | Backend/session state drives player window; blackout should take precedence over stale scene content during uncertain transitions. |
| Safe single-display windowed preview | Makes the app testable/useful without an external monitor and avoids accidentally exposing private UI. | Medium | Detect no distinct presentation display; do not launch private dashboard as the public surface. |
| Persist last session/display preferences where sensible | Reduces setup friction on repeat launch. | Low | Only persist harmless preferences in Stage 1; not a reason to introduce broad campaign persistence or database abstractions. |
| Visible public/private separation | Non-negotiable security acceptance: no controls, DM notes, unrevealed material, hidden tokens, or prompts on the table screen. | High / critical | Establish public-view allowlist and test privacy transitions; only Stage 1 content exists yet, but boundary belongs in initial architecture. |
| Stage-end demo checklist, tests as appropriate, run instructions, limitations, and review stop | Brief's delivery contract; each stage must be independently runnable and verified before moving on. | Low | Required process/output, not a user-facing feature. |

**Stage 1 must not absorb** maps/tokens, fog of war, encounters/combat, sound, rules reference, characters/phone sheets, or AI. This is explicit scope control, not a statement that these features lack value.

## Later-Stage Features — Preserve the brief's stages exactly

| Stage | Outcome and features | Complexity | Key dependencies / sequencing |
|---|---|---:|---|
| **Stage 2 — Playable digital battle map** | PixiJS 2D map; optional square grid; pan/zoom; basic scale settings; map-scene create/edit; small token library; drag, move, rename and visually customize player/monster tokens; save map and token positions; approved map state on public display; basic campaign/session save-and-resume. | High | Requires Stage 1 public/private display boundary and persistent domain state. Make map edits and save/reload a complete slice; table view must render only approved visual state. |
| **Stage 3 — Fog of war and encounter control** | Manually reveal/hide map regions; hide/reveal private tokens; actor HP; initiative order and turn advancement; compact encounter panel; minimal conditions, dice rolls, and HP changes. | High | Requires Stage 2 maps/tokens and save/resume. Public view must derive from filtered/approved state so hidden regions/tokens cannot leak. Avoid pathfinding, line-of-sight simulation, and complex spell automation. |
| **Stage 4 — Soundboard, scenes and 12-key control** | Twelve sound pads; user-provided audio; named banks; keyboard shortcut mapping; separate ambience/music and one-shot effects; volume, looping, stop-all; rebinding and saved settings; cues trigger simple actions (sound, scene swap/reveal, image, blackout). | Medium–High | Builds on Stage 1 scene and blackout actions; audio assets/output and key handling need OS-specific testing. Keyboard focus must not steal ordinary typing. Use ordinary keyboard events; no bespoke HID or advanced integrations. |
| **Stage 5 — Offline D&D 5e reference data** | Import/build-time pipeline and bundled searchable compendium for spells, conditions, actions, monsters, equipment, and key class/species definitions; one ruleset only, the 2024 SRD family; exact data version, attribution, provenance, missing-data handling; open detail pages and add an SRD monster with stats to an encounter. | High | Needs an explicit approved-data pipeline, licensing/provenance checks and offline packaging. Monster-to-encounter integration depends on Stage 3. Data is definitions, not an executable rules engine; never fabricate missing content. |
| **Stage 6 — Characters and optional live player sheets** | Guided SRD-only builder for a limited usable class/species selection; ability scores, proficiency, HP, AC, inventory, applicable spells/slots and supported level progression; DM can create/edit characters; mobile web sheets served over local network; session code/QR and access controls; SignalR sync; players view their own sheets and submit permitted changes/actions while DM owns combat/hidden state. | Very high | Depends on Stage 5 imported definitions and Stage 3 combat authority; requires local-network service, identity/session authorization, sync/conflict behavior and private-per-player data boundaries. Start with bounded supported choices, not universal character automation. |
| **Stage 7 — Practical AI assistance and map generation** | Optional single provider with bring-your-own-key; structured NPC, encounter, short-adventure and scene-description generation; preview and explicit DM approval before campaign insertion; rules-grounded output separated from invented narrative; editable structured map geometry first, optional artwork/textures later; edit generated map in existing editor; normal play works with AI disabled or unavailable. | Very high | Depends on mature campaign/map/encounter model, local SRD data (Stage 5) for rules grounding, and a review/accept workflow. AI proposes content only; it never silently changes game state or becomes a runtime prerequisite. |

## Differentiators

These are distinctive product advantages in the brief, not permission to expand an earlier stage. Deliver them only in their assigned stage.

| Differentiator | Value proposition | Complexity | Stage |
|---|---|---:|---|
| Explicitly isolated DM and player windows, with safe blackout and private preview | Solves the high-consequence table problem—showing the right content publicly while preparing privately—more directly than a generic campaign notebook. | High | Stage 1 foundation |
| Local-first and genuinely usable offline | Sessions, assets, rules bundle, and local play do not depend on cloud services or internet availability. | Medium initially; grows with data/packaging | Stages 1–6; verify every added asset/data path works offline. |
| Progressive tabletop workflow in runnable vertical slices | Each stage ends in a demonstrable session capability; users can stop at an earlier useful scope instead of waiting for a monolithic VTT. | Medium (delivery discipline) | All stages |
| Manual-first, DM-authoritative hidden information and combat | Straightforward explicit controls and approval preserve trust; fog, tokens, HP and turns support play without pretending to automate all 5e rules. | High | Stages 2–3 |
| Tactile sound cues using ordinary configurable keyboard events/macropads | A live table can trigger ambience and scene changes quickly without bespoke device drivers or proprietary hardware integrations. | Medium | Stage 4 |
| Offline compendium with versioned SRD provenance | Lets a DM look up licensed reference during play without network availability and makes data scope auditable. | High | Stage 5 |
| Optional same-Wi-Fi player sheets without accounts/cloud | Adds phone convenience without converting an in-person tool into an online-hosted VTT. | Very high (privacy/networking) | Stage 6 |
| AI as reviewable preparation assistance, with editable geometry | Saves prep time while keeping the DM in control and producing maps that can be modified rather than treating generated imagery as mechanically valid. | Very high | Stage 7 |

## Anti-Features

| Anti-feature | Why avoid | Do instead |
|---|---|---|
| Online VTT hosting, matchmaking, required accounts, cloud dependency | Conflicts with in-person local-first core value and adds infrastructure/privacy burden. | Local desktop session; optional local-network phone access only in Stage 6. |
| Building Stage 2+ gameplay in Stage 1 | Delays the smallest complete scene-presentation demo and violates explicit stage boundaries. | Finish and verify Stage 1, then stop for review. |
| Mirroring the DM dashboard or sharing one renderer/window between private and public views | Risks leaking controls, notes, hidden state, or prompts. | Separate windows and a backend-owned public projection/allowlist; test blackouts and transitions. |
| Physical-miniature recognition, bespoke HID drivers, MIDI/Stream Deck SDK, advanced audio routing | Not needed for the promised digital token and simple keyboard/macropad workflow; costly platform-specific scope. | DM-controlled digital tokens and ordinary configurable keyboard events. |
| 3D maps, physics, sophisticated pathfinding, simulated line of sight, complex spell/rule automation | Complexity without a requirement for the initial playable battlemat or basic encounter. | 2D maps, manual fog, simple HP/conditions/dice and turn controls. |
| Importing copyrighted non-SRD sourcebooks or assuming all official content is licensed | Creates licensing and provenance risk and conflicts with SRD-only scope. | Versioned, attributed, appropriately licensed SRD data; explicit missing-data behavior. |
| Treating generated map art as an automatically valid battle map | Image generation does not guarantee usable grid, walls, doors, or encounters. | Generate editable structured geometry first; artwork is optional. |
| AI autonomy over campaign/combat state, or making play depend on AI/API keys | Undermines DM authority and offline reliability. | AI drafts proposals; DM previews and accepts; all normal play works with AI off. |
| Universal character builder or full implementation of every 5e rule in Stage 6 | Unbounded rules/data scope and poor fit for a first useful character slice. | Support a clearly limited SRD-only selection with calculations in domain logic. |
| Bespoke plugin framework, event-sourcing platform, premature abstraction, or infrastructure-only stage | Raises maintenance cost without serving the current table workflow. | Small domain model and simple state-transition tests; build only what the current stage needs. |

## Feature Dependencies

```text
Stage 1 isolated display + private preview + blackout
  → Stage 2 maps/tokens + campaign/session persistence
    → Stage 3 manual fog/hidden tokens + encounter state
      → Stage 5 SRD monster lookup → add monster to encounter
      → Stage 6 DM/character combat state + per-player authorized sheets
  → Stage 4 scene/blackout actions → sound cues and keyboard/macropad triggers
Stage 5 versioned SRD data → Stage 6 bounded SRD character builder
Stage 2 editable map model + Stage 3 encounter concepts + Stage 5 rules grounding
  → Stage 7 reviewed AI proposals and editable structured map geometry
```

Dependencies are conceptual: Stage 4 can follow the prescribed roadmap after Stage 3, though sound's basic scene actions rely on Stage 1; Stage 5's content can be built independently of map rendering, but its monster-to-encounter acceptance uses Stage 3. Preserve the brief's named order and do not pull dependencies forward as scope creep.

## MVP Recommendation

For this project's MVP, implement **Stage 1 only**:

1. Separate DM dashboard and player-facing presentation window with selectable external display.
2. Private preview, bundled scenes, explicit show/change and reliable blackout; safe single-display windowed mode.
3. Local launch/package behavior, sensible display preference persistence, and demonstrable Windows/macOS acceptance (mark untested platforms unverified).

Defer every Stage 2–7 feature to its named stage. In particular, no map editor, token system, combat, rules database, character model, network player service, or AI in Stage 1.

## Evidence and Confidence

- **High confidence:** Feature scope, stage order, dependencies, and out-of-scope decisions directly transcribed/synthesized from the project brief and `.planning/PROJECT.md` (primary requirements). The user's brief is authoritative for this product.
- **Low confidence / contextual only:** A broad web search returned examples of adjacent tools emphasizing battlemaps/tokens/fog/initiative, audio, SRD lookup, offline campaign tools, and AI generation. Results were vendor pages and secondary sources, not a representative market survey; they did not change the staged prioritization and are not used to assert universal user expectations.

## Sources

- `tabletop_dm_gsd_brief.md` — primary product brief, especially stages 1–7, scope boundaries, and acceptance expectations.
- `.planning/PROJECT.md` — validated project context, active requirements, constraints, and out-of-scope items.
- Search results (LOW confidence, contextual only): [Topside](https://www.topside.app/), [Campaign Codex](https://campaigncodex.app/), and other adjacent product/vendor pages surfaced by broad web search. Not treated as representative evidence.
