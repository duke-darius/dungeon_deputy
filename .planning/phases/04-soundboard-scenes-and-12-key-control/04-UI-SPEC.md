---
phase: "04"
slug: "soundboard-scenes-and-12-key-control"
status: approved
shadcn_initialized: false
preset: none
created: "2026-10-29"
---

# Phase 4 — UI Design Contract

> Visual and interaction contract. Approved best-effort defaults per user direction.

## Design System

| Property | Value |
|----------|-------|
| Tool | none — extend existing manual CSS; no shadcn or dependency |
| Preset | not applicable |
| Component library | none |
| Icon library | none required; concise text labels and status indicators |
| Font | Existing command-desk system: Inter, Segoe UI, sans-serif body/controls; Georgia, serif headings |

Preserve approved Phase 3 command-desk visual system: ink/slate/chalk surfaces, thin borders, restrained brass and teal, square/low-radius controls, visible focus rings; no gradients or generic card grid. Add Audio inside existing dashboard workspace navigation, not a new window/dashboard. Battle map remains default and map-first. Audio and all its controls/configuration are explicitly DM only.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/label gaps |
| sm | 8px | Control gaps, compact padding |
| md | 16px | Control groups, inspector sections |
| lg | 24px | Workspace gutters |
| xl | 32px | Major layout separation |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

All values are multiples of 4. Exceptions: none. Controls target at least 44px high/wide where practical; use full-width controls on narrow layouts.

## Typography

Use only these four sizes and two weights (CSS px).

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / controls | 14px | 400 regular | 1.5 |
| Label / metadata | 12px | 400 regular | 1.4 |
| Section heading | 16px | 600 semibold | 1.25 |
| Workspace title | 20px | 600 semibold | 1.2 |

## Color

Proportions indicate visual emphasis, not literal pixel count; retain existing map-editor tokens.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | Ink #202523 | Dashboard and primary surfaces |
| Secondary (30%) | Slate #303835; line #414944 | Toolbar, bank strip, pad surfaces, borders |
| Accent (10%) | Brass #b58d51 / #c59e62; teal #4d837d | Brass: primary CTA, selected bank/pad, focus. Teal: active playback and healthy status |
| Destructive | Coral #b85f4b | Destructive actions and errors only |

Chalk #e8e0d1 is primary text; muted #aeb7ac is secondary. Accent reserved for “Import sound”, selected bank/pad, focus outline and active state marker. Teal may mark playing/looping and successful status only. Pair all state color with text; privacy always has lock plus “DM only”.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | “Import sound” |
| Empty state heading | “No sounds in this bank” |
| Empty state body | “Choose an empty pad, then import a sound to start your soundboard.” |
| Error state | “Couldn’t import this sound. Check the file and limits, then choose another file or try again.” |
| Destructive confirmation | Delete bank: “Delete ‘{bank name}’ and its 12 pad assignments? Imported sound files remain available only if assigned elsewhere.” Buttons: “Delete bank” / “Keep bank”. Clear pad: “Clear the sound from pad {number}? This does not delete the imported file.” Buttons: “Clear pad” / “Keep sound”. Reset cues: “Reset all cue shortcuts? Your pads and banks will stay unchanged.” Buttons: “Reset shortcuts” / “Keep shortcuts”. |

Use sentence-case labels: “Audio · DM only”, “Banks”, “New bank”, “Rename bank”, “Delete bank”, “Pad {1–12}”, “Import sound”, “Play”, “Stop”, “Loop ambience”, “One-shot”, “Master volume”, “Pad volume”, “Stop all”, “Cue shortcuts”, “Record shortcut”, “Clear shortcut”, “Reset shortcuts”, “Show scene”, “Show current encounter”, “Blackout”. Empty slot: “Empty”; unavailable assigned file: “File missing”. All imported names, bank/pad names and cue mappings remain DM-private.

## UI Considerations

Applicable state considerations resolved: 8 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Current bank pads; cue list | ✅ covered | Render exactly 12 numbered slots. Empty bank uses documented copy; unconfigured rows say “No shortcut set” with “Record shortcut”. |
| loading | Workspace, import, playback, bank/cue save | ✅ covered | Keep shell in place; show “Loading soundboard…”, “Importing sound…”, or “Saving shortcut…”, disable only pending action and announce politely. |
| error | Import/decode/limits, missing files, playback, cue save/dispatch | ✅ covered | Use documented retry copy and specific cause/next step (unsupported/corrupt, file/total limit, duration, missing file, playback unavailable). Preserve assignments; offer “Relink sound” / “Clear pad”. Never claim physical output. |
| populated | 12 pads, bank list, cue targets | ✅ covered | Each bank always has 12 stable pads; show name, assignment, mode, playback and volume. Textually distinguish empty, ready, playing, looping, missing. |
| partial | Sound assignment, shortcuts, playback | ✅ covered | Cancel/failure leaves prior pad unchanged. No shortcut is a valid state; show “No shortcut set”. Volumes show percentage. Playback never resumes on restart. |
| overflow | Names, pad grid, bank/cue lists | ✅ covered | Wrap/ellipsize with full accessible name; preserve all 12 slots and actions; scroll vertically rather than clip or force horizontal overflow. |
| zero-one-many | Banks, assets, active playback, cue mappings | ✅ covered | One bank is valid and undeletable; many banks selectable. State one ambience plus up to eight one-shots accurately; Stop all remains available. |
| long-text | File/bank names, errors/status | ✅ covered | Constrain/wrap text with full accessible name; status uses reserved non-overlapping region. |

