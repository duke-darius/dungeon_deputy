---
phase: "06"
slug: "srd-characters-and-local-player-sheets"
status: draft
shadcn_initialized: false
preset: none
created: "2026-11-04"
---

# Phase 06 — UI Design Contract

> Visual and interaction contract for DM-managed SRD characters, player pairing, assigned phone sheets, and live approved public status.

## Design System

| Property | Value |
|----------|-------|
| Tool | none; reuse existing project CSS and React patterns |
| Preset | not applicable |
| Component library | none; hand-authored React/CSS |
| Icon library | none detected; use text, native symbols, and explicit labels rather than introducing icon dependencies |
| Font | Existing system sans stack (Inter, Segoe UI, sans-serif) for controls/body; Georgia/Times serif for restrained section titles |

There is no `components.json`, no shadcn setup, and no installed component-system gate to run. Existing source is the design system: `.map-desk` private command-desk palette, compact left-aligned work areas, fine divider lines, small-radius panels, brass reserved for primary/selected state, teal for approved/live state, explicit focus rings, and 44px controls. The current React renderer is a single workspace with CSS-defined surfaces; extend that language rather than introducing SaaS dashboard cards, gradients, or a new visual theme. The phone experience is the same product vocabulary adapted for touch, not a miniature desktop dashboard. No screenshots were present in the repository; decisions are grounded in current source styling and Phase 5 UI contract.

## Phase Visual Direction

Make the **assigned character sheet** the phone's first and dominant object: a readable field ledger for the current session, not a generic profile page. On desktop, treat character management and player access as adjacent command-desk work areas: the DM can see ownership, pairing status, and authoritative stats at a glance. Distinguish private DM editing from the player's own permitted controls through clear section titles and a persistent privacy boundary. Use one strong memorable device only: a narrow brass edge on the selected character / active action, while the rest stays quiet and utilitarian.

### Layout concept and wireframes

Desktop: centered content capped near 1200px, left-aligned, 24px column gutters. Character collection occupies a narrow rail; selected character editor and derived-stat readout use the main area; player assignment/invite is a right-side session panel that moves below the editor at tablet widths. Keep the campaign's current player-access state visible without allowing QR to dominate the editor.

```text
DM desktop (>= 1000px)
+--------------------------------------------------------------------+
| Dungeon Deputy     Characters / session          LAN: closed/open  |
+-------------------+-------------------------------+----------------+
| Characters        | Mira Vale  [Save changes]     | Player access  |
| + New character   | Class / species / level       | Mira: unpaired |
| Mira Vale         | STR DEX CON INT WIS CHA       | [Create invite]|
| Oren Ash          | HP / AC / proficiency         | Invite masked  |
|                   | Inventory · resources         | [Reveal QR]    |
|                   | Supported rules only         | revoke / expiry|
+-------------------+-------------------------------+----------------+
| Approved table status: The Lantern Hall / Blackout / disconnected   |
+--------------------------------------------------------------------+
```

Phone: single-column, 16px side inset, no horizontal scrolling; status precedes sheet data. Put name, HP/AC, and connection status in the first screen. Use stacked sections or disclosure summaries for secondary stats, inventory, and resources. Editable permitted inventory/resource actions have full-width touch targets; do not show DM-only controls, another player's name/sheet, or combat authority controls.

```text
Player phone (320-430px)
+--------------------------+
| Mira Vale     Connected  |
| Lantern Hall · live      |
| HP 18 / 24     AC 15     |
| [HP changed by DM]       |
| Abilities / proficiency  |
| Inventory                |
| Rope  [−] 1 [+]          |
| Resources                |
| Second wind  [Use resource] |
| Scene: approved / black  |
+--------------------------+
```

The private DM entry point remains in the existing desktop workspace. A player's browser opens a narrowly scoped join or sheet view; it must not mount the DM workspace or preload surface. At narrow widths, stack and scroll naturally, wrap long labels, and keep action controls comfortably tappable. At desktop/tablet widths, preserve a clear reading order: identity → character state → allowed actions → public scene status.

## Spacing Scale

