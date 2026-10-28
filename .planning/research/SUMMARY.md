# Project Research Summary

**Project:** DungeonDeputy  
**Domain:** Local-first, cross-platform desktop companion for in-person D&D sessions  
**Researched:** 2026-10-28  
**Confidence:** MEDIUM

## Executive Summary

DungeonDeputy is a Windows/macOS desktop companion for a DM controlling private session preparation while presenting only approved visuals on a second, table-facing display. The research and project brief converge on a strict Stage 1: a packaged app that launches, selects a display, previews one of a few bundled scenes privately, explicitly publishes or changes it, and can reliably black out the public screen; on a single display it provides a safe windowed preview. Stage 1 is a presentation slice, not a VTT or game-state platform.

Retain the brief's .NET 10 / ASP.NET Core, Electron, TypeScript, and React direction. Electron main should own windows, displays, and the backend process; separate DM and player renderers should communicate with a small, self-contained ASP.NET Core backend that owns authoritative state and serves an allowlisted public projection. Keep Stage 1 in-memory and offline, package the backend self-contained per target OS/architecture, and defer SQLite, SignalR, PixiJS, and all Stage 2+ gameplay features until their stages.

The highest risks are public disclosure across the DM/player boundary, display hot-plug or fallback failures, backend startup/shutdown races, and packages that only work on a developer machine. Mitigate these from the first slice with a black-by-default public window, structurally limited public DTOs, bounded backend readiness and owned process cleanup, loopback-only networking, and packaged/offline acceptance checks on actual Windows and macOS hardware. Do not claim a platform verified without physical testing.

## Key Findings

### Recommended Stack

The explicit stack is appropriate and is retained: .NET 10 LTS (`net10.0`) for the local authoritative API; Electron for native desktop windows and display APIs; TypeScript 5.9.x, React 19.2.x, and Vite for the local UI; Electron Forge for packaging; and self-contained .NET deployment per RID so end users need neither .NET nor Node installed. Pin exact stable versions and lockfiles at bootstrap; consume .NET servicing updates and keep Electron on a supported security-updated line.

Keep Stage 1 lean: ASP.NET Core/Kestrel bound only to `127.0.0.1`, readiness handshake and ephemeral/per-run port, bundled local assets, and in-memory state. SQLite (`Microsoft.Data.Sqlite`) is for later user-owned persistence; SignalR is for later player clients; PixiJS is for later maps. Do not add EF Core, a map renderer, or realtime infrastructure before needed. Actual package tooling/version compatibility, target RIDs, signing, and native/runtime paths must be validated when implementation begins.

**Core technologies:**
- **.NET 10 / ASP.NET Core:** Local authoritative backend; cross-platform and self-contained deployment supports offline installation.
- **Electron:** Native display/window lifecycle and a shared desktop shell; maintain supported versions and isolate renderers.
- **TypeScript + React + Vite:** Strictly typed DM and public UIs built as local static assets, with separate renderer/runtime configurations.
- **Electron Forge:** One packaging workflow for Windows and macOS artifacts; verify makers and signing per platform.
- **SQLite / SignalR / PixiJS:** Later-stage tools only—persistence, player synchronization, and map rendering respectively.

### Expected Features

The authoritative product brief defines the stages and scope; broad market search was contextual only and is not representative evidence. Stage 1 must demonstrate the smallest complete workflow and end with the project's demo checklist, tests as appropriate, run instructions, known limitations, and a review stop.

**Must have (table stakes):**
- Launchable Windows/macOS desktop app; target-platform status reported honestly.
- Separate DM dashboard and player presentation window; selectable table display and safe single-display windowed preview.
- Private preview of 2–3 bundled scenes, explicit show/change, and reliable blackout.
- Public/private separation enforced in architecture and acceptance tests; only approved presentation data reaches the public view.
- Offline operation, packaged backend/UI/assets, and sensible persistence limited to harmless preferences where useful.

**Should have (competitive, in assigned stages):**
- Stage 2 editable 2D maps, tokens, and save/resume; Stage 3 manual fog/hidden tokens and basic encounter control.
- Stage 4 soundboard and ordinary configurable keyboard/macropad events.
- Stage 5 offline, versioned, attributed 2024 SRD compendium; Stage 6 bounded SRD characters and opt-in local-network sheets.
- Stage 7 optional AI preparation proposals and editable map geometry, always reviewed/approved by the DM.

**Defer (v2+ / named later stages):**
- All Stage 2–7 gameplay, rules data, audio, network-player, and AI features during Stage 1.
- Online VTT hosting, accounts/cloud dependency, 3D/physics/pathfinding, proprietary rulebook imports, bespoke HID, universal character automation, and AI state changes.

### Architecture Approach

Use Electron main as the native coordinator and process owner; two distinct React renderers for DM and public display; and a packaged ASP.NET Core backend as the authoritative session-state owner. The public renderer consumes only a purpose-built allowlisted projection (scene asset and presentation mode), never a full session aggregate. Keep preview state separate from public state; only explicit Show promotes a scene, while Blackout is a first-class public state. Start public output black, recover safely on backend/display failure, and let Electron main—not renderers or backend—manage display/window operations. Keep a thin HTTP protocol and in-memory Stage 1 model; build vertical slices before abstractions.

