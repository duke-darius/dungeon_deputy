# Phase 3 demo: Fog of War and Encounter Control

## Automated checks

Run each command from the repository root:

```powershell
npm test
npm run build
npm run test:e2e
```

The Electron E2E uses isolated backend/database and Chromium profile data. Successful run output is `artifacts/e2e/<run-id>/run.log` and its screenshots are in `artifacts/e2e/<run-id>/screenshots/` (latest run: `artifacts/e2e/2026-10-29T21-12-01.188Z-b7022c3b/`). On failure, the harness retains the data, logs, and paired manager/player failure screenshots for diagnosis; successful temporary data is removed.

## Visible walkthrough

1. Start the desktop app with `npm run dev` (or `npm start` after building). Keep the DM map dashboard and its existing player window open.
2. If a map is currently public, choose **Enable fog** and confirm that doing so conceals the map. Fog initializes completely concealed.
3. Select **Reveal**, paint across a room/corridor, then select **Hide** and paint back over part of it. Save is not a publication action; completed persisted strokes update an already-shown encounter through the existing one-second player poll.
4. Select a map token, choose **Hide token**, then reveal terrain beneath it. Terrain and token visibility are independent. Choose **Show token** to restore it.
5. Use **Show encounter** to explicitly publish the filtered map. Only revealed terrain and visible token visuals should appear. A black table status stays black until this explicit action.
6. Select a token to manage HP, curated conditions and manual or d20 initiative. Adjust tied actors with the adjacent order arrows and use **End turn**. Roll standard dice with an optional signed modifier. Private values and results are labeled **DM only**.
7. Restart the application. The persisted fog, token and encounter state should restore in the DM dashboard while the public window starts black. Nothing is republished until **Show encounter** is selected again.
8. After Show, commit another Reveal/Hide stroke or token visibility change and observe it on the player window within the existing one-second polling interval. Use **Black out** to return the same player window to black.

## Evidence limits

Automation exercises backend persistence, renderer state, pixel masks, and the existing two-window lifecycle. It does not prove readability on a physical HDMI display, hot-plug behavior, true fullscreen/GPU behavior, or macOS packaging/runtime. Those remain unverified until tested on the relevant physical host. Phase 3 is not considered complete solely by this demo or E2E run.