Declared values (multiples of 4px):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/text adjacency, compact inline controls |
| sm | 8px | Label/control gaps, dense list rhythm |
| md | 16px | Default field groups and phone gutters |
| lg | 24px | Panel padding and desktop columns |
| xl | 32px | Major section separation |
| 2xl | 48px | Page/workspace breaks |
| 3xl | 64px | Desktop-only outer breathing room |

Exceptions: controls and rows use minimum 44px interactive height, matching existing map/compendium patterns; this is a target size, not a spacing token. Phone horizontal inset is 16px.

## Typography

Declare exactly four sizes and two weights. Keep copy in sentence case; do not add decorative all-caps labels. Body and control text use the existing system sans; headings use Georgia as already established by the workspace.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Supporting / status | 12px | 400 | 1.4 |
| Body / control | 14px | 400 | 1.5 |
| Section heading | 16px | 600 | 1.25 |
| Page / character heading | 22px | 600 | 1.2 |

Use weight 400 for regular data and helper text, 600 for headings and primary emphasis. Use tabular numerals for HP, AC, modifiers, resource counts, and connection timestamps. Let character names wrap rather than truncate; long inventory names wrap at word boundaries.

## Color

Compact named palette, grounded in existing `.map-desk` tokens and neighboring panels:

| Name / Role | Value | Usage |
|-------------|-------|-------|
| Ink / dominant (60%) | `#202523` | Workspace/page background and darkest surfaces |
| Slate / secondary (30%) | `#303835` | Editor panels, selected navigation, form controls |
| Chalk | `#E8E0D1` | Main text and high-contrast foreground |
| Muted | `#AEB7AC` | Supporting text, metadata and quiet labels |
| Brass / accent (10%) | `#B58D51` | Primary save/create action, selected character edge, deliberate invite reveal emphasis only |
| Teal / approved state | `#4D837D` | Connected/live and DM-approved state; not used as a decorative second CTA |

Dominant/secondary/accent proportions are visual surface guidance: approximate 60% Ink, 30% Slate and 10% combined Chalk/brass/teal emphasis across the screen; do not paint every control brass. Text contrast takes precedence over exact proportions. Destructive actions use existing muted brick `#B85F4B` only for revoke/irreversible confirmation affordances and never as a general status decoration.

Accent reserved for: the single primary form action, selected character/active navigation marker, and intentional reveal control for a live one-time invite. Teal is reserved for approved, connected, or current status; it does not denote permission to edit. Disconnected/expired/blackout states must include text labels and icons/shapes in addition to color.

## Copywriting Contract

Use plain verbs, concise sentence-case copy. Distinguish `Save changes` (DM character edits) from player commands such as `Add item`, `Remove item`, or `Use resource`; never label a high-impact action only “Submit.”

| Element | Copy |
|---------|------|
| Primary CTA | `Save changes` in character editor; `Create invite` in player access; use only one primary per current task region |
| Empty state heading | `No characters yet` |
| Empty state body | `Create a supported character to start a player sheet.` |
| No matching player / invite | `No player is paired with this character yet. Create a one-time invite to connect a phone.` |
| Loading | `Loading character…` / `Connecting to the session…` |
| Error state | `The session could not be reached. Check that Dungeon Deputy is running on the same Wi-Fi, then retry.` |
| Disconnected state | `Disconnected. Your sheet may be out of date. Reconnect to load the latest approved state.` |
| Invite confirmation action | `Use this invite` |
| Expired invite | `This invite has expired. Ask the DM for a new invite.` Action: `Try another invite` returns to code entry. |
| Used invite | `This invite has already been used. Ask the DM for a new invite, then enter its code here.` Action: `Enter a new invite` returns to code entry. |
| Invalid invite | `We couldn't find an active invite with that code. Check the code and try again, or ask the DM for a new invite.` Action: `Try code again` returns to code entry with the field focused and editable. |
| Revoked character assignment | `Your access to this character was revoked. Your private sheet has been cleared. Contact the DM for a new invite.` Action: `Enter a new invite` returns to join. |
| Ended session | `This session has ended. Your private sheet has been cleared. Contact the DM to join a new session.` Action: `Join a new session` returns to invite entry. |
| SignalR/network disconnected | `Connection lost. Your sheet may be out of date; reconnecting…` Actions: automatic reconnect, plus `Retry connection` when reconnecting stops. |
| Backend/API error | `Dungeon Deputy couldn't complete that request. Check your connection and try again. If it keeps happening, contact the DM.` Action: `Retry request` repeats the failed request; preserve entered form values. |
| Destructive confirmation | `Revoke access for {player}? Their phone will disconnect and must use a new invite to rejoin.` Confirm action: `Revoke access`; cancel: `Keep access`. |
| Character removal confirmation | `Delete {character}? This removes the character and its player assignment. This cannot be undone.` Require explicit `Delete character` confirmation. |
| Unsupported option | `Not supported in this ruleset. Choose an available option; unsupported values are not calculated.` |