**Major components:**
1. **Electron main:** Enumerates/revalidates displays, creates/moves windows, handles topology changes, and starts/monitors/stops the packaged backend.
2. **DM renderer + narrow preload:** Scene catalogue, private preview, explicit publication/blackout, and safe display controls through validated APIs.
3. **Public renderer:** Renders only approved public DTOs; defaults to black and cannot navigate to DM content.
4. **ASP.NET Core backend:** Owns Stage 1 state and command validation; exposes private control actions separately from the public projection.
5. **Bundled assets and packaging:** Supplies local sample scenes and per-RID backend artifacts; no runtime internet dependency.

### Critical Pitfalls

1. **Display topology changes strand output or show it on the wrong display** — Subscribe to add/remove/metrics events; revalidate remembered display choices; blackout and provide explicit safe fallback on disconnect; test mixed DPI, hot-plug, and single-display behavior.
2. **Private DM content leaks to the public screen** — Separate renderers and public DTO allowlist; no full-session data or broad Node/IPC access; black by default; test absence of private labels/data and dashboard controls.
3. **Backend startup/shutdown races, port collisions, or orphan process** — Main owns child lifecycle; use loopback and bounded readiness handshake, report actionable errors, monitor exit, and clean up only the owned process.
4. **Packaged app relies on developer-installed runtimes or wrong RID/assets** — Self-contained publish per supported OS/architecture; package full outputs and resolve resources from app paths; test installed artifacts on clean/offline machines.
5. **Mock tests overstate cross-platform support** — Combine state/integration tests with physical Windows and Mac monitor acceptance; record unavailable hardware as unverified.

## Implications for Roadmap

