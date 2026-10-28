# Known limitations and unverified behavior

- No physical HDMI/display hot-plug test has been performed. External-display selection, disconnect, reconnect, and reassignment are not physically verified.
- The single-display windowed workflow is covered by application logic and automated checks, but has not received physical desktop acceptance in this run.
- macOS packaging, runtime, hardware, and physical workflow are unverified. Neither macOS x64 nor macOS arm64 is claimed tested. Their backend publish/package targets are configured only.
- Windows package smoke verifies packaged resources and starts/probes the self-contained backend; it does not verify a physical second display, installed-app visual workflow, or hot-plug behavior.
- No screenshot was captured because a visible desktop tab was unavailable to the screenshot tool. Browser accessibility content was inspected, but this is not a substitute for physical desktop visual review.
- Browser dashboard content was visible in the accessibility snapshot, with no console errors after graceful API fallback; this does not establish full API-connected or multi-monitor behavior.
- Map import is not available; maps are the bundled tavern or a blank map.
- Fog of war, hidden tokens, HP, initiative, combat automation, and encounter controls are not implemented (Phase 3 scope).
- LAN access, phone clients, and immediate push/SignalR updates are not implemented. Public updates use existing request/response behavior; `CHAR-04` remains Phase 6 scope.
- Grid scale changes visible grid spacing, not measured tabletop distance.
- Phase 2 Windows x64 automated package checks do not establish macOS x64/arm64 runtime behavior or physical HDMI/display behavior; these remain unverified.
- Phase 2 remains pending human review. Phase 3 is proposed only and has not started.