Use consistent language for permission: a player can submit allowed inventory/resource changes; the DM remains authoritative for combat HP, conditions, hidden information, and rules-derived values. When a DM changes HP, the affected player sees `HP updated by the DM` with the authoritative current value, not an editable HP control.

## Interaction and State Contract

### DM character management and player access

- Character list entries show character name, level/class/species where supported, and whether a player is unpaired/connected/disconnected. Selecting a character opens a labeled editor with editable source inputs separated from server-calculated ability modifiers, proficiency, HP, AC, level, and supported inventory/resources. Derived values are read-only and update only from authoritative save responses.
- Creating/editing is limited to supported SRD options. Label unsupported/unmodeled options explicitly as unavailable; never imply full rules coverage or present guessed calculations.
- Pair access is character-scoped. The DM creates an invite for exactly the selected character. Show selected character identity and expiry before reveal; invite state begins masked. Deliberate `Reveal QR` exposes the QR and copyable one-time code/URL in the DM-only surface. `Hide invite` remasks; never put a persistent player credential in a QR or URL. Do not place invite secret in logs, toasts, clipboard automatically, or player-facing display. Present a clear expiry and single-use warning alongside the reveal.
- Revocation is an explicit destructive action requiring confirmation that identifies the player/character. Once revoked, display `Revoked`; remove the active QR/code and do not imply the existing phone remains connected. Reissue only through `Create invite`.
- LAN session state is visible as `LAN access off`, `LAN access on`, or `Starting…`/`Stopping…`; distinguish it from a player's connected state. Do not imply TLS/encryption. If the transport uses HTTP, the join view must honestly identify the local-network limitation in concise explanatory copy before the user exposes an invite.
- DM live event status: `Approved scene: {scene}`, `Blackout active`, `Display disconnected`, and `Reconnecting…` are distinct labels. Only DM-approved scene/blackout state may appear on a player's sheet. No draft/current DM preview, map, hidden token, encounter, DM note, or other player's state is surfaced.

### Player assigned sheet

