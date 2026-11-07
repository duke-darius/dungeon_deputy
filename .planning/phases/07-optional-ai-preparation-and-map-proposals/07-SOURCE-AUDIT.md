# Phase 7 Source Audit

Phase 7 source coverage and execution evidence index. In-scope features are assigned to plans and their automated evidence is recorded in `07-VALIDATION.md` and the plan summaries. No live API key/provider call is required or claimed. Phase 6 physical phone/operator UAT remains outstanding and is not inferred from Phase 7 work.

## GOAL — ROADMAP Phase 7

| Source item | Plan coverage | Evidence / disposition |
|---|---|---|
| Optional AI proposals become editable campaign content only after explicit review and acceptance | 07-01, 07-03, 07-04, 07-07, 07-08 | Closed: accepted NPC/encounter/adventure/scene narrative persists privately in SQLite with DM list/read/edit/delete; acceptance and edits validate current references; tests prove restart, privacy and all-or-nothing acceptance. |
| Configured provider can generate structured NPCs, encounter ideas, short adventures, scene descriptions, editable map geometry | 07-01 provider tracer; 07-02 all five output types; 07-03 typed review; 07-04 acceptance; 07-06 rendering/editing | Contract/provider/UI tests plus actual map rendering/edit tests. |
| Tavern ambush end-to-end: private proposal preview; separate explicit accept; revalidate selected current `srd:monster` IDs atomically; use `EncounterService.AddMonster`; create bounded map tokens using supported kinds/artwork; preserve actor-token mapping; edit tokens/geometry and run encounter locally; separate Show only for public projection | 07-02 local catalog grounding; 07-03 preview; 07-04 atomic acceptance; 07-06 geometry editor; 07-07 Electron/backend E2E | Injected fake-provider tavern fixture, invalid-ID rollback, AddMonster/token identity, map editing/local turn flow, public raster unchanged until Show. No campaign state is sent to AI. |
| Ordinary use works when AI disabled, unavailable, or unconfigured | 07-01 local status/config; 07-03 offline UI; 07-05 disabled-API/local-state test; 07-07 isolated fake seam, environment scrub regression test, and keyless/no-network E2E | Full suite and Electron E2E with provider credentials/model removed from child environments and external requests blocked. |
| Phone/operator UAT from Phase 6 remains unverified | 07-05 verification/status documentation | Explicitly retained outstanding; not covered by Phase 7 automation and not a blocker to Phase 7 planning. |

## REQ — REQUIREMENTS.md

| Requirement | Plans | Evidence / disposition |
|---|---|---|
| AI-01 structured NPCs, encounters, short adventures, scenes, editable map geometry | 07-01, 07-02, 07-03, 07-04, 07-06 | Five closed response contracts, validators, UI choices, actual rendered/editable geometry and supported local monster-to-actor/token flow; see `07-VALIDATION.md`. |
| AI-02 preview/explicit accept, local SRD grounded, accepted narrative editable and private | 07-02, 07-03, 07-04, 07-06, 07-07, 07-08 | Complete: `AcceptedPreparationStore` persists only validated narrative, canonical provenance and campaign linkage; DM endpoints and workspace support lifecycle; acceptance shares the map/encounter SQLite transaction; focused and full test suites pass. |
| AI-03 fully usable without AI/key/network | 07-01, 07-03, 07-05, 07-07 | Fake-handler disabled/no-key checks, authenticated disabled-mode API test with unchanged campaign state, credential-scrubbed deterministic E2E. |

## RESEARCH — 07-RESEARCH.md

