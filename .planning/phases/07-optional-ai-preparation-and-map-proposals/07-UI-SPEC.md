---
phase: "07"
slug: "optional-ai-preparation-and-map-proposals"
status: draft
shadcn_initialized: false
preset: none
created: "2026-11-07"
---

# Phase 07 — UI Design Contract

> Visual and interaction contract for optional DM-only AI preparation and editable proposals.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none; extend existing hand-authored React/CSS system |
| Preset | not applicable |
| Component library | none |
| Icon library | none detected; use text labels and native symbols only when paired with explicit labels |
| Font | Existing system sans (Inter, Segoe UI, sans-serif) for controls/body; Georgia/Times serif for restrained workspace titles |

No root or nested project `AGENTS.md`, `components.json`, screenshot images, or screenshot artifacts were found. Visual direction is therefore grounded in the current `.map-desk` source styling and existing phase UI contracts, not screenshots. Reuse the Dungeon Deputy command-desk vocabulary: dark ink and slate surfaces, fine divider lines, restrained brass for primary/selected state, teal only for approved/current state, compact left-aligned panels, small radii, visible labels, and 44px controls. Do not introduce a SaaS dashboard aesthetic, gradients, a new font, icon package, or component dependency. The workspace and all proposal payloads are DM-only; do not mount these controls or content in player/table windows.

---

## Phase Visual Direction

Make this feel like a quiet preparation bench attached to the existing DM command desk: a task/request rail, a deliberately bounded prompt/context form, and a large private proposal review surface. Persistent status must make the optional cloud dependency and private boundary obvious without making AI look authoritative. Brass marks the one forward action in the active region; teal marks local/approved facts only. Keep generated content visually distinct from campaign content until the DM accepts it.

### Desktop layout (>= 1000px)

Use the existing DM shell/topbar and a left-aligned workspace capped at 1200px, with 24px desktop gutters/gaps. Three columns: a 190–220px request-type rail; a flexible 1.0fr request/editor column; and a 300–360px status/context column. The private proposal review replaces or occupies the request/editor main region after generation; do not open a public display or overlay its content over campaign presentation.

```text
DM command desk — Preparation / AI optional                         [AI status]
+--------------------+--------------------------------+-----------------------+
| Prepare            | New proposal                  | Provider              |
| NPC                | Request type: Encounter       | Not configured        |
| Encounter          | Prompt / constraints          | AI is optional        |
| Short adventure    | [bounded multiline prompt]    | [setup guidance]      |
| Scene description  | Campaign context: none        |                       |
| Map geometry       | [explicit selected context]   | External sharing      |
|                    | [ ] Share listed data with    | Unchecked until each  |
|                    |     configured provider       | request               |
|                    | [Generate proposal]           |                       |
+--------------------+--------------------------------+-----------------------+
| Local campaign, map, encounters and table display remain usable offline     |
+----------------------------------------------------------------------------+
```

Review state: retain request type and editable input; show a strong `PRIVATE PROPOSAL — NOT IN CAMPAIGN` banner. Render a readable field-level before/after diff, a private map geometry canvas for geometry proposals, and separate source/narrative groupings. Place `Edit proposal`, `Adjust request`, `Regenerate`, `Discard proposal`, and `Accept and create draft` as separate labeled actions; acceptance is never adjacent to an unlabeled icon or implied by generation. The visible review identifies the private destination and states that acceptance does not publish/show; explicitly selected, locally catalogued monster records may be added through the existing encounter flow and receive supported editable map tokens only after this separate action.

### Narrow desktop/tablet (581–999px)

Collapse the provider/context rail beneath the request controls; place request type choices in a horizontally scrollable but keyboard-reachable labeled list or wrapped tabs. Keep proposal content first in reading order, comparison and source references below it. Never compress the review into illegible side-by-side columns.

### Small viewport fallback (<=580px)

Desktop DM renderer is primary; if window is resized, use a single column, 12–16px inset, natural document scrolling, wrapped long text, and full-width major actions. Do not require horizontal scrolling to inspect or edit a proposal. Map geometry canvas remains at least 240px high with labeled non-canvas controls for selecting/editing/removing each shape. Preserve the same private banner, consent, and explicit acceptance boundary at every width.

---

## Spacing Scale

