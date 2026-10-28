# Requirements: DungeonDeputy

**Defined:** 2026-10-28  
**Core Value:** The DM can privately control the session while showing only approved visuals on the table display.

## v1 Requirements

### Display and scenes

- [ ] **DISP-01**: The DM can launch the packaged desktop app and use a private dashboard separate from the player-facing display.
- [ ] **DISP-02**: The DM can view available displays, select the table display, and use a safe windowed player preview when only one display is available.
- [x] **DISP-03**: The DM can choose from bundled demo scenes, preview privately, show a selected scene on the player display, and change the public scene without exposing DM-only content.
- [ ] **DISP-04**: The DM can immediately blackout the player display, and the app responds safely when the external display is disconnected, reconnected, or reassigned.
- [ ] **DISP-05**: The app remembers appropriate display/session preferences and can be run with reproducible developer instructions.

### Battle maps and session state

- [ ] **MAP-01**: The DM can create/edit a map scene with an optional square grid and basic zoom, pan, and scale controls.
- [ ] **MAP-02**: The DM can add, move, rename, recolor, and remove digital character and monster tokens on the map.
- [ ] **MAP-03**: The DM can save a campaign/session and restore maps and token positions after restarting the app.

### Encounters

- [ ] **ENCT-01**: The DM can manually reveal or hide map regions and keep hidden tokens and unrevealed information off the player display.
- [ ] **ENCT-02**: The DM can manage actor HP, simple conditions, initiative order, turn advancement, and basic dice rolls from the dashboard.
- [ ] **ENCT-03**: The DM can run a basic encounter without leaving the main dashboard, while only approved visual state is public.

### Audio and cues

- [ ] **AUD-01**: The DM can load user-provided sounds into a 12-pad soundboard with named banks, volume controls, looping ambience, one-shots, and stop-all.
- [ ] **AUD-02**: The DM can map standard keyboard shortcuts to cues that play sounds, show/reveal/swap a scene, or blackout the display; mappings persist and do not disrupt ordinary typing unnecessarily.

### Offline SRD reference

- [ ] **SRD-01**: The app bundles searchable offline 2024 SRD-family data for supported spells, conditions, actions, monsters, equipment, and key class/species definitions.
- [ ] **SRD-02**: Each imported dataset records version, attribution, license, and provenance; copyrighted non-SRD content is excluded and missing data is explicit rather than fabricated.
- [ ] **SRD-03**: The DM can open compendium details and add an SRD monster, with its stat information, to the current encounter.

### Characters and player companion

- [ ] **CHAR-01**: The DM can create/edit SRD-only characters for a supported selection of classes/species, with supported ability, proficiency, HP, AC, inventory, spell/resource, and level calculations in the .NET domain layer.
- [ ] **CHAR-02**: Players can join from a phone on the local network using a session code or QR invitation, without account registration or internet access.
- [ ] **CHAR-03**: Players can view their assigned sheets and submit permitted edits/actions; changes sync with the DM, while the DM remains authoritative for combat and hidden information.

### Optional AI assistance

- [ ] **AI-01**: With a configured provider/key, the DM can generate structured NPCs, encounter ideas, short adventures, scene descriptions, and editable map geometry.
- [ ] **AI-02**: The DM must preview and explicitly accept generated content before it enters campaign state; rules-related output is grounded in local SRD data and separated from invented narrative.
- [ ] **AI-03**: The app remains fully usable when AI is disabled, unavailable, or has no configured key.

## v2 Requirements

None currently identified beyond the staged roadmap. Additional licensed rule coverage, advanced character options, and visual map-generation enhancements remain future extensions rather than MVP promises.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Online virtual tabletop hosting or matchmaking | The product targets in-person, local-first sessions. |
| 3D maps, physics, sophisticated pathfinding, or line-of-sight simulation | Explicitly deferred; not needed for the initial playable experience. |
| Automated implementation of every spell, feat, or obscure rule | Rules automation is intentionally limited to practical basics. |
| Copyrighted non-SRD content imports or deep proprietary integrations | Licensing and sourcebook ownership must be respected. |
| Custom HID drivers, MIDI/Stream Deck SDKs, or advanced audio routing | Standard keyboard shortcuts and ordinary audio playback suffice initially. |
| Mandatory cloud accounts, subscriptions, or hosted services | Offline local play is a core requirement. |
| AI that changes game state or makes gameplay decisions without DM approval | The DM remains authoritative. |
| Generated artwork as a prerequisite for mechanically valid maps | Editable structured geometry comes first; artwork is optional. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISP-01 | Phase 1 | Pending |
| DISP-02 | Phase 1 | Pending |
| DISP-03 | Phase 1 | Complete |
| DISP-04 | Phase 1 | Pending |
| DISP-05 | Phase 1 | Pending |
| MAP-01 | Phase 2 | Pending |
| MAP-02 | Phase 2 | Pending |
| MAP-03 | Phase 2 | Pending |
| ENCT-01 | Phase 3 | Pending |
| ENCT-02 | Phase 3 | Pending |
| ENCT-03 | Phase 3 | Pending |
| AUD-01 | Phase 4 | Pending |
| AUD-02 | Phase 4 | Pending |
| SRD-01 | Phase 5 | Pending |
| SRD-02 | Phase 5 | Pending |
| SRD-03 | Phase 5 | Pending |
| CHAR-01 | Phase 6 | Pending |
| CHAR-02 | Phase 6 | Pending |
| CHAR-03 | Phase 6 | Pending |
| AI-01 | Phase 7 | Pending |
| AI-02 | Phase 7 | Pending |
| AI-03 | Phase 7 | Pending |

---
*Requirements defined: 2026-10-28*  
*Last updated: 2026-10-28 after roadmap creation*  
