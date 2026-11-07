# Known limitations and unverified behavior

- No physical HDMI/display hot-plug test has been performed. External-display selection, disconnect, reconnect, and reassignment are not physically verified.
- The single-display windowed workflow is covered by application logic and automated checks, but has not received physical desktop acceptance in this run.
- macOS packaging, runtime, hardware, and physical workflow are unverified. Neither macOS x64 nor macOS arm64 is claimed tested. Their backend publish/package targets are configured only.
- Windows package smoke verifies packaged resources and starts/probes the self-contained backend; it does not verify a physical second display, installed-app visual workflow, or hot-plug behavior.
- No screenshot was captured because a visible desktop tab was unavailable to the screenshot tool. Browser accessibility content was inspected, but this is not a substitute for physical desktop visual review.
- Browser dashboard content was visible in the accessibility snapshot, with no console errors after graceful API fallback; this does not establish full API-connected or multi-monitor behavior.
- Map import is not available; maps are the bundled tavern or a blank map.
- DM fog-of-war, token visibility, HP, initiative, and encounter controls are implemented on the desktop; they are not exposed as player commands or private player data. Player sheets currently show character maximum HP only; DM current-HP-to-assigned-sheet synchronization is not implemented.
- Opt-in private-interface LAN pairing, assigned browser sheets, and SignalR scene/blackout updates are implemented and locally automated. Physical two-phone/private-Wi-Fi reachability, firewall behavior, and operator acceptance of unencrypted HTTP remain unverified; CHAR-02, CHAR-03, and CHAR-04 remain pending.
- Character support is intentionally bounded to source-cited level-1 Barbarian/Dwarf calculations. Player inventory is bookkeeping only; spell/resource options and their calculations are unavailable. CHAR-01 remains pending broader required calculation coverage.
- Grid scale changes visible grid spacing, not measured tabletop distance.
- Phase 2 Windows x64 automated package checks do not establish macOS x64/arm64 runtime behavior or physical HDMI/display behavior; these remain unverified.
- Phase 2/3 planning and acceptance status remains governed by the roadmap; this Phase 6 automation does not change either phase's status.
