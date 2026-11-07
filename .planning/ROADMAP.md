# Roadmap: DungeonDeputy

## Overview

DungeonDeputy grows through seven independently runnable, user-visible stages, from safe two-screen scene presentation to optional DM-approved AI preparation. Each stage preserves the preceding working experience, ends with tests/demo instructions and known limitations, and pauses for review before the next stage begins. Phase 1 is intentionally limited to Stage 1; no Stage 2 gameplay work begins until that stage is verified and reviewed.

## Phases

- [x] **Phase 1: Safe Two-Screen Scene Presentation** - Deliver the Stage 1 private-control/public-display workflow; user approved Phase 1 on 2026-10-28. Physical HDMI/hot-plug and macOS verification remain unverified.
- [ ] **Phase 2: Playable Digital Battle Map** - Edit maps and tokens, then save and resume their positions. (Implementation in progress.)
- [ ] **Phase 3: Fog of War and Encounter Control** - Run a basic encounter while keeping hidden information private.
- [x] **Phase 4: Soundboard, Scenes, and 12-Key Control** - Trigger sound and scene cues during play. (completed 2026-10-31)
- [x] **Phase 5: Offline 2024 SRD Compendium** - Search licensed local rules data and add monsters to encounters. (completed 2026-11-04)
- [ ] **Phase 6: SRD Characters and Local Player Sheets** - Manage supported characters and synchronize permitted player edits over the LAN.
- [ ] **Phase 7: Optional AI Preparation and Map Proposals** - Review, accept, and edit AI proposals without making play depend on AI.

## Phase Details

### Phase 1: Safe Two-Screen Scene Presentation
**Goal**: As a Dungeon Master, I want to preview bundled scenes privately, explicitly show or change the selected scene on the table display, and black out public output, so that I can control what players see without exposing DM-only content.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05
**Success Criteria** (what must be TRUE):
  1. The DM can launch the packaged app and operate a private dashboard independently of the player-facing display.
  2. The DM can select an available table display, or use a safe windowed player preview when only one display is available.
  3. The DM can privately preview one of the bundled demo scenes, explicitly publish it, and change the public scene without exposing private controls or content.
  4. The DM can immediately blackout the player display, and disconnect/reconnect/reassignment leaves public output in a safe recoverable state.
  5. The app works offline, remembers appropriate preferences, and has reproducible run instructions; Windows/macOS verification is reported only for platforms physically tested.
**Plans:** 5/5 plans complete
Plans:
- [x] 01-01-PLAN.md — Verify audited npm package identities before installation
- [x] 01-02-PLAN.md — Establish verified stack, runnable scripts, and backend contract
- [x] 01-03-PLAN.md — Build private dashboard and fail-closed public scene renderer
- [x] 01-04-PLAN.md — Implement secure Electron display lifecycle and Forge packaging
- [x] 01-05-PLAN.md — Document developer setup, Stage 1 demo, evidence, and review stop
**UI hint**: yes

### Phase 2: Playable Digital Battle Map
**Goal**: The DM can create and edit a digital battle map, position tokens, publish only approved visuals, and resume the saved scene after restart.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, MAP-03
**Success Criteria** (what must be TRUE):
  1. The DM can create/edit a map with an optional square grid and adjust zoom, pan, and scale.
  2. The DM can build a tavern encounter with four heroes and three goblins, add/move/rename/recolor/remove tokens, and show the approved map state on HDMI.
  3. The DM can save a campaign/session, quit and relaunch, and recover that map and all token positions.
**Plans:** 6/6 plans complete; physical-display/macOS limitations remain documented
Plans:
- [x] 02-01-PLAN.md — Review and pin the approved PixiJS package
- [x] 02-02-PLAN.md — Build the saved tavern/blank map editing tracer
- [x] 02-03-PLAN.md — Add full token editing, bundled artwork attribution, and explicit public map approval
- [x] 02-04-PLAN.md — Publish an allowlisted map in the existing player window
- [x] 02-06-PLAN.md — Exercise Stage 1 and Stage 2 workflows through Electron/backend E2E
- [x] 02-05-PLAN.md — Verify packaged save/reload, document demo, and review Stage 2
**UI hint**: yes

### Phase 3: Fog of War and Encounter Control
**Goal**: The DM can run a basic combat encounter from the dashboard while controlling exactly which map information players can see.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ENCT-01, ENCT-02, ENCT-03
**Success Criteria** (what must be TRUE):
  1. The DM can manually hide and reveal map regions and tokens, and players see no hidden token or unrevealed information.
  2. The DM can manage actor HP and simple conditions, set initiative, advance turns, and make basic dice rolls.
  3. The DM can complete a basic encounter without leaving the main dashboard while only approved visual state is public.