Based on research, suggested phase structure (keep the brief's stage boundaries and order; Stage 1 is the immediate MVP):

### Phase 1: Safe scene presentation (Stage 1)
**Rationale:** Proves the core private-control/public-output value and resolves the highest-risk display, privacy, and packaging assumptions before gameplay systems.  
**Delivers:** Runnable desktop shell, display selection, distinct DM/public windows, bundled scenes, private preview, explicit show/change, blackout, single-display windowed preview, offline packaged launch, demo checklist and review stop.  
**Addresses:** Stage 1 table stakes and public/private separation.  
**Avoids:** Leakage, topology/fallback failure, process lifecycle races, framework-dependent packages, and scope creep into maps/combat.

### Phase 2: Editable map and saved campaign slice (Stage 2)
**Rationale:** Builds on the proven public projection and introduces persistence only when user-owned map/token positions require it.  
**Delivers:** PixiJS 2D map, basic grid/scale, editable maps and tokens, saved positions and basic save/resume with approved public rendering.  
**Uses:** SQLite only as justified by the persistent domain model; keep private editor state separate from public projection.  
**Avoids:** Sending full editor/session state to the public renderer or prematurely building a generalized persistence platform.

### Phase 3: Hidden information and basic encounter (Stage 3)
**Rationale:** Depends on map/token state and persistence; hidden information adds a new privacy boundary that must be validated before rules/player integrations.  
**Delivers:** Manual fog/reveal, hidden tokens, HP, initiative/turns, compact encounter panel, minimal conditions/dice.  
**Implements:** Backend-authoritative state and filtered public projection.  
**Avoids:** Leaking hidden regions/actors; avoid advanced line-of-sight, pathfinding, and full rules automation.

### Phase 4: Soundboard and cues (Stage 4)
**Rationale:** Extends the already-working scene/blackout workflow with independent audio and keyboard controls; does not require the map/game model.  
**Delivers:** Sound pads/banks, ambience and one-shots, volume/loop/stop, saved key mappings, simple scene/blackout cues.  
**Avoids:** Focus-stealing shortcuts and bespoke HID/audio integrations; validate OS behavior.

### Phase 5: Offline SRD compendium (Stage 5)
**Rationale:** Treats data provenance/licensing as a first-class deliverable, then enables useful lookup and the Stage 3 monster-to-encounter link.  
**Delivers:** Bundled searchable 2024 SRD material with version/provenance/attribution, explicit missing-data behavior, and monster addition to encounters.  
**Avoids:** Unlicensed sourcebook content, fabricated entries, or executable rules-engine scope.

### Phase 6: Bounded characters and local player sheets (Stage 6)
**Rationale:** Depends on SRD definitions and encounter authority; changes threat model from loopback-only desktop to LAN and requires deliberate authorization design.  
**Delivers:** Limited SRD character creation/management and optional same-Wi-Fi sheets with explicit join/access controls and synchronization.  
**Avoids:** Unbounded character automation, unauthorized per-player data exposure, and enabling LAN access without dedicated security research.

### Phase 7: Optional AI preparation (Stage 7)
**Rationale:** Requires stable campaign/map/encounter concepts and rules grounding; safest as the final optional proposal workflow.  
**Delivers:** Structured preparation and editable geometry proposals that the DM previews and accepts; ordinary offline play remains unaffected.  
**Avoids:** Silent state mutation, AI/runtime dependency, unsupported rules claims, and treating generated artwork as valid map geometry.

### Phase Ordering Rationale

- Stage 1's window/privacy and lifecycle foundations are hard dependencies for every later public display feature; establish them before any hidden gameplay state.
- Stage 2 persistence precedes Stage 3 fog/encounters; Stage 5 data supports Stage 6 characters, while Stage 3 encounter authority also supports Stage 6 and Stage 7.
- Stage 4 is comparatively independent after Stage 1; preserve the prescribed stage order rather than pulling features forward.
- Implement one demonstrable, independently runnable vertical slice per stage; stop for review. Add no future-stage infrastructure merely to anticipate later needs.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Confirm Electron packaging/resource layout, child-process readiness and shutdown behavior, local origin/CORS and ephemeral port handoff; exact Forge makers/RIDs; physical Windows/macOS display and fullscreen/Spaces behavior.
- **Phase 5:** Verify 2024 SRD source/version, license, attribution, provenance, and reproducible import pipeline before selecting content.
- **Phase 6:** Perform a dedicated local-network threat model and research authorization/join codes, firewall behavior, sync/conflict semantics, and private-per-player projections before LAN binding.
- **Phase 7:** Research provider/API limits, structured generation validation, and review/approval UX when this stage is actually planned.

Phases with standard patterns (skip research-phase unless implementation details warrant it):
- **Phase 2:** Established 2D canvas, basic drag/edit, and local persistence patterns; research exact PixiJS/SQLite versions at implementation.
- **Phase 3:** Manual reveal/initiative/HP are conventional domain-state workflows; emphasize project-specific privacy tests rather than broad domain research.
- **Phase 4:** Basic local audio playback and configurable keyboard events are established patterns; confirm platform behavior during focused implementation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Official current docs support core direction, but exact package patches, Forge integration, RIDs and real packaging remain to verify; authenticated Context7 confirmed Electron display API names, while platform packaging remains untested. |
| Features | HIGH | Stage scope, ordering, dependencies and anti-features follow the authoritative brief and PROJECT.md; market evidence is explicitly weak and did not drive recommendations. |
| Architecture | HIGH | Boundaries follow project requirements and official Electron/.NET guidance; implementation details for display behavior and packaging still require physical/platform testing. |
| Pitfalls | LOW | Research source confidence is explicitly LOW under its provider classifier despite citations to official docs; use as concrete risk hypotheses and validate via tests/hardware. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Stage 1 physical acceptance:** No real Windows/macOS monitor, DPI, HDMI reconnect, or macOS Spaces tests were conducted. Schedule hands-on acceptance and do not substitute CI/mock evidence for platform verification.
- **Packaging and architecture:** Forge/builder details, exact supported CPU/RID matrix, signing/notarization, resource paths, and clean-machine behavior need implementation-time decisions and artifact tests.
- **Backend bootstrap:** Confirm ephemeral port handoff, local-origin/CORS strategy, readiness handshake, and bounded child cleanup in an early vertical slice; keep listener loopback-only.
- **Display preference stability:** Treat display IDs as best-effort only; re-enumerate and allow reselection/fallback.
- **Later-stage data/network risks:** Validate SRD provenance/licensing in Stage 5; revisit threat model and authorization before Stage 6 LAN access. Do not resolve these uncertainties by adding scope to Stage 1.
- **Version freshness:** Research versions were current as of 2026-10-28; resolve stable patches and lock them at project bootstrap.
- **Package verification:** The Phase 1 npm legitimacy gate flagged several just-published stable packages `[SUS]` due recency, despite high downloads and known repositories. Preserve the blocking human verification checkpoints before installing them; see `.planning/phases/01-safe-two-screen-scene-presentation/01-RESEARCH.md`.

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` and the project brief (`tabletop_dm_gsd_brief.md`) — product goals, explicit stack, stage sequence, constraints, and acceptance expectations.
- Official Microsoft .NET release/support, ASP.NET Core, deployment, and SQLite documentation — .NET 10 lifecycle, local backend and self-contained deployment.
- Official Electron process model, security, screen, BrowserWindow, and packaging documentation — main/renderer boundaries, display events, renderer security, and distribution.
- Official React, TypeScript, Vite, Electron Forge, SignalR, and PixiJS documentation — current framework guidance and deferred-stage technology behavior.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — version recommendations, package policy, platform implications, and alternatives.
- `.planning/research/ARCHITECTURE.md` — component boundaries, data flow, and Stage 1 build sequence.

### Tertiary (LOW confidence)
- `.planning/research/FEATURES.md` adjacent product/vendor search — contextual only; not a representative market survey.
- `.planning/research/PITFALLS.md` provider-classified evidence — risk inventory cross-checked against official docs, but platform-specific validation remains outstanding.

---
*Research completed: 2026-10-28*  
*Ready for roadmap: yes*