- Join entry accepts the one-time code or QR invitation without account registration or internet access. Communicate `This invite can be used once and is for {character}` before the player confirms. The exact confirmation button label is `Use this invite`. On invalid code, keep the editable entry form and provide `Try code again`; on a used code, explain it cannot be reused and offer `Enter a new invite`; on expiry, offer `Try another invite`. Do not classify invalid/used/expired as a generic network failure. After successful exchange, land directly on the assigned character sheet; do not offer a character picker.
- Sheet projection contains only the assigned character's permitted fields plus allowlisted public scene/blackout status. It never renders another player's identity or data, even transiently during loading, errors, reconnect, or stale cached views. No generic “all players” roster.
- Inventory/resource edits are limited to server-permitted operations; controls reflect available commands and pending state. Show updated value and sync result. If rejected or offline, retain no false success: `Change not saved. Reconnect and try again.` Do not silently queue a consequential action.
- HP/AC/derived stats and combat authority are read-only. A DM HP update replaces the current value and is announced to assistive technology; a player cannot make an HP adjustment by editing or submitting the display.
- Public scene status updates immediately from the authenticated, allowlisted live projection. During blackout show a neutral `Blackout active` status indicator (not a scene thumbnail or underlying title/art). A transient network/SignalR transport drop is passive: retain the current authorized sheet, mark it visibly stale, show `Connection lost. Your sheet may be out of date; reconnecting…`, and attempt automatic reconnect. Provide `Retry connection` if automatic reconnect stops. After transport reconnect, request and render a fresh authorized snapshot before restoring `Connected` or announcing live data; do not replay consequential player actions automatically.
- Fatal authorization/session states are distinct from transport loss and never offer a misleading transport retry: expired invite provides `Try another invite`; used invite provides `Enter a new invite`; invalid invite provides `Try code again`; revoked assignment provides `Enter a new invite` and `Contact the DM`; ended session provides `Join a new session` and `Contact the DM`. Backend/API request failures are separately recoverable with `Retry request` for that request and `Contact the DM` if repeated. Keep unsent form values when safe, but never show a success state for a failed request.
- On assignment revocation or session end, immediately remove the private sheet from the visible UI and clear its in-memory and persisted client cache before showing the fatal-state copy and recovery actions. Do not leave a stale sheet underneath a dialog, during navigation, or in a reconnect state. A fresh invite/new session must re-authenticate before any sheet content is rendered.

### Player failure-state contract

Render these as distinct, labeled states in the join/sheet region; each message is persistent until resolved, not a fleeting toast. Use a heading or `role=alert` for fatal invite/authorization/session failures and `role=status` with polite announcements for passive reconnect and request progress. Keep focus on the failed code field for invalid input; for terminal states, focus the state heading/action region without trapping focus. Retry actions repeat only the failed connection/request, rejoin actions return to invite entry, and `Contact the DM` is explanatory recovery (the app must not invent a contact link or expose private data). Never present a retry action for an invite already used or an ended session as though retry could restore access.

| Condition | Player-visible state and recovery |
|-----------|-----------------------------------|
| Invitation expired | `This invite has expired. Ask the DM for a new invite.` Offer `Try another invite`; retain no authenticated sheet. |
| Invitation already used | `This invite has already been used. Ask the DM for a new invite, then enter its code here.` Offer `Enter a new invite`; do not retry the same token. |
| Invitation invalid | `We couldn't find an active invite with that code. Check the code and try again, or ask the DM for a new invite.` Offer `Try code again`; keep code entry editable and focused. |
| Character assignment revoked | `Your access to this character was revoked. Your private sheet has been cleared. Contact the DM for a new invite.` Offer `Enter a new invite`; clear visible and cached private sheet immediately. |
| Session ended | `This session has ended. Your private sheet has been cleared. Contact the DM to join a new session.` Offer `Join a new session`; clear visible and cached private sheet immediately. |
| Network/SignalR disconnected | `Connection lost. Your sheet may be out of date; reconnecting…` Automatically reconnect; stale-mark retained sheet and offer `Retry connection` if automatic reconnect stops. |
| Backend/API error | `Dungeon Deputy couldn't complete that request. Check your connection and try again. If it keeps happening, contact the DM.` Offer `Retry request` for the failed request; preserve safe input and never claim the operation succeeded. |

## Alignment, Accessibility, and Motion

- Default left alignment for form labels, character values, explanatory copy, and list content; numeric stat values may align right in a compact label/value row. Avoid centered dashboard layouts and justified prose. Keep paragraphs below 80 characters per line where practical.
- Use semantic headings, fieldsets/legends for character groupings, explicit visible form labels, buttons for actions, and status semantics (`role=status`/polite live region) for save, connectivity, player edits, and incoming DM HP changes. Do not communicate state by color alone.
- Keyboard order follows the visible flow. Focus must remain visible at least 2px with the existing brass focus color and 2px offset; dialogs trap focus while open, return focus to the initiating control on close, and expose a labeled cancel action. Confirmations use text, never color-only or icon-only prompts.
- Minimum interactive target 44×44px on desktop and phone. Inputs must remain usable at 200% zoom; no horizontal overflow at 320px viewport. Respect `prefers-reduced-motion`; transitions are limited to action feedback and connection/reveal state changes, with no perpetual animation or auto-reveal. Motion must not be the sole indication of a live update.
- Do not use color-only status dots: accompany each by a text label. Announce pushed updates without moving focus or repeatedly announcing unchanged snapshots. A changed authoritative value is announced with field name and value. Fatal invite/revocation/session states use an announced, programmatically associated heading and clearly named recovery buttons; passive reconnect uses a polite status region and does not steal focus. After revocation/end, ensure accessibility tree and rendered screen contain no stale private sheet fields.

