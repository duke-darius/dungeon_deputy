# Phase 2 demo and acceptance checklist

This review covers the playable digital battle map only. Start the app with `npm run dev` from the repository root. The workflow is local/offline and uses the app's per-user data folder.

## Demo steps

1. Launch the app and confirm there is one private Dungeon Deputy editor and the existing player display window.
2. Open **The Crooked Tankard** tavern map. Confirm the draft starts with four heroes and three goblins. Use **+ Blank map** to create a blank map if desired, then return to the tavern for the encounter demo.
3. Toggle **Square grid** and adjust **Scale**. The scale control changes visible grid spacing only; it does not promise physical tabletop measurement.
4. Pan by dragging the map background and zoom with the wheel. Confirm the map-space token positions remain coherent while the view changes.
5. Select a token; move it on the canvas, rename it, recolor it, and select bundled artwork. Add a hero and monster, then remove them to demonstrate the full editing controls. Keep the original seven actors for the persistence scenario.
6. Make a visible change to the tavern draft (for example, move one actor and adjust grid scale), then select **Save changes**. Confirm the saved status. Editing and saving must not change the player display.
7. Select **Show on table**. Confirm the tavern, grid settings, and approved tokens appear in the player display. The same player window remains open and fullscreen state is unchanged; no reload/window recreation is expected.
8. Change a token position or grid setting after Show and Save again. Confirm the player display still shows the previously approved snapshot until **Show on table** is selected again.
9. Select **Black out**. Confirm the public display is black immediately and remains black while editing or saving draft changes.
10. Quit the app completely and relaunch with `npm run dev`. Confirm the edited draft, grid settings, and all seven actor positions return. The saved approved snapshot is restored separately; explicitly select **Show on table** to publish the restored draft again.
11. Run the automated checks below after the manual review.

## Automated checks

```sh
npm test
npm run build
npm run test:e2e
npm run package:smoke
```

`npm test` includes nested `src/renderer/src/map/*.test.mjs` coverage. Package smoke launches the actual packaged Windows x64 backend with authenticated requests, a unique per-run token and temporary per-run user-data directory; it saves a draft, explicitly publishes it, changes the draft without publishing, stops and restarts the backend, checks independent draft/approved recovery, and explicitly publishes the saved edit. It does not use SQL to manufacture test state.

`npm run test:e2e` launches the actual Electron app and per-run packaged backend, then drives both windows through the Stage 1 scene workflow and Stage 2 map workflow. It verifies screenshots, private/public boundaries, token and camera actions, persistence, and stable windows while capturing paired manager/player screenshots and logs under ignored `artifacts/e2e/<run-id>/`. E2E windows are intentionally hidden and windowed to preserve the user's desktop; it is not a physical HDMI or fullscreen acceptance test. Display enumeration was exercised in the 2026-11-07 run; physical display wiring, hot-plug, and fullscreen behavior remain unverified.

## Artwork source and rights

Each bundled Phase 2 SVG includes its own XML-commented notice. All three are original vector artwork created for Dungeon Deputy contributors in 2026 and dedicated to the public domain under CC0 1.0 Universal: <https://creativecommons.org/publicdomain/zero/1.0/>.

- `assets/maps/tavern.svg` — original tavern floorplan.
- `assets/tokens/hero.svg` — original reusable hero token artwork.
- `assets/tokens/goblin.svg` — original reusable goblin token artwork.

## Design direction and critique

The two-pass design direction retains the Stage 1 command-desk palette: command ink `#202523`, slate `#344247`, chalk `#e8e0d1`, oxidized teal `#4d837d`, brass `#b58d51`, with moss `#718b68` limited to token artwork. Existing system sans serves controls; Georgia is reserved for scene titles. Narrow scene rail, broad tactile map, compact inspector, restrained token tray; labels stay left-aligned.

Critique rejected a generic cream-and-serif interface as inconsistent with the established command desk, all-dark neon as synthetic and off-palette, and card-grid chrome as competing with the map. The revision kept the inherited palette, quiet rails, explicit publication state/actions and map-first hierarchy. No gradients, new fonts, dashboard card grids or added packages.

## Review checklist and status

- [ ] Review tavern map and optional grid/scale, pan and zoom.
- [ ] Review the four-hero/three-goblin workflow and token edits.
- [ ] Confirm Save and quit/relaunch restore the draft.
- [ ] Confirm draft edits stay private until explicit Show; approved snapshot restores independently.
- [ ] Confirm blackout and the same fullscreen player window remain safe during map updates.
- [ ] Review the automated/platform evidence in [verification status](verification-status.md) and [known limitations](known-limitations.md).

**Human visual review is pending.** Automated verification does not constitute user acceptance. This plan makes no Phase 3 changes; Phase 3 implementation already exists elsewhere in this repository, so it is not accurate to describe Phase 3 as unstarted. Phase 2 uses current request/response refresh only: no SignalR or immediate push was added here. `CHAR-04` remains assigned to Phase 6. macOS and physical display behavior are unverified.