### Interaction and layout contract

- Add Audio to existing workspace navigation; Battle map remains default. Use existing map-desk shell, toolbar, inspector, focus and status patterns; no new component library/dependency. Workspace switch stays in the same DM window.
- Audio workspace has persistent “Audio · DM only” plus lock. Bank selection/actions in compact rail or header, 12 pads as central work surface, master controls and shortcut editor grouped beside/below. Grid is 3 columns × 4 rows on desktop, 2 × 6 on phone. Exactly Pad 1–12 always render, sequential, stable and operable; never hide on hover.
- One named bank exists by default, with a maximum of 12 named banks per D-01. “New bank” creates 12 empty slots. Rename has labelled edit/save/cancel. Delete uses the confirmation above, deletes assignments only, and is disabled for final bank with explanation “Keep at least one bank.” Do not imply asset files are deleted.
- First-run Soundboard comes with three private, non-autoplaying CC0 sample sounds in Pads 1–3 (book open, door opens, coins handled); Pads 4–12 are empty. Present them with ordinary editable Play/Stop/Clear controls, not as locked/system assets. After the user clears an unreferenced sample, do not silently reinstall it on later launches.
- Import starts from selected empty/occupied pad through native picker only; never expose path text entry. Cancel preserves prior assignment. WAV, MP3 and Ogg-family are candidates, accepted only after actual decode in packaged runtime; do not advertise untested formats. Show limits beside import: 25 MiB per file, 256 MiB total, 10 minutes per sound. Import/decode failure preserves prior assignment and gives actionable retry. Missing assigned file stays visible with “Relink sound” and “Clear pad”.
- Each occupied pad exposes labelled Play/Stop and “Loop ambience”; One-shot is default. Explicit textual mode (“One-shot”/“Looping”) and state (“Playing”/“Looping”). Maximum one ambience loop and eight overlapping one-shots. At cap announce “Playback limit reached. Stop a sound or use Stop all.” Persistent prominent “Stop all” immediately stops all and is idempotent; it never removes assets/assignments. Master and per-pad 0–100% sliders show accessible numeric percent and adjust output without changing assignment.
- Cue editor has explicit target kinds “Play pad”, “Show scene”, “Show current encounter”, “Blackout”. Pad target selects bank/pad; scene target uses known-scene list; no arbitrary command/path. “Record shortcut” enters capture and becomes an explicit “Recording… · Cancel” action; Escape also cancels. Accept only in-app chord with Ctrl/Cmd + another modifier + a non-modifier key. Normalize/display chord, reject bare keys/unsupported chords; conflicts identify an existing bank/pad or human-readable scene name and do not steal. Provide per-row “Clear shortcut” and confirmed “Reset shortcuts” (mappings only). Announce “Saving shortcut…” and save/failure outcomes; disable conflicting edits while the current save is pending. None active until assigned; never register OS/global shortcuts.
- Safe cue semantics: Show scene targets a configured allowlisted scene ID and calls explicit Show; it does not depend on or save an unsaved scene selection. Show current encounter uses only the server-persisted map and its sanitized filtered raster; if the dashboard has unsaved edits or no persisted map, refuse with a clear status instead of auto-saving/publishing the draft. It never bypasses fog/token visibility. Blackout explicitly affects the table display, immediate and idempotent. Report success only after authoritative operation. On failure use “Couldn’t save this change. Your last saved state is unchanged; retry the action.” or specific failure copy; never claim a public state change that failed.
- Key precedence: editable controls/contenteditable/IME first; matching enabled cue chords second; focused canvas Arrow/Space/Enter behavior third; all other typing proceeds normally. Honor defaultPrevented/repeat and avoid duplicate canvas dispatch. Capture state explains chord requirement. App-window only.
- All controls keyboard reachable with semantic labels and pressed/checked/disabled state; visible focus and 44px practical targets. Sliders operate by keyboard. Reserved polite role=status/aria-live region announces import, save, playback and cue outcomes; never rely on sound/color alone. Respect reduced-motion; no essential motion. Follow 1050/820/580px breakpoints; tablet stacks controls below grid; phone uses one-column flow, 2-column grid, wrapped bank/action controls and scrolling without clipped actions.
- Audio/import APIs, local paths, names, banks, assignments, shortcuts and controls remain DM-private; public preload and presentation DTO remain unchanged. Assets/config persist; playback does not auto-resume. Automated state is not proof of audible physical output; make no hardware verification claims.

## Registry Safety

No design system is initialized; no registry or blocks are used. No registry vetting applies.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS — Tool: none; component inventory omitted by template rule.

**Approval:** approved 2026-10-29
