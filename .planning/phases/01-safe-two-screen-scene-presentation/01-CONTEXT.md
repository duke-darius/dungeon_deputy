# Phase 1: Safe Two-Screen Scene Presentation - Context

**Gathered:** 2026-10-28  
**Status:** Ready for planning  
**Source:** Project brief + PRD express path

<domain>
## Phase Boundary

Deliver Stage 1 only: a runnable Windows/macOS desktop shell with a private DM dashboard, a separate player-facing scene window, a display selector, 2–3 bundled demo scenes, private preview, public show/change, immediate blackout, safe one-display windowed preview, and sensible persisted preferences. Keep the player window strictly free of DM controls, notes, and other private content.

Do not implement Stage 2 maps/tokens or any later gameplay, audio, compendium, character, player-network, or AI features. The phase ends with tests, a demo checklist, run instructions, known limitations, platform/hardware verification status, and a review stop.

</domain>

<decisions>
## Implementation Decisions

### Stage 1 behavior and safety
- The DM privately selects and previews a bundled scene; only an explicit “Show on table” action changes public output.
- The player-facing window is an independent borderless presentation window on the selected external display; it contains only the approved scene or a full black view.
- The DM can change the shown scene while remaining in the private dashboard.
- Blackout is immediate and always accessible as a distinct control; restoring a scene requires a deliberate DM action.
- With one display, do not force fullscreen or make the dashboard inaccessible: provide a normal, windowed player preview.
- If the player display disconnects or is reassigned, do not expose the DM UI or silently move the public window over private content; recover to a safe windowed preview/state and let the DM reselect.
- Persist the last selected scene and display preference when sensible, but revalidate saved display identifiers at launch.
- The backend owns current presentation state. The player window receives an allowlisted presentation model, never the full private dashboard/session model.

### Technology and scope
- Follow the chosen .NET 10 / ASP.NET Core + Electron + TypeScript/React stack; keep the backend small and local for this phase.
- Electron main process owns monitor enumeration, window placement, lifecycle, and communication boundaries. UI renderers do not own native display behavior.
- Package a self-contained backend for target platforms; avoid requiring users to separately install .NET, Node, or developer tools.
- Keep state/persistence minimal and avoid introducing SQLite, SignalR, PixiJS, or abstractions needed only by later stages.
- Bundled demo scenes must be available offline from a fresh install.

### UI direction (Anthropic frontend-design skill)
- Design for a DM working quickly behind a physical DM screen; clarity of public/private state and the current scene is more important than decorative fantasy styling.
- Palette: soot ink `#20282B`, slate `#344247`, chalk `#E7E7DD`, oxidized teal `#4D837D`, aged brass `#B49A63`, and signal coral `#B85F4B`. Use the bright chalk surface primarily for readable controls, not a full-page cream wash.
- Typography: a bundled, readable humanist sans for controls/body and an editorial serif for the session/scene title; avoid tiny all-caps eyebrows and monospace-as-decoration. Keep labels in sentence case.
- Layout concept: one calm command desk, left-aligned and wide-screen-first. A compact top bar identifies the session and public display status; a narrow scene rail selects the private preview; a large central image preview is the visual anchor; a right-hand “Table display” area shows selected monitor, public scene, and explicit “Show on table” / immediate “Black out” actions.
- Wireframe:
  ```
  + Session: The Ashen Road -------------------- Display: Table screen connected +
  | Scenes       | Private preview             | Table display                 |
  | [Ruined keep]| [large scene image]         | LG / HDMI                     |
  | [Moonlit fen]| Scene title + description   | Showing: Moonlit fen          |
  | [Old bridge] |                              | [Show on table] [Black out]  |
  +--------------+------------------------------+-------------------------------+
  ```
- Keep the public display deliberately quiet: edge-to-edge art or pure black, never chrome, pointers, toolbars, or transition overlays that reveal DM UI.
- Accessibility: strong keyboard focus, readable contrast, clear labels, and controls sized for fast use. Avoid motion not needed to communicate a scene change.

### Agent discretion
- Choose exact Electron/.NET project scaffolding and the simplest reliable local IPC/API boundary.
- Choose bundled scene art with suitable redistribution rights; record attribution/license if sourced externally.
- Choose platform-specific fullscreen/window sizing APIs and a simple preference persistence mechanism.
- Choose exact test framework and coverage focused on public/private state transitions, display fallback, and blackout.
- If a native monitor cannot be tested in this environment, document that acceptance item as unverified rather than claiming it works.

</decisions>

<canonical_refs>
## Canonical References

### Product scope and acceptance
- `tabletop_dm_gsd_brief.md` — product brief, stack, seven implementation stages, privacy boundaries, and acceptance criteria.
- `.planning/PROJECT.md` — core value, constraints, decisions, and scope boundaries.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements DISP-01 through DISP-05.
- `.planning/ROADMAP.md` — staged roadmap and Phase 1 success criteria.
- `.planning/research/SUMMARY.md` — ecosystem research and Stage 1 risks.

### Visual design guidance
- `C:/Users/aaron/.config/opencode/skills/frontend-design/SKILL.md` — distinctive visual design process and quality guidance.

</canonical_refs>

<specifics>
## Specific Ideas

- Include two or three atmospheric, rights-cleared demo scene images so the public display is useful immediately.
- Treat “private preview” and “showing on table” as visibly distinct states to prevent accidental reveal.
- The player display must stay free of dashboard layout even when only one monitor is available; the one-display fallback is windowed, not mirrored.
- Blackout must produce actual black, not an overlay containing controls or a status message.

</specifics>

<deferred>
## Deferred Ideas

- Maps, grids, zoom/pan, tokens, campaign/session editing beyond Stage 1 preferences, and save/resume.
- Fog of war, hidden tokens, HP, initiative, encounters, rolls, and combat controls.
- Soundboard, 12-key hardware shortcuts, cue banks, and advanced audio.
- Offline 2024 SRD compendium, character builder, phone sheets, SignalR, and local-network player access.
- AI content generation, provider keys, and map geometry generation.

</deferred>

---

*Phase: 01-safe-two-screen-scene-presentation*  
*Context gathered: 2026-10-28 via PRD Express Path*