| In-scope source item | Plans | Coverage / disposition |
|---|---|---|
| Backend-only Responses API; fixed URL, Bearer key from process env, configurable model, strict JSON Schema, `store:false`, built-in HttpClient/System.Text.Json, no packages | 07-01, 07-05 | Captured fake-handler request asserts auth/schema/store/model; package delta none; no key read or live call. |
| Secret absent renderer, DB, config, logs, IPC, errors | 07-01, 07-03, 07-05, 07-07 | Process allowlist and env-scrub tests; API status/errors, captured fake-provider request, SQLite text values, server logs, E2E diagnostics/artifact sentinel checks. |
| Explicit fresh external-sharing consent and no implicit campaign/private content | 07-01, 07-03, 07-05 | Backend no-call-without-consent and selected-context fake-handler tests; renderer consent resets on payload changes; private generation snapshot and E2E table boundary. |
| Local SRD lookup and provenance; reject unknown model IDs | 07-02, 07-03 | Canonical local record lookup and separate source DTO/display; no model attribution authority. |
| Typed bounded outputs, strict parse plus semantic validation, hostile provider handling | 07-02, 07-05 | Five-kind provider schema/response fake tests and positive/negative validator fixtures for byte/text/count/range/unknown-field/refusal/malformed cases. |
| Generate is read-only; acceptance revalidates and applies only private draft; no tokens/actors/publish/show/player leak | 07-01, 07-04, 07-07 | Full state comparison across generate, invalid rollback, valid accept, private edits, and separate Show. |
| Safe editable map geometry; no model-authored SVG, URLs, scripts, images, arbitrary code | 07-02, 07-04, 07-06 | Bounded primitive contract, malformed content rejection, canvas rendering, keyboard-edit/remove/save controls, fog-safe public raster. |
| Timeout/response limits, no retry loop, cancellation and sanitized failures | 07-01, 07-02 | Fake handlers prove timeout/size/error fail closed without logs/body echo. |
| UI all five kinds, responsive/keyboard/44px controls, source labels, status/error/loading, private banner, diff, edit/discard/regenerate | 07-03, 07-06, 07-07 | Renderer source/contract tests, labeled keyboard geometry controls, full workflow E2E. Automated coverage passes; 320px/200% visual review and UI-SPEC checker approval were not performed and remain a human-review limitation. |
| Phase 6 UAT remains outstanding | 07-05 | Explicit documentation; not inferred or claimed complete. |
| Resolved research choices: fixed Responses URL; required env model/key with no default; per-generation fresh consent; only prompt plus explicitly selected local SRD excerpt/provenance; no stored campaign state; `store:false` retention limits; strict geometry/token bounds; sanitized provider failures | 07-01, 07-02, 07-03, 07-07, 07-05 | Captured request, config/consent tests, validator bounds, UI disclosure, credential-scrubbed offline E2E; see `07-VALIDATION.md`. |
| MapService/EncounterService acceptance constraints | 07-04, 07-06, 07-07 | Same-database immediate transaction, failure-trigger rollback, bounded token/geometry persistence, actor-token identity, DM editor and separate Show. |
| Excluded research ideas: generated artwork, automated adjudication, autonomous gameplay, hosted account/service requirement, hidden state sharing | None | Explicitly excluded by research/requirements; not planned. |

## CONTEXT - User Decisions and UI Contract

| Decision/contract item | Plans | Coverage / disposition |
|---|---|---|
| Keep core app offline-first; AI is explicit opt-in only | 07-01, 07-03, 07-05 | Local status/no startup network; keyless offline suite. |
| `OPENAI_API_KEY` and `DUNGEON_DEPUTY_AI_MODEL` process env; built-in HttpClient; no dependencies | 07-01, 07-05 | Backend-only configured integration and package delta verification. |
| First-use warning: prompt/selected local SRD references leave device; provider retention applies despite `store:false` | 07-01, 07-03 | Explicit pre-submit disclosure and fresh consent; warning retained for each request as UI-SPEC requires. |
| No silent campaign/private data inclusion; no key in renderer/DB/config/log/preload | 07-01, 07-03, 07-05 | Allowlist payload + sentinel privacy checks. |
| Validate schema/content/elements; revalidate on accept; no mutation until explicit acceptance | 07-02, 07-04 | Validator and atomic acceptance tests. |
| Keep AI narrative distinct from local SRD records; resolve IDs locally | 07-02, 07-03 | Canonical catalog lookup and separate visual regions. |
| All generated types are proposals; acceptance only via validated backend; no auto-show/publish/token/encounter change | 07-03, 07-04, 07-07 | Acceptance and full public state-diff E2E. |
| Focus security/offline tests with fake HttpMessageHandler; no key/network tests | 07-01, 07-02, 07-05 | Deterministic backend and full no-key E2E. |
| Final full app offline test/E2E and no provider-key claims | 07-05, 07-07 | Required commands and explicit verification limitations. |
| All-phase progression authorized; no hard pause for Phase 6 human UAT, but no false completion claim | 07-05 | Continue roadmap execution with Phase 6 UAT explicitly outstanding; no CHAR-02..04 verification or project-complete claim until physical phone/operator UAT. |

