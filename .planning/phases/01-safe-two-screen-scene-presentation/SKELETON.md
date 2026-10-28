# Walking Skeleton — DungeonDeputy

**Phase:** 1
**Generated:** 2026-10-28

## Capability Proven End-to-End

> The DM can launch the local desktop app, privately preview a bundled scene, explicitly show it in a separate player window, and black out public output.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | .NET 10 / ASP.NET Core, Electron main/preload, TypeScript + React renderers | Selected project stack supports a local authoritative backend and native cross-platform display lifecycle. |
| Data layer | In-memory authoritative Stage 1 presentation state; small per-user preferences file for last scene/display | No Stage 1 campaign database is needed; preferences are the only persisted user choice. |
| Auth | No account/authentication; single-user local desktop, loopback-only backend, narrow renderer capabilities | Matches offline single-DM use; isolate renderer and API trust boundaries rather than adding accounts. |
| Deployment target | Packaged Electron app containing per-RID self-contained .NET backend and bundled scene assets | End users require neither .NET nor Node and can run offline. |
| Directory layout | Electron main/preload under `src/`, ASP.NET Core backend under `src/backend/`, React app under `src/renderer/`, distributable art under `assets/scenes/` | Separates native coordinator, authoritative state, private/public views, and packaged resources. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner)
- [x] Routing — independent DM and public renderer entry points
- [x] Database — no database; backend state is in memory and preferences use a validated local file
- [x] UI — scene selection and explicit publication/blackout wired to the API
- [x] Deployment — documented local full-stack run and packaged smoke command

## Out of Scope (Deferred to Later Slices)

- Maps, grids, zoom/pan, tokens, campaigns, and session save/resume
- Fog of war, hidden tokens, HP, initiative, encounters, and rolls
- Soundboard, audio, 12-key controls, compendium, character sheets, phone access, SignalR, and AI
- SQLite and any LAN listener

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Editable digital battle map, tokens, and persisted map/token state
- Phase 3: Fog of war and encounter controls with filtered public projection
- Phase 4: Soundboard and scene cues
- Phase 5: Offline attributed SRD compendium
- Phase 6: SRD characters and secured local-network player sheets
- Phase 7: Optional DM-approved AI preparation proposals
