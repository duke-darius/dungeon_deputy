---
phase: "04"
slug: "soundboard-scenes-and-12-key-control"
status: confirmed
created: "2026-10-29"
source: user-directed best-effort defaults; no open clarification requested
---

# Phase 4 Context — Soundboard, Scenes, and 12-Key Control

## Goal and Requirements

Implement AUD-01 and AUD-02 in the existing local-first Electron dashboard. The DM can import local audio into named banks with exactly 12 pads each, control volume, loop ambience, play one-shots, stop all playback, and bind persistent in-app shortcuts to sound and safe scene/map/blackout cues.

## Locked Scope and Safety

- Keep all sound files, audio playback, bank/pad configuration, and shortcut configuration private to the DM window. The public window must gain no audio/import API and public presentation DTOs must not contain local paths, sound names, banks, or shortcut mappings.
- Remain offline/local-first. No audio package, hosted service, custom HID/MIDI/Stream Deck driver, or global OS keyboard shortcut.
- Use the existing Electron main/preload boundary: native file chooser and file import in main behind DM sender checks; opaque asset IDs and validated metadata across IPC; no renderer-supplied arbitrary file paths.
- Scene selection remains private until explicit Show. A shortcut may show a selected/bundled scene, show the current map/encounter using its existing approved filtered state, or black out. A map cue must never bypass existing fog/token visibility or publish a DM-only draft.
- Keyboard bindings are in-app and ignored while an editable field/contenteditable/IME composition is active. Do not steal normal typing or the Phase 3 map canvas arrow/Space/Enter behavior. No registration with `globalShortcut`.
- Report only Windows/macOS/platform audio formats actually exercised. Hardware speaker output is a manual check; automated playback-state tests do not prove sound reached physical speakers.

## Best-Effort Product Defaults (Assumptions; No Follow-Up Questions)

- **D-01 — Bank shape:** one named bank exists by default; each bank always has exactly 12 stable slots; create/rename/delete is supported, the final bank cannot be deleted, and a conservative maximum of 12 banks bounds persisted state. Pad assignments persist across restart.
- **D-02 — Volume and voices:** expose master and per-pad volume (0–100%). A loop toggle marks ambience; one-shot remains the default. At most one ambience loop and eight overlapping one-shots may run. Stop All is immediate and idempotent.
- **D-03 — Import/resource limits:** native picker offers WAV/MP3/Ogg-family candidates, but a file is accepted only if real decode succeeds in the packaged runtime. Do not advertise a codec unless tested. Enforce 25 MiB per file, 256 MiB total imported assets, ten minutes maximum duration, and 192 MiB decoded-buffer cache; actionable failures preserve prior assignments and missing files remain recoverable.
- **D-04 — Storage:** store imported files under app-owned user data with generated opaque filenames/IDs and safe display metadata. Persist bank/pad/cue configuration atomically; never persist or accept a renderer-controlled absolute path.
- **D-05 — Cue bindings:** use in-app modifier chords (at least Ctrl/Cmd plus another modifier plus a key); no bare printable keys. Bindings are unique and can target a pad, configured Show Scene, safe Show Current Encounter, or Blackout. Provide capture, conflict feedback, clear and reset flows. The default soundboard has no active shortcuts until configured or deliberately initialized.
- **D-06 — Keyboard arbitration:** editable controls/IME first; then enabled cue chords; then focused canvas navigation/brush controls; unmodified typing otherwise proceeds normally.
- **D-07 — Playback lifecycle:** Web Audio is private-renderer playback created/resumed from a user gesture, with shared master gain and tracked per-source gains/stop lifecycle. Playback never auto-resumes after restart; assets and configuration do.

## Success Evidence

- Unit tests cover exactly-12 bank/pad invariants, import validation/limits, volume and loop/one-shot state, stop-all/resource cleanup, shortcut normalization/conflicts/focus filtering and persistence.
- Electron E2E uses isolated temporary app data and deterministic local audio bytes to import/play/loop/stop, restart, test shortcuts, and verify private/public separation and no typing/canvas-key conflicts.
- Run `npm test`, `npm run build`, `npm run test:e2e`, and packaged smoke where host permits. Mark macOS/hardware output unverified unless actually tested there.

## Explicit Non-Goals

- No SignalR, player-side sound controls, online streaming, mixing console, audio effect chain, automated fog-region painting, or advanced scene automation.
- Phase 5 SRD, Phase 6 character/player clients, and Phase 7 AI remain out of scope.