## Private / Public Content Contract

| Surface | Permitted content |
|---------|-------------------|
| DM character workspace | All managed characters, editable source inputs, derived calculations, assignment/player connection state, invite lifecycle and deliberately revealed one-time secret, DM-only details |
| Assigned player sheet | Exactly the authenticated player's assigned sheet projection, allowed inventory/resource actions, authoritative updates for that sheet, and allowlisted approved current scene or blackout status |
| Table display | Existing approved public presentation only; public scene/blackout state and no character roster, player sheet, invite, private sheet field, or DM management control |
| Join/invite page | Session/character identity needed to confirm one-time assignment, invite validity/expiry, and pairing instructions; no other player or campaign-private content |

The UI is not an authorization boundary: server responses and pushed events must already be scoped to the authenticated assignment and recipient. Never fetch/broadcast all character data and hide other records in rendering. Never reuse the desktop bearer token on a phone. The invite secret is a short-lived one-time secret: visually masked by default, revealed only in the DM private workspace after deliberate action, absent from public display/player content, never exposed as a persistent credential, and replaced/revoked rather than reused. Do not claim LAN HTTP is confidential.

## UI Considerations

Applicable UI state considerations resolved: 9 covered, 1 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Character collection, player pairing | ✅ covered | Render the copywriting-contract empty state with direct create/pair next action; never leave a blank panel. |
| loading | Character list/form, pairing, player sheet, live connection | ✅ covered | Use brief labeled in-flight text (`Loading character…`, `Connecting…`) and disable only the pending action; retain known sheet content with stale status during reconnect. |
| error | Save, join, player command, live connection | ✅ covered | Show concrete cause and next step from the copy contract; do not claim failed edits were saved. |
| populated | Character list, sheet, inventory/resources | ✅ covered | Display supported source inputs and server-derived values distinctly; phone starts with identity, HP/AC, and session status. |
| partial | Unsupported SRD entries, stale sheet, incomplete connection | ✅ covered | Mark unavailable mechanics as unsupported; stale data carries visible stale/disconnected status and is not presented as current. |
| overflow | Character lists, inventory, long rules names | ✅ covered | Scroll long collections within page; wrap long names/labels; no clipped fields or page-level horizontal scroll at 320px. |
| zero-one-many | Characters, inventory entries, resources, paired users | ✅ covered | Empty copy for zero; singular item/user wording for one; repeat rows with stable spacing and counts for many. |
| long-text | Names, item names, unsupported-option explanations | ✅ covered | Wrap at word boundaries, preserve full value, and allow page height to grow; do not use ellipsis for identity/secret/status. |
| interactive-control | Invite reveal/revoke, inventory/resource edit, reconnect | ✅ covered | Explicit labels, 44px target, visible focus, confirmation for revoke/delete, and stateful pending/success/failure feedback. |
| media | Invite QR / blackout presentation | 🧪 backstop | UI test/evidence must confirm QR is masked before deliberate reveal, appears only in DM surface, hides on close/revoke/expiry, and blackout exposes no underlying scene image. |

## Registry Safety

No shadcn initialization and no third-party registry/block usage. Existing app has no UI component library. Do not add registry blocks or dependencies as part of visual implementation without a separate legitimacy/safety review. QR rendering must use an already-approved/trusted implementation if available; otherwise preserve a copyable code/URL fallback and do not introduce an unvetted package.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: N/A — Tool: none, no installed component system

**Approval:** pending