Declared values (multiples of 4px), matching the existing command desk:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline label/control adjacency |
| sm | 8px | Compact control and list rhythm |
| md | 16px | Field groups and small viewport inset |
| lg | 24px | Panel padding and desktop column gaps |
| xl | 32px | Major section separation |
| 2xl | 48px | Workspace grouping |
| 3xl | 64px | Desktop-only outer breathing room |

Exceptions: all interactive controls have a minimum 44×44px target; the map canvas may be shorter only when the window itself is shorter, and then remains directly reachable by scrolling.

---

## Typography

Declare exactly four sizes and two weights. Use sentence case; proposal identifiers and citations may use monospace only if needed for legibility, but do not add a fifth size.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Metadata / status | 12px | 400 | 1.4 |
| Body / controls | 14px | 400 | 1.5 |
| Section heading | 16px | 600 | 1.25 |
| Workspace / proposal title | 22px | 600 | 1.2 |

Use weight 400 for body and generated prose, 600 for headings, selected labels, and primary-action emphasis. Keep long generated text at a readable measure (max 80ch); wrap rather than truncate titles, citations, or content. Use tabular numerals for geometry coordinates and counters.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#202523` | Workspace and deepest surfaces |
| Secondary (30%) | `#303835` | Forms, preview panels, request rail and controls |
| Accent (10%) | `#B58D51` | Only the active region's primary action, selected request type marker, and keyboard focus treatment |
| Destructive | `#B85F4B` | Discard confirmation/destructive warning only |

Supporting colors: Chalk `#E8E0D1` for primary text; Muted `#AEB7AC` for metadata; Teal `#4D837D` for locally verified/current/DM-approved state only. `AI-suggested` and `Unverified` labels use explicit text and a neutral/brass outlined badge, not teal/approved styling. External sharing warning uses readable text plus a restrained warm border, not destructive-action styling. Approximate surface ratio is 60% ink / 30% slate / 10% combined text and emphasis; contrast overrides exact ratios.

Accent reserved for: one primary request action (`Generate proposal`) or one review action (`Accept and create draft`) in its current region, selected request type marker, and focus ring. Never color all buttons brass. Teal is never used to imply AI correctness or provider availability.

---

## Copywriting Contract

Use plain action verbs and concrete next steps. Do not call the model an authority, adjudicator, or rules engine. Generation is a request; acceptance is a distinct campaign action.

| Element | Copy |
|---------|------|
| Primary CTA | `Generate proposal` |
| Review acceptance CTA | `Accept and create draft` |
| Empty state heading | `No proposal yet` |
| Empty state body | `Choose a preparation type and describe what you need. Your campaign stays unchanged until you review and accept a proposal.` |
| Error state | `The proposal could not be generated. Your campaign is unchanged. Check AI status or your connection, then try again.` |
| Destructive confirmation | `Discard proposal`: `Discard this private proposal and its edits? It has not changed your campaign.` Confirm: `Discard proposal`; cancel: `Keep editing`. |
| External-sharing consent | `This request sends the prompt and any data listed below, including selected local SRD excerpts, to the configured provider. Do not include private player sheets, hidden tokens, fog, DM secrets, or unselected campaign data. The request leaves this device; provider storage controls do not prevent external processing.` |
| AI authority label | `AI-suggested · Unverified` |
| Local reference label | `Local SRD reference · verified in this catalog` |
| Rules limitation | `The AI is not a rules authority. Use the cited local SRD record for rules; unsupported or uncited mechanics are unverified suggestions.` |
| Private preview label | `PRIVATE PROPOSAL — NOT IN CAMPAIGN` |
| Accept boundary | `Accepting creates a private draft only. It does not show a scene, publish a map, add tokens, or change an encounter.` |

---

## Interaction and State Contract

### Workspace and request types

- Provide five explicitly labeled request types: `NPC`, `Encounter`, `Short adventure`, `Scene description`, and `Map geometry`. Selection changes the labeled fields and typed preview only; it never initiates a request.
- Prompt is blank by default; the only additional outbound context is excerpts/provenance for local SRD records explicitly selected by the DM. Stored campaign/map/encounter/player/hidden state is never sent or selectable. Require fresh affirmative opt-in for every outbound request, including regeneration; never infer consent from saved preferences, provider setup, or a prior request. The disclosure and consent control stay visible immediately above `Generate proposal`.
- A false/unselected consent state disables submission and explains why. Enumerate selected local record names/IDs and excerpt/provenance fields in the disclosure immediately before each request.
- This is a preparation workflow, not campaign setup gating: local maps, encounters, compendium, characters, scenes, and other offline workflows remain reachable and functional regardless of AI state.

