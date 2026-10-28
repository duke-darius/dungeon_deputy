# Phase 1 architecture skeleton

## Runtime shape

- **Desktop shell:** Electron main process owns app lifecycle, monitor enumeration, window placement, and backend startup/shutdown. React renderer windows are separate; the player renderer receives only a purpose-built public presentation projection.
- **Backend:** .NET 10 / ASP.NET Core owns selected-scene and public-scene state. Kestrel binds only to `127.0.0.1` at the port passed in `DUNGEON_DEPUTY_PORT`; `/health` reports readiness after the app is running.
- **Scene contract:** bundled IDs are allowlisted. Selection changes only private state; `show` explicitly publishes a scene; blackout returns a scene-free black projection. Unknown IDs are rejected.
- **Packaging:** Electron Forge is the sole desktop packager. Its maker list uses Squirrel for Windows and ZIP for Darwin. `scripts/package-backend.mjs` publishes a self-contained .NET backend for `win-x64`, `osx-x64`, or `osx-arm64`.

## Persistence and resources

- No database. Live session/presentation state remains in memory.
- User preferences (last selected scene and display preference) should use a small local app-data file and be revalidated on launch; persistence is not yet implemented in this foundation.
- Bundled assets belong under app resources, separate from writable user data. Later packaging work will formalize the installed resource path.
- Development uses Vite on loopback, exact npm versions with `package-lock.json`, and .NET SDK 10. Tests use the .NET test runner; no direct npm test framework is installed.

## UI direction for later renderer work

Use the calm, wide command-desk composition in `01-CONTEXT.md`: soot ink `#20282B`, slate `#344247`, chalk `#E7E7DD`, oxidized teal `#4D837D`, aged brass `#B49A63`, and signal coral `#B85F4B`. Keep controls readable and plainly labeled, scene imagery dominant in the private preview, and public output limited to the scene or pure black. The current React entry is only a buildable shell; the dashboard and player experience belong to later Phase 1 plans.

## Deliberately absent

No maps, tokens, network/LAN listener, database, audio, compendium, character systems, or AI features are included. macOS packaging and physical display behavior remain unverified until tested on actual hardware.
