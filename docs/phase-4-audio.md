# Phase 4 Audio and Cue Controls

## Private soundboard

The Audio workspace and its names, banks, local files, assignments, and cue shortcuts are DM-only. Import from the native file picker; paths are not entered into the app. Current limits are 25 MiB per file, 256 MiB total retained audio, and 10 minutes per sound. Staged imports are bounded and discarded on decode/save failure; assignments are committed atomically. Clearing the last slot reference deletes the imported file after the settings save succeeds. Decoded buffers are capped at 192 MiB; playback allows one ambience loop and up to eight one-shots. Playback starts only after an explicit Play or cue action and is silent after restart. Missing files keep their assignment and can be relinked.

New installations start with three ordinary, editable Kenney RPG Audio CC0 defaults—Book open, Door opens, and Coins handled—on Pads 1–3; Pads 4–12 remain empty. They are copied from packaged PCM WAV resources into app-owned audio storage only on first setup or migration of a pristine legacy soundboard. A separate durable installation marker ensures clearing the defaults does not make them reappear. Existing customized/non-empty soundboards are left as-is. These bundled WAVs are distinct from the original Ogg files under `scripts/e2e/open-audio/`, which remain user-import test fixtures. Source provenance, license and hashes are recorded in `assets/audio-defaults/README.md`; the original CC0 license is retained with both asset sets.

WAV, MP3 and Ogg-family extensions are candidates, not a support guarantee. Electron E2E imports and decodes a generated WAV plus three CC0 Ogg Vorbis examples from Kenney's RPG Audio pack (`scripts/e2e/open-audio/`; source and license are recorded alongside the files). This verifies these fixtures in the Windows Electron test runtime; MP3, macOS codecs and other packaged-runtime combinations remain unverified. Automated playback state does not prove audible speaker output.

## Cue shortcuts

In Audio, add a cue, choose Play pad, Show scene, Show current encounter, or Blackout, then record a unique **Ctrl/Cmd + Shift/Alt + key** chord. Bindings persist on this device and work only while this app window is active. Escape cancels recording. Text fields, IME composition, repeated or already-consumed events do not trigger cues; the canvas retains its ordinary Arrow, Space, and Enter behavior. Clear removes a shortcut; Reset shortcuts requires confirmation.

Show scene explicitly shows the configured scene and never publishes a private preview just by selection. Show current encounter refuses while map edits are unsaved or no map is available; it never saves a draft on the user's behalf and publishes only through the existing sanitized fog/visible-token route. Blackout and all other cue outcomes are reported only after the existing command succeeds. Public display APIs and payloads do not contain cue or audio metadata.

## Verification and support boundaries

`npm test`, `npm run build`, `npm run test:e2e`, and `npm run package:smoke` exercise code, isolated Electron flows, persistence, public privacy, and packaged backend behavior. They do not verify physical speakers, HDMI/second-display behavior, macOS, or codec support not exercised in the current packaged runtime. Only Windows automated execution is recorded for this phase; no physical hardware or macOS test is claimed.