### Provider status and failure states

Status is a persistent labeled region near workspace title and provider section; do not rely on a dot or color alone. Status read must be local and must not trigger a startup network request. Provider key/model details are never rendered; show only safe configuration state.

| State | Visible contract and behavior |
|-------|-------------------------------|
| Disabled | `AI preparation is off. Existing campaign tools are available.` Keep setup/status guidance available; disable generation only. |
| No key / not configured | `No provider key configured. AI proposals are unavailable.` Explain process-environment configuration; never ask the DM to paste a secret into renderer settings. |
| Offline / provider unavailable | `AI provider is unavailable. Your campaign is unchanged; local tools still work.` Offer `Retry generation` for the failed request only. |
| Error / refusal / invalid output | `The proposal could not be generated. Your campaign is unchanged. Check AI status or your connection, then try again.` Preserve request text; never render raw provider response/error. |
| Timeout | `The request timed out. No proposal was created and your campaign is unchanged.` Offer `Retry generation`; no automatic retry loop. |
| Generating | `Generating private proposal…` Announce politely, prevent duplicate submit, preserve entered values, and allow safe cancel if supported. |
| Configured | `Provider configured · Requests require your approval` Never display secret, secret fragments, environment dump, or unredacted provider diagnostics. |

### Private preview, edit, and accept

- Generation is read-only and returns a transient proposal. All generated values show `AI-suggested · Unverified`; never persist, publish, or mutate campaign state during request, preview, edit, regeneration, or discard.
- Preview supports structured NPC, encounter, short-adventure, and scene-description fields. Provide a human-readable field-level diff/change list, with additions, edits, and omitted fields stated in text; do not require color perception. Keep proposal and campaign values clearly labeled and separate.
- Map geometry preview uses app-rendered, bounded primitives only. Give each shape a labeled row with type, coordinates/dimensions, edit controls and `Remove`; provide `Add geometry` only for supported primitives. Shape edits must be visible in preview and review diff. No model-authored SVG, URL, script, image, or executable rendering content. Geometry is not a token and does not create/alter tokens.
- `Edit proposal` permits direct correction of proposal fields. `Adjust request` returns to request form without silently clearing it. `Regenerate` replaces the current transient proposal only after an explicit action and warns that current proposal edits will be discarded; it requires fresh external-sharing consent for the new request. `Discard proposal` is destructive and requires the documented confirmation; discard clears the transient preview and returns focus to the initiating request control.
- `Accept and create draft` is the only acceptance action. It applies only explicitly selected and edited items through existing validated application flows. Revalidate edited content and every selected local monster record ID against current `SrdCatalog` atomically before acceptance. If any selected ID is stale/invalid/unsupported, keep preview and edits and apply no partial encounter or map changes.
- After acceptance, show a clear success status and private destination. Selected valid `srd:monster` IDs are added through `EncounterService.AddMonster`; unsupported stats are omitted. Create editable map tokens only within the 100-token cap, supported kinds `hero`/`monster`, artwork `hero`/`goblin`, and finite coordinates 0..1000. Preserve actor-to-token mapping where possible. The DM can edit tokens and run the encounter locally. Never auto-show a scene or publish a map; public projection changes only through the separate existing Show action.
- Discard, cancel, malformed response, refusal, validation error, provider error, offline failure, and timeout leave campaign/map/encounter/public display unchanged. No proposal history or persistence is implied by this contract.

### SRD provenance versus generated content

- For rules-adjacent output, present two distinct labeled blocks: `Local SRD reference · verified in this catalog` (catalog-resolved record name, ID, source/version/provenance and bounded excerpt) and `AI-suggested · Unverified` (fiction, interpretation, or invented mechanics). The catalog, not model-supplied attribution text, determines citations and source metadata.
- Do not style, merge, or phrase generated narrative as a citation. A locally sourced SRD excerpt is reference material, not generated prose. If no matching local record exists, say `No matching local SRD reference found. Rules-related suggestions are unverified.` Never invent a source or imply full rules coverage.
- AI has no rules authority: no automatic adjudication, guaranteed correctness, rules invention presented as fact, or acceptance that bypasses existing domain validation. Unsupported mechanics stay labeled unverified and must not be silently converted into authoritative game state.

### Privacy, secret, and public-surface contract

