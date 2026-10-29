# Roadmap: DungeonDeputy

## Overview

DungeonDeputy grows through seven independently runnable, user-visible stages, from safe two-screen scene presentation to optional DM-approved AI preparation. Each stage preserves the preceding working experience, ends with tests/demo instructions and known limitations, and pauses for review before the next stage begins. Phase 1 is intentionally limited to Stage 1; no Stage 2 gameplay work begins until that stage is verified and reviewed.

## Phases

- [x] **Phase 1: Safe Two-Screen Scene Presentation** - Deliver the Stage 1 private-control/public-display workflow; user approved Phase 1 on 2026-10-28. Physical HDMI/hot-plug and macOS verification remain unverified.
- [ ] **Phase 2: Playable Digital Battle Map** - Edit maps and tokens, then save and resume their positions. (Implementation in progress.)
- [ ] **Phase 3: Fog of War and Encounter Control** - Run a basic encounter while keeping hidden information private.
- [ ] **Phase 4: Soundboard, Scenes, and 12-Key Control** - Trigger sound and scene cues during play.
- [ ] **Phase 5: Offline 2024 SRD Compendium** - Search licensed local rules data and add monsters to encounters.
- [ ] **Phase 6: SRD Characters and Local Player Sheets** - Manage supported characters and synchronize permitted player edits over the LAN.
- [ ] **Phase 7: Optional AI Preparation and Map Proposals** - Review, accept, and edit AI proposals without making play depend on AI.

## Phase Details

### Phase 1: Safe Two-Screen Scene Presentation
**Goal**: The DM can launch DungeonDeputy, privately preview a bundled scene, explicitly show or change it on the table display, and safely blackout public output.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05
**Success Criteria** (what must be TRUE):
  1. The DM can launch the packaged app and operate a private dashboard independently of the player-facing display.
  2. The DM can select an available table display, or use a safe windowed player preview when only one display is available.
  3. The DM can privately preview one of the bundled demo scenes, explicitly publish it, and change the public scene without exposing private controls or content.
  4. The DM can immediately blackout the player display, and disconnect/reconnect/reassignment leaves public output in a safe recoverable state.
  5. The app works offline, remembers appropriate preferences, and has reproducible run instructions; Windows/macOS verification is reported only for platforms physically tested.
**Plans:** 5/5 plans executed
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
**Plans:** 4/6 plans executed
Plans:
- [x] 02-01-PLAN.md — Review and pin the approved PixiJS package
- [x] 02-02-PLAN.md — Build the saved tavern/blank map editing tracer
- [x] 02-03-PLAN.md — Add full token editing, bundled artwork attribution, and explicit public map approval
- [x] 02-04-PLAN.md — Publish an allowlisted map in the existing player window
- [ ] 02-06-PLAN.md — Exercise Stage 1 and Stage 2 workflows through Electron/backend E2E
- [ ] 02-05-PLAN.md — Verify packaged save/reload, document demo, and review Stage 2
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
**Plans:** 2/4 plans executed
Plans:
- [x] 03-01-PLAN.md — Trace persisted fog and filtered public visibility end-to-end
- [x] 03-04-PLAN.md — Close fog rendering, brush lifecycle, and authenticated publication gaps
- [ ] 03-02-PLAN.md — Implement private encounter state and validated combat API
- [ ] 03-03-PLAN.md — Integrate dashboard encounter workflow and verify E2E lifecycle
**UI hint**: yes

### Phase 4: Soundboard, Scenes, and 12-Key Control
**Goal**: The DM can control ambience, sound effects, and simple presentation cues during play using pads or configurable keyboard shortcuts.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: AUD-01, AUD-02
**Success Criteria** (what must be TRUE):
  1. The DM can load user-provided sounds into a 12-pad board, organize named banks, adjust volume, loop ambience, play one-shots, and stop all audio.
  2. The DM can bind persistent shortcuts to sound and scene/show/reveal/blackout cues, and ordinary typing is not unnecessarily disrupted.
  3. During a live map, the DM can trigger a honk, start rain ambience, change to a battle scene, and stop audio using a 12-key controller or ordinary keyboard; Mac/Windows results are reported only for platforms actually tested.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Offline 2024 SRD Compendium
**Goal**: The DM can search and use correctly attributed 2024 SRD-family reference data entirely offline.
**Mode:** mvp
**Depends on**: Phase 4 (preserves the staged delivery order); uses Phase 3 encounter capability
**Requirements**: SRD-01, SRD-02, SRD-03
**Success Criteria** (what must be TRUE):
  1. The DM can search bundled offline data for supported spells, conditions, actions, monsters, equipment, and key class/species definitions and open details.
  2. Each dataset exposes its version, attribution, license, and provenance; copyrighted non-SRD content is absent and missing entries are explicit rather than fabricated.
  3. The DM can add an SRD monster, including its stat information, to the current encounter.
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

### Phase 7: Optional AI Preparation and Map Proposals
**Goal**: The DM can optionally turn AI-generated preparation into editable campaign content only after explicit review and acceptance.
**Mode:** mvp
**Depends on**: Phase 6 (preserves the staged delivery order; relies on established map, encounter, and SRD concepts)
**Requirements**: AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. With a configured provider/key, the DM can request structured NPCs, encounter ideas, short adventures, scene descriptions, and editable map geometry proposals.
  2. The DM can prompt for a tavern ambush, review and explicitly accept the proposed NPC/encounter/map layout into the campaign, then edit tokens and run it on HDMI; rules output is grounded in local SRD data and distinguished from invented narrative.
  3. The DM can continue normal play and use existing campaigns when AI is disabled, unavailable, or has no configured key.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in the specified stage order: 1 → 2 → 3 → 4 → 5 → 6 → 7. Stop after each verified stage for user review; do not auto-advance implementation.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Safe Two-Screen Scene Presentation | 5/5 | Complete (user approved) | 2026-10-28 |
| 2. Playable Digital Battle Map | 4/6 | In Progress | - |
| 3. Fog of War and Encounter Control | 2/4 | In Progress | - |
| 4. Soundboard, Scenes, and 12-Key Control | 0/TBD | Not started | - |
| 5. Offline 2024 SRD Compendium | 0/TBD | Not started | - |
| 6. SRD Characters and Local Player Sheets | 0/TBD | Not started | - |
| 7. Optional AI Preparation and Map Proposals | 0/TBD | Not started | - |