## UI-SPEC Interaction and State Coverage

| UI-SPEC contract | Evidence / disposition |
|---|---|
| Five request kinds, prompt bound, selected local context, explicit disclosure and fresh consent; selection itself does not generate | `PreparationWorkspace.tsx` and `preparation.test.mjs` consent/payload assertions; API `AiPreparationApiTests` proves status/consent boundary. |
| Disabled/unconfigured/provider errors preserve local workflows and do not display credentials or raw provider errors | `AiPreparationServiceTests`, `AiPreparationApiTests` disabled-mode test, `PreparationWorkspace.tsx` safe copy; `npm test`. |
| Private transient preview distinguishes catalog references from unverified story, and offers edits/discard/regenerate/accept separately | `PreparationWorkspace.tsx`, `proposalView.mjs`, `preparation.test.mjs`, plus full AI E2E. |
| Geometry is bounded and application-rendered; labeled add/edit/remove path, save/reload, and separate Show | `MapCanvas.test.mjs`, `MapEditor.tsx`, full tavern E2E; public PNG raster applies fog after geometry. |
| Private prompt/proposal/status/errors do not reach player/table DOM or public API projection; accepted map/actor does not publish automatically | AI E2E snapshot/text assertions before Show; server public projection and same-transaction acceptance tests. Accepted CRUD routes remain behind DM authorization and the Electron DM IPC allowlist; the public preload/projection exposes no accepted-preparation command or DTO. |
| Keyboard, focus, 44px minimum targets, 320px/200% zoom, reduced-motion and screenshot-based visual sign-off | Source contracts and existing responsive CSS provide automated coverage for key controls. No physical-device, 200% zoom, reduced-motion manual check, screenshot review or checker sign-off was performed; UI-SPEC approval remains pending. |

## Plan Coverage Summary

Eight plans are tracked and executed. Plan 07-08 closes AI-02's accepted-narrative gap; focused acceptance/renderer tests, full `npm test`, and build pass. No plan installs dependencies or claims a live provider/API key test. Phase 6 CHAR-02..04 phone/operator UAT remains outstanding.

## Final Audit Outcome — 2026-11-07

- Reconciled the plan and all four required sources (ROADMAP goal/success criteria, REQUIREMENTS AI-01..03, RESEARCH constraints/resolved choices, and user CONTEXT/UI-SPEC contracts) against implementation files and executable tests above. The specific 7.2 tavern-ambush flow is exercised by the actual Electron/backend E2E, including invalid acceptance rollback, catalog-backed Bandit acceptance, same-ID actor/token, geometry/token editing, local turn advancement, and separate Show.
- `npm test` passed: 102 Node tests and 99 .NET tests. `npm run build` passed (including TypeScript/Electron/Vite and .NET, zero backend warnings/errors). `npm run test:e2e` passed on retry; evidence `artifacts/e2e/2026-11-07T17-38-22.613Z-d3c6e22b`. The first E2E attempt failed in unrelated audio-config persistence (`EPERM` during Windows rename at the soundboard save step); rerun passed without source changes. `npm run package:smoke` passed Windows x64 backend/package smoke.
- Keyless E2E scrubbed provider credentials/model/AI toggles from child processes and blocked external network requests; deterministic fake behavior is test-only. This establishes fake-provider and offline behavior only, not real provider authentication, network compatibility, live model/schema support, or provider retention behavior.
- Automated checks do not establish physical phone/private-Wi-Fi/operator UAT (CHAR-02..04), physical HDMI/display acceptance, macOS build/runtime, or UI-SPEC human visual/checker approval. Those remain explicitly unverified; Phase 6 and overall project completion are not inferred from Phase 7.