- The backend/provider boundary owns the secret. Renderer must neither receive nor store the API key, expose key entry/paste, include it in URLs, database/preferences, clipboard, status, or logs. UI may only show configured/not configured. Provider failures are sanitized and must not echo headers, request bodies, response bodies, prompt content, or secrets.
- Show explicit external-data-sharing disclosure and fresh per-request opt-in before every provider submission. Explain that prompt plus explicitly selected local SRD excerpts/provenance leave the device; `store:false` turns off Responses API application-state retention for that request but does not prevent provider transmission, abuse monitoring, processing, or other provider retention. No outbound request can occur without fresh affirmative opt-in.
- Never send stored map, encounter, player, hidden, or any other campaign state. A UI label alone is not an authorization boundary; server/API remains DM-authorized and allowlisted to prompt and selected local SRD records only.
- Private preview, proposal errors/status, and draft payloads exist only in DM renderer/API responses; never appear in public table display, player companion, player push events, public map projection, or public window accessibility tree.

---

## Alignment, Accessibility, and Motion

- Use semantic headings, fieldsets/legends for request kinds and optional context, explicit persistent labels for all inputs, buttons for actions, and descriptive text for privacy and source provenance. No placeholder-only labels, icon-only actions, or status-by-color-only.
- Keyboard order follows visible reading order: request type → prompt/context → disclosure and opt-in → generate → private preview → edit controls → accept/discard. All actions work without pointer; geometry rows expose keyboard-operable move/edit/remove controls in addition to canvas interaction.
- Focus indication is at least a 2px brass outline with 2px offset, matching `.map-desk`. Dialogs trap focus while open, name both confirm and cancel actions, and return focus to the initiating control. After generation, announce `Private proposal ready for review` politely without moving focus; after errors use an associated alert and focus recovery action only where necessary.
- Status and in-flight work use `role=status`/polite live region; blocking request errors use `role=alert`. Do not repeatedly announce unchanged statuses. Never announce generated text in full automatically.
- Minimum interactive target 44×44px. At 200% zoom controls remain operable; no content loss/horizontal overflow at 320px. Long prompts, source names and generated prose wrap. Reduced-motion preference disables nonessential animation; no perpetual loading motion, auto-reveal, or motion-only state communication.
- Map geometry has a textual, labeled edit path; canvas focus and each shape selection are exposed accessibly. Color is not the only indication of changed, selected, AI-suggested, locally verified, or accepted state.

---

## UI Considerations

Applicable state considerations resolved: 9 covered, 1 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Proposal review | ✅ covered | Show `No proposal yet` copy and direct next step; campaign remains unchanged. |
| loading | Provider request/status | ✅ covered | Show `Generating private proposal…`, disable duplicate submission, preserve fields, and keep local campaign workflows available. |
| error | Provider, refusal, invalid output, acceptance validation | ✅ covered | Show sanitized recovery copy, preserve prompt/preview edits where safe, and state campaign unchanged. |
| populated | All request types and proposal fields | ✅ covered | Render typed proposal sections, private boundary, field-level diff, labels, and explicit next actions. |
| partial | Missing SRD match, unsupported mechanics, partial proposal | ✅ covered | Mark local-source absence and unsupported/incomplete fields; never fabricate citation or present partial content as verified. |
| overflow | Request text, proposal prose, citations, geometry lists | ✅ covered | Wrap text, allow vertical growth, keep controls reachable; prevent viewport horizontal overflow at 320px. |
| zero-one-many | SRD citations, proposed shapes, changed fields | ✅ covered | Zero uses explicit no-reference/no-change copy; singular/plural labels are grammatical; repeated rows remain independently editable. |
| long-text | Prompts, generated content, source attribution | ✅ covered | Wrap at word boundaries within readable measure; preserve full text and citation, never ellipsize meaning-bearing content. |
| interactive-control | Consent, regenerate, discard, accept, geometry edit | ✅ covered | Explicit labels and fresh consent; destructive discard/regeneration warns; accept is separate and validates again. |
| privacy boundary | Private proposal / display projection | 🧪 backstop | Held-out UI/API verification must prove no proposal, prompt, status detail, or proposal error reaches player/table surfaces. |

---

## Registry Safety

No shadcn initialization, component library, or third-party registry/block usage. Do not add a UI dependency/registry block for this phase without separate review. Reuse existing project React/CSS and application-owned map rendering.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: N/A — Tool: none, no installed component system

**Approval:** pending