**Plans:** 7/7 plans complete
Plans:
- [x] 03-01-PLAN.md — Trace persisted fog and filtered public visibility end-to-end
- [x] 03-04-PLAN.md — Close fog rendering, brush lifecycle, and authenticated publication gaps
- [x] 03-02-PLAN.md - Implement private encounter state and validated combat API
- [x] 03-03-PLAN.md - Integrate dashboard encounter workflow and verify E2E lifecycle
- [x] 03-05-PLAN.md — Close CR-01 with sanitized raster publication and public-origin privacy proof (Wave 5; depends on 03-03)
- [x] 03-06-PLAN.md — Close WR-01 through WR-04 canvas and encounter correctness gaps (Wave 6; depends on 03-05)
- [x] 03-07-PLAN.md — Close CR-01 atomic visual mutation race (Wave 7; depends on 03-05, 03-06)
**UI hint**: yes

### Phase 4: Soundboard, Scenes, and 12-Key Control
**Goal**: As a DM, I want to control ambience, sound effects, and simple presentation cues during play using 12-pad controls or configurable keyboard shortcuts, so that I can manage sound and presentation without interrupting the game.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: AUD-01, AUD-02
**Success Criteria** (what must be TRUE):
  1. The DM can load user-provided sounds into a 12-pad board, organize named banks, adjust volume, loop ambience, play one-shots, and stop all audio.
  2. The DM can bind persistent shortcuts to sound and scene/show/reveal/blackout cues, and ordinary typing is not unnecessarily disrupted.
  3. During a live map, the DM can trigger a honk, start rain ambience, change to a battle scene, and stop audio using a 12-key controller or ordinary keyboard; Mac/Windows results are reported only for platforms actually tested.
**Plans:** 8/8 plans complete
Plans:
- [x] 04-01-PLAN.md — Secure audio import and persisted 12-slot bank tracer
- [x] 04-02-PLAN.md — Bounded WebAudio soundboard and private workspace
- [x] 04-03-PLAN.md — Persistent safe cues, keyboard controls, and verification docs
- [x] 04-04-PLAN.md — Close pending-save and failed-save UI E2E verification gap
- [x] 04-05-PLAN.md — Close transactional audio import and managed-asset reclamation review gaps
- [x] 04-06-PLAN.md — Close behavioral evidence gaps for concurrent quota staging and promotion rollback
- [x] 04-07-PLAN.md — Close CR-02 asynchronous destination-stream error handling gap
- [x] 04-08-PLAN.md — Bundle safe CC0 soundboard defaults and prove first-run/clear lifecycle
**UI hint**: yes

### Phase 5: Offline 2024 SRD Compendium
**Goal**: As a DM, I want to search and use correctly attributed 2024 SRD-family reference data entirely offline, so I can look up supported rules and add a licensed monster to my encounter without relying on internet access.
**Mode:** mvp
**Depends on**: Phase 4 (user-authorized out-of-sequence start after Phase 4 acceptance on 2026-10-31); uses existing Phase 3 encounter capability
**Requirements**: SRD-01, SRD-02, SRD-03
**Success Criteria** (what must be TRUE):
  1. The DM can search bundled offline data for supported spells, conditions, actions, monsters, equipment, and key class/species definitions and open details.
  2. Each dataset exposes its version, attribution, license, and provenance; copyrighted non-SRD content is absent and missing entries are explicit rather than fabricated.
  3. The DM can add an SRD monster, including its stat information, to the current encounter.
**Plans:** 4/4 plans complete
Plans:
- [x] 05-01-PLAN.md — Trace one verified licensed monster through offline catalog and private encounter
- [x] 05-02-PLAN.md — Expand pinned SRD subset, deterministic import, provenance, and catalog API
- [x] 05-03-PLAN.md — Deliver accessible DM-only category search and record details
- [x] 05-04-PLAN.md — Verify private monster integration, packaged offline use, and demo documentation
**UI hint**: yes

### Phase 6: SRD Characters and Local Player Sheets
**Goal**: The DM can manage supported SRD-only characters and players can securely access their assigned sheets over the local network without accounts or internet.
**Mode:** mvp
**Depends on**: Phase 5 (SRD definitions) and Phase 3 (encounter authority)
**Requirements**: CHAR-01, CHAR-02, CHAR-03, CHAR-04
**Success Criteria** (what must be TRUE):
  1. The DM can create/edit supported SRD-only characters and see supported ability, proficiency, HP, AC, inventory, spell/resource, and level calculations.
  2. Players can join from phones on the local network using a session code or QR invitation without registration or internet access.
  3. Two players can join from phones on the same Wi-Fi, view their assigned sheets, and submit permitted inventory/resource edits that appear on the DM laptop; a DM HP change synchronizes back to the relevant player without exposing other players' or hidden data.
  4. SignalR immediately pushes DM-approved scene changes and blackout to the table display and connected player sheets without polling delay; each client receives only its authorized public state.
**Plans:** 8/8 plans executed; physical-phone/operator UAT remains outstanding

