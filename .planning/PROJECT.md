# DungeonDeputy

## What This Is

DungeonDeputy is a cross-platform, local-first companion that helps a Dungeon Master run in-person D&D sessions from a Windows or Mac laptop. It separates a private DM dashboard from a player-facing display connected to a second monitor, and grows through small, usable stages into battle maps, encounter tools, offline SRD reference, and optional player/AI features.

## Core Value

The DM can privately control the session while showing only approved visuals on the table display.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] A DM can launch the desktop app, choose a table display, privately preview a scene, show or change the scene publicly, and safely black out the player display.
- [ ] The table display never exposes DM controls, private notes, unrevealed content, hidden tokens, or prompts.
- [ ] Stage 1 works on Windows and macOS; a single-display setup has a safe windowed preview.
- [ ] The app is built incrementally as independently runnable vertical slices, verified before moving to the next stage.
- [ ] Local play remains possible offline; player-facing and DM-private state remain separated.
- [ ] When SignalR is introduced in Stage 6, DM-approved scene/blackout changes reach the table display and connected player sheets immediately, without polling delay or exposing unauthorized state.

### Out of Scope

- Online VTT hosting, matchmaking, cloud accounts, and a mandatory internet connection — the product is for in-person local play.
- AI-driven game decisions or state changes without DM approval — the DM remains authoritative.
- Stage 2+ gameplay features during Stage 1 — maps/tokens, fog of war, encounters, audio, SRD data, phone sheets, and AI are later stages.
- 3D, sophisticated physics/pathfinding, proprietary-rulebook imports, bespoke HID drivers, and mandatory cloud services — explicitly deferred by the project brief.

## Context

- Primary user: a DM running an in-person tabletop session, especially a newer DM who needs quick, obvious controls.
- Intended setup: laptop behind the DM screen plus an HDMI-connected player display laid flat on the table. Players must never see DM-only information.
- The private dashboard should remain usable for preparing the next scene while the current one is on the table display.
- Stage 1 is the smallest complete demonstration: launch, choose display, privately preview one of 2–3 bundled scenes, show/change scene publicly, and blackout safely. With one display, preview in a normal window.
- Later stages should remain progressively useful: editable battle maps and saved token positions; hidden information and basic combat; sound cues; an offline 2024 SRD compendium; SRD-only characters and local-network player sheets; optional AI-assisted preparation.
- Every stage ends with a demo checklist, tests where appropriate, known limitations, run instructions, and a stop for review.

## Constraints

- **Stack**: .NET 10 / ASP.NET Core backend, Electron desktop host, TypeScript + React UI, PixiJS for the later 2D map canvas, SQLite where useful, SignalR when player clients arrive — selected in the brief.
- **Platforms**: Windows and macOS release targets. Do not claim a platform was verified unless it was physically tested.
- **Packaging**: the installed desktop app should not require users to install .NET, Node, or developer tools.
- **Offline**: campaigns, maps, rules data, sound, and local play must work without cloud services or internet access.
- **Authority and privacy**: backend owns authoritative session state; display renderer only presents approved visuals and submits actions; private/unrevealed content must not leak to the player display.
- **MVP discipline**: keep dependencies modest, avoid premature abstractions, use simple tests for important state transitions, and do not build beyond the current stage.
- **Licensing**: future rules data is limited to properly licensed SRD material with attribution and provenance; no copyrighted sourcebook imports by default.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use the brief's .NET 10 + Electron + React direction | Cross-platform desktop shell with a local authoritative backend and practical web UI | — Pending |
| Build one independently usable vertical slice per stage | A visible, reviewable app after every stage reduces risk and prevents infrastructure-only milestones | — Pending |
| Keep the DM dashboard and player display as separate windows with separate content boundaries | HDMI output is public; private DM content must never be mirrored | — Pending |
| Begin with scene presentation and blackout, not map/game systems | This is Stage 1's smallest complete, testable workflow | — Pending |
| Use the Anthropic `frontend-design` skill for UI work | The UI should have an intentional visual identity grounded in tabletop play, not a generic dashboard template | — Pending |
| Add push-based public scene and blackout updates during the SignalR stage | Remove the current polling delay while keeping the DM authoritative and public state allowlisted | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-28 after initialization*
