# Phase 1 demo and acceptance checklist

Use a fresh launch after setup in [README](../README.md). Stage 1 is the scene-presentation slice only; no map, token, or encounter features are expected.

1. Start the app with `npm run dev` and confirm the DM dashboard is available independently of the player display.
2. Select each bundled scene and inspect its private preview. Confirm selecting/previewing alone does not change the public output.
3. Use the explicit **Show on table** action. Confirm the player output changes to the selected scene and contains no dashboard controls or DM-only content.
4. Select and show a different scene; verify the public scene changes only after the explicit action and the same fullscreen window remains in place without exposing the taskbar.
5. Activate **Black out**. Confirm public output is entirely black, the player window stays fullscreen, and restoring a scene requires another deliberate show action.
6. With one display, confirm the public preview is a normal movable window and does not take over or mirror the dashboard.
7. If a second physical display is available, select it and check public window placement. Disconnect, reconnect, and reassign it; confirm the display selection refreshes and unsafe output is not exposed. These physical checks have not yet been performed for this review.
8. Review [verification status](verification-status.md) and [known limitations](known-limitations.md). Only platforms/hardware actually exercised may be accepted as verified.

## Evidence available

- Automated test, build, Windows self-contained backend package, and Windows package smoke results are recorded in [verification status](verification-status.md).
- Browser accessibility snapshot showed dashboard content; no console errors were observed after the dashboard's graceful API fallback.
- A browser screenshot was not captured: the screenshot tool required a visible desktop tab, which was unavailable. No screenshot is supplied or represented as evidence.
- The package smoke test packages resources and probes the backend; it does not demonstrate a physical second-display workflow.

## Review outcome

**Awaiting user acceptance.** Please run/review the workflow and reply with explicit Phase 1 approval, or list defects and the OS/device/display configuration tested. Do not proceed to Phase 2 before explicit approval.