Plans:
- [x] 06-01-PLAN.md — DM character create/edit end-to-end tracer
- [x] 06-02-PLAN.md — Bounded SRD character calculations and sheet editing
- [x] 06-03-PLAN.md — Managed LAN pairing and scoped player identity
- [x] 06-04-PLAN.md — Assigned-only player sheets and permitted actions
- [x] 06-05-PLAN.md — Verify/pin SignalR package and implement authorized Hub publication
- [x] 06-06-PLAN.md — Connect public display and assigned player clients to SignalR
- [x] 06-07-PLAN.md — Adversarial E2E, package smoke and physical-phone UAT
- [x] 06-08-PLAN.md — Close source-backed character calculation gaps for the explicitly supported subset
**UI hint**: yes

### Phase 7: Optional AI Preparation and Map Proposals
**Goal**: As a Dungeon Master, I want to generate and review optional AI suggestions for NPCs, encounters, short adventures, scenes and map geometry, so that I can selectively accept them as editable campaign drafts while keeping normal play local, private and under my control.
**Mode:** mvp
**Depends on**: Phase 6 implementation artifacts (map, encounter, and SRD concepts); physical phone/operator UAT is not a prerequisite to Phase 7 execution and remains an overall final acceptance gate
**Requirements**: AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. With a configured provider/key, the DM can request structured NPCs, encounter ideas, short adventures, scene descriptions, and editable map geometry proposals.
  2. The DM can prompt for a tavern ambush, privately preview it, explicitly accept selected locally catalogued monster record IDs through the normal encounter path, create/edit supported bounded map tokens, then run the normal encounter and publish to HDMI only through the separate existing Show action; rules output is grounded in local SRD data and distinguished from invented narrative. No campaign state is sent to AI.
  3. The DM can continue normal play and use existing campaigns when AI is disabled, unavailable, or has no configured key.
**Plans:** 8/8 plans executed
Plans:
- [x] 07-01-PLAN.md — Trace secure keyless-testable backend NPC generation and provider configuration
- [x] 07-02-PLAN.md — Add all bounded proposal types and catalog-verified SRD grounding
- [x] 07-03-PLAN.md — Build DM-only consent, private preview, and editing workflow
- [x] 07-04-PLAN.md — Accept proposals only into validated private editable drafts
- [x] 07-05-PLAN.md — Prove offline/security E2E and record complete source audit
- [x] 07-06-PLAN.md — Render and edit private accepted map geometry
- [x] 07-07-PLAN.md — Run deterministic offline Electron/backend tavern ambush E2E
- [x] 07-08-PLAN.md — Persist accepted NPC/encounter/adventure/scene narrative as private editable campaign content
**UI hint**: yes

## Progress

**Execution Order:**
User authorized autonomous progression through all roadmap phases and final integration on 2026-11-07. Plan counts now reflect Phase 1 5/5, Phase 2 6/6 (physical display gap remains), Phase 3 7/7, Phase 4 8/8, Phase 5 4/4, Phase 6 8/8 (physical UAT outstanding), and Phase 7 8/8. Phase 6 implementation and Phase 7 implementation have automated evidence, but CHAR-02..04 remain unverified until physical two-phone/private-Wi-Fi and operator transport UAT passes; local loopback E2E is not physical evidence. Physical HDMI/display, macOS, and live AI-provider usage are also not claimed as verified. Do not mark the overall project complete by proxy; retain these acceptance gates after the full automated integration run.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Safe Two-Screen Scene Presentation | 5/5 | Complete (user approved) | 2026-10-28 |
| 2. Playable Digital Battle Map | 6/6 | Implementation verified; physical display behavior remains unverified | - |
| 3. Fog of War and Encounter Control | 7/7 | Verification passed; progression acceptance recorded | - |
| 4. Soundboard, Scenes, and 12-Key Control | 8/8 | Complete    | 2026-10-31 |
| 5. Offline 2024 SRD Compendium | 4/4 | Complete    | 2026-11-04 |
| 6. SRD Characters and Local Player Sheets | 8/8 | In Progress; CHAR-01 covered for bounded subset; phone/operator UAT outstanding | - |
| 7. Optional AI Preparation and Map Proposals | 8/8 | Implementation verified; live provider and overall hardware acceptance remain unverified | - |

**Phase 5 completion gate:** Keep Phase 5 and SRD-01 pending/in progress unless every required category (spells, conditions, actions, monsters, equipment, classes, and species) has at least one genuine, legally redistributable, provenance-verified searchable record. A category may remain visibly unavailable and its licensing/provenance blocker documented, but that fallback does not satisfy SRD-01 or permit Phase 5 completion. When a category is blocked, pause the phase, retain the incomplete status in this table and the SRD-01 traceability row, and escalate for explicit user approval of a scope change or until verified records are added; only then update completion status.
