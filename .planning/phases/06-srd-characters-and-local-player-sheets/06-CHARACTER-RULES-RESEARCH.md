# CHAR-01 Character Rules Research

**Scope:** CHAR-01 implementation gap only
**Sources inspected:** `src/backend/Characters/CharacterDomain.cs`, `src/backend/Characters/SupportedRules.cs`, and pinned local `assets/srd/2024/source/SRD_CC_v5.2.1.pdf`
**PDF identity:** `CharacterDomain.PdfSha256` records `sha256:8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`; the PDF text extraction succeeded in this session.
**Confidence:** HIGH for cited SRD mechanics and current implementation gap.

## Current Gap

`CharacterInput` has six ability scores and nullable `Inventory`, `Spells`, and `Resources`; `CharacterRecord` currently returns ability modifiers, proficiency bonus, HP maximum, AC, ruleset version, and `CharacterSupport`. The calculation rejects nonempty inventory/spell/resource collections, and accepts only configured class/species/level values. Current ruleset configuration is the closed subset barbarian / dwarf / level 1; inventory, equipment, and spells lists are empty; category status marks inventory, spells, and resources unavailable and level 1 only. [VERIFIED: `src/backend/Characters/CharacterDomain.cs:3-12,21-42`; `src/backend/Characters/SupportedRules.cs:4-42`]

The present formulas are more limited than their source rules: ability scores are constrained to 3–20, modifiers use floor((score−10)/2), proficiency is hard-coded +2, HP is hard-coded `12 + Constitution modifier + 1`, and AC is hard-coded `10 + Dexterity modifier + Constitution modifier`. The input model does not represent skills/saving-throw proficiencies, chosen equipment, equipped armor/shield, current HP, spell slots or rest-tracked uses. [VERIFIED: `src/backend/Characters/CharacterDomain.cs:3-6,24-41`]

## Minimal Supported Subset Recommendation

Keep this as a deliberately bounded character-sheet rules engine, not a claim to support all SRD character creation. Preserve the existing baseline (single-class level-1 Barbarian, Dwarf) and add only explicitly enumerated choices/calculations. Support a single-class progression through levels 1–20 only if level-up mechanics are included; otherwise remain level-1-only and describe the stored level/XP/PB values honestly. Do not accept arbitrary class/species/level strings, free-form spells, arbitrary gear, unparsed equipment, or user-supplied derived totals. [CITED: local PDF, pp. 19–23, 28–29, 83–84]

To cover actual spell-slot calculations in a narrow, verifiable slice, add a second optional profile: single-class level-1 Wizard, Dwarf. This adds the PDF’s explicit level-1 spellcasting data without opening multiclassing, subclasses, or all class advancement. The Wizard profile must have a closed spell-selection set from the SRD Wizard list; Barbarian characters have no spell slots or spell list. Alternatively, if CHAR-01 is required to remain strictly Barbarian-only, report spellcasting as `not-applicable` rather than treating a zero-spell Barbarian as implemented general spell support. [CITED: local PDF, pp. 77–79, 104–105]

## Verbatim Source Rules and Mechanics

Every exact rule below has a PDF page and section citation. “PDF page” means the printed SRD page, which matches the parsed page number.

### Abilities and Proficiency

- The score-to-modifier table, p. 6, **Playing the Game — Ability Modifiers**, gives: `1 −5; 2–3 −4; 4–5 −3; 6–7 −2; 8–9 −1; 10–11 +0; 12–13 +1; 14–15 +2; 16–17 +3; 18–19 +4; 20–21 +5; 22–23 +6; 24–25 +7; 26–27 +8; 28–29 +9; 30 +10.` [CITED: local PDF p. 6, “Ability Modifiers”]
- Character-generation scores are normally assigned through one of the three methods (standard array, 4d6 drop-lowest, or point cost), then background increases apply; background increases are one score +2 and another +1, or all three +1, never above 20. For this bounded entry API, accept resulting scores, not generation-method rolls, but validate legal character scores consistently with the supported input policy. [CITED: local PDF pp. 21–22, “Generate Your Scores,” “Adjust Ability Scores,” “Determine Ability Modifiers”]
- Proficiency bonus for level 1 is +2; by level band it is +2 through level 4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20. It is added once to a D20 Test only when relevant proficiency applies. [CITED: local PDF pp. 8, 23, “Proficiency Bonus” and “Character Advancement”]
- Background gives proficiency in two specified skills and one tool; class grants its listed proficiencies, including two saving throws. The Barbarian level-1 class traits specify Strength and Constitution saving throws and choose two from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival. [CITED: local PDF pp. 9, 20, 28, “Proficiency,” “Note Proficiencies,” “Core Barbarian Traits”]

### HP and AC

- Level-1 HP: Barbarian `12 + Con. modifier`; other classes use their printed level-1 row. [CITED: local PDF p. 22, “Level 1 Hit Points by Class”]
- Barbarian Hit Point Die is `D12 per Barbarian level`; fixed HP on later levels is `7 + Con. modifier` per level, with the rule that each gained level adds at least 1 HP. [CITED: local PDF pp. 28, 23, “Core Barbarian Traits,” “Fixed Hit Points by Class,” “Gaining a Level”]
- Dwarf adds `+1 HP` to maximum, and `+1 again whenever you gain a level`. Thus the supported Barbarian-Dwarf HP result is `12 + ConMod + level × 1` at level 1, and for supported later levels the increment is fixed Barbarian HP `7 + ConMod` plus Dwarf `+1` for that level. [CITED: local PDF p. 84, “Dwarf — Dwarven Toughness”; pp. 22–23]
- Base AC is `10 + Dexterity modifier`; armor, magic, spells, and features can modify it. Barbarian Unarmored Defense says while not wearing armor, base AC is `10 + Dexterity + Constitution`; it explicitly allows a Shield while retaining that benefit. A Shield contributes `+2` AC if trained. [CITED: local PDF pp. 7, 22, 29, 92, “Armor Class,” “Fill In Numbers,” “Level 1: Unarmored Defense,” “Armor”]
- Proposed AC scope: unarmored Barbarian (10 + DexMod + ConMod), optionally with an equipped trained Shield (+2); no worn armor for Barbarian Unarmored Defense. If supporting Wizard profile, use base AC 10 + DexMod with supported equipment armor calculations only where class training is modeled. [CITED: local PDF pp. 7, 29, 77, 92]

### Inventory / Equipment

- Barbarian starting equipment is explicitly one of two alternatives: `(A) Greataxe, 4 Handaxes, Explorer’s Pack, and 15 GP; or (B) 75 GP`. [CITED: local PDF p. 28, “Core Barbarian Traits — Starting Equipment”]
- Starting equipment is chosen and written on the character sheet; equipment item definitions provide properties and details. [CITED: local PDF p. 20, “Choose Starting Equipment”]
- At the requested minimal phase scope, inventory should store canonical item identifiers, integer quantity, and equipped state; support only one valid Barbarian package (or each entire A/B package) and do not claim inventory encumbrance or arbitrary purchases are implemented. The named equipment’s source definitions are in the SRD Equipment section: weapons pp. 89–91; adventuring gear and pack contents pp. 94–99. [CITED: local PDF pp. 28, 89–91, 94–99]
- For broader support, armor rows have distinct base-AC formulas and Dexterity caps; Shield is +2; armor training gates effective use. Do not reduce this to a generic armor bonus. [CITED: local PDF p. 92, “Armor” and “Armor Training”]
- Wizard level-1 starting equipment choices are `(A) 2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, and 5 GP; or (B) 55 GP`. The implemented Wizard package uses exactly this A/B selection. [CITED: local PDF p. 77, Wizard — Core Wizard Traits — Starting Equipment]
- A Shield costs 10 GP. When the bounded Barbarian profile explicitly selects an equipped shield, subtract 10 GP from its chosen A/B starting package and add one equipped shield to the inventory; reject unsupported/insufficient-currency acquisition rather than grant it free. [CITED: local PDF p. 92, Equipment — Armor — Shield]

### Spells and Resources

- Barbarian level 1 has no spellcasting feature in the class table. Treat spell list/slots as empty for this class, not as free-form accepted data. Its Level 1 Rage resource has `2` uses; recover one use on Short Rest and all expended uses on Long Rest. [CITED: local PDF pp. 28–29, “Barbarian Features,” “Level 1: Rage”]
- Dwarf Stonecunning: Bonus Action, Tremorsense 60 feet for 10 minutes, uses equal Proficiency Bonus, all expended uses recover on Long Rest. At level 1 this is two uses. [CITED: local PDF p. 84, “Dwarf — Stonecunning”]
- Wizard level 1 provides `3` cantrips, `4` prepared spells, and `2` level-1 spell slots; it starts with six level-1 Wizard spells in its spellbook. It regains all expended slots on Long Rest. Spellcasting ability is Intelligence. [CITED: local PDF pp. 77–79, “Wizard Features,” “Level 1: Spellcasting”]
- Wizard Arcane Recovery: after a Short Rest, recover expended spell slots whose combined levels are at most half Wizard level rounded up; no recovered slot can be level 6+. At level 1, this permits recovery of one level-1 slot once per day. [CITED: local PDF p. 78, “Level 1: Arcane Recovery”]
- General spell rules: cantrips are level 0 and don’t expend spell slots; level 1+ spells expend a slot of the spell’s level or higher; Long Rest restores expended slots. [CITED: local PDF p. 104, “Spell Level,” “Spell Slots,” “Casting without Slots”]
- Resource storage should distinguish a resource maximum from current remaining uses and recovery rule (`ShortRest`, `LongRest`, or both), with current uses bounded 0..maximum. Do not store “available” values without tracking expenditure/rest state. [CITED: local PDF pp. 28–29, 78, 84, “Rage,” “Arcane Recovery,” “Stonecunning”]

### Level / Advancement

- Character advancement table levels 1–20 has XP thresholds `0, 300, 900, 2,700, 6,500, 14,000, 23,000, 34,000, 48,000, 64,000, 85,000, 100,000, 120,000, 140,000, 165,000, 195,000, 225,000, 265,000, 305,000, 355,000`, and PB values per the bands above. Character level is the highest threshold reached by total XP. [CITED: local PDF p. 23, “Level Advancement — Character Advancement”]
- Each level adds one Hit Die; the fixed-HP option uses the class-specific fixed value plus Constitution modifier; proficiency bonus is updated at listed thresholds. A Constitution modifier increase adds 1 HP per attained level. [CITED: local PDF p. 23, “Gaining a Level”]
- If the phase only exposes a manually selected level and lacks a trusted XP field, retain level input and derive PB/HP from level, but do not imply XP advancement is implemented. Better next-step schema includes nonnegative total XP and derives level from the table; avoid accepting inconsistent XP+level pairs. [CITED: local PDF pp. 22–23]

### Proficiency selection corrections

- Wizard level-1 saving throws are Intelligence and Wisdom; its two class skill choices are selected from Arcana, History, Insight, Investigation, Medicine, and Religion. Nature is not in this Wizard skill-choice list. Barbarian's six available skill choices remain Animal Handling, Athletics, Intimidation, Nature, Perception, and Survival. [CITED: local PDF p. 77, Wizard — Core Wizard Traits; p. 28, Barbarian — Core Barbarian Traits]

## Proposed Schema

This is a planning proposal, not a code change.

```text
CharacterInput
  name: string
  classId: closed enum
  speciesId: closed enum
  totalExperiencePoints: nonnegative integer (preferred) OR level: 1..20 (interim)
  abilities: { strength, dexterity, constitution, intelligence, wisdom, charisma }
  backgroundId: closed enum OR explicit selected skill/tool proficiencies
  inventory: [{ itemId: closed enum, quantity: positive integer, equipped: boolean }]
  spellbook: closed spell IDs (Wizard only)
  preparedSpells: closed spell IDs (Wizard only)
  resources: server-derived maxima plus current uses; never client-authoritative maxima

CharacterRecord (derived/immutable)
  identity + normalized selections
  level, XP threshold, abilityModifiers, proficiencyBonus
  skill/save proficiency IDs (and any calculated bonuses only if required)
  hitPointMaximum, armorClass
  inventory, spellbook/prepared spells, slot maxima/current slots
  resource counters (Rage, Stonecunning, Arcane Recovery eligibility)
  RulesetVersion, sourcePdfSha256, per-category citations/status
```

Use separate source-backed tables/rules functions for ability modifiers, level/PB thresholds, class HP progression, species HP-per-level, AC calculation, package inventory, spell-slot progression, and rest-resource resets. Preserve deterministic calculation and reject unsupported values at the boundary. `CharacterSupport` already has the right place for ruleset/hash/citation/status metadata. [VERIFIED: `src/backend/Characters/CharacterDomain.cs:7-19`; `src/backend/Characters/SupportedRules.cs:4-13`]

## Exact Calculation Examples for Tests

Using the current example’s class/species/level choices and ability scores, expected arithmetic must follow the above formulas; assertions should be generated with concrete fixture values and cross-checked against the implementation. For example, level-1 Barbarian/Dwarf with Constitution 14 has Con modifier +2, HP `12 + 2 + 1 = 15`, proficiency +2. Unarmored AC with Dexterity 14 (+2) is `10 + 2 + 2 = 14`; with an equipped shield and Barbarian unarmored defense, AC is 16. [CITED: local PDF pp. 6–8, 22–23, 28–29, 84, 92]

Level table boundary tests: XP 0→level 1/PB +2; 299→1; 300→2/+2; 6,499→4/+2; 6,500→5/+3; 84,999→10/+4; 85,000→11/+4; 355,000→20/+6. [CITED: local PDF p. 23, “Character Advancement”]

Wizard level-1 example (if accepted in the phase subset): Intelligence 16 yields modifier +3; proficiency +2; spell save DC `8+3+2=13`; spell attack bonus `3+2=+5`; `2` level-1 slots, `3` cantrips, `4` prepared spells, and Arcane Recovery capacity one slot level after a Short Rest. [CITED: local PDF pp. 22–23, 77–78, 105]

## Test Outline

1. **Ability modifier table:** test all score-band edges and floor behavior for odd/even values; reject unsupported ability bounds and malformed scores.
2. **Proficiency/level:** test each XP transition and PB band boundary; ensure PB is added once; unsupported multiclass/class combinations fail closed.
3. **HP:** Barbarian level-1 class hit die maximum plus Con modifier plus Dwarf `+1`; level-up increments use Barbarian fixed HP `7 + ConMod` and Dwarf +1 per level; test minimum-per-level rule when Constitution modifier is strongly negative.
4. **AC:** Barbarian unarmored formula, optional proficient Shield +2, armor exclusion under Unarmored Defense, and invalid/untrained equipment behavior.
5. **Inventory:** accepted package maps to exact items/quantities/gold; reject unknown item IDs, negative/zero counts, duplicated slots beyond supported schema, and unapproved arbitrary equipment; verify item names/quantities are retained in record.
6. **Spells/resources:** Barbarian slot maximum 0, Rage 2, Stonecunning uses PB; Long Rest restores all, Short Rest restores one Rage use and not Stonecunning. If Wizard is included, level-1 spell counts/slots/derived DC+attack bonus and Arcane Recovery cap are tested; reject spells not on the class list, over-preparation, or slot counts supplied by the caller.
7. **Validation / provenance:** all successful records include the pinned PDF digest, ruleset version, and category-specific exact PDF citations; unsupported categories remain explicitly unavailable, never silently approximated.

## Source-Citation Corrections to Existing Metadata

The current `SupportedRules.Citations` entries cite Barbarian p. 28 / p. 29, Dwarf p. 84, ability modifiers p. 37, and advancement p. 36. In this pinned 2024 SRD 5.2.1 PDF, the inspected exact rules are instead: ability modifiers p. 6 and character creation score method/modifier section pp. 21–22; character advancement and PB table p. 23; level-1 HP table p. 22; Barbarian core traits/features pp. 28–29; Dwarf species p. 84; AC base calculation p. 7 / character creation p. 22 / Barbarian feature p. 29 / equipment table p. 92. Update citations when expanding the rules so they refer to this pinned PDF’s printed pages and section headings. [VERIFIED: `src/backend/Characters/SupportedRules.cs:36-42`; CITED: local PDF pp. 6–7, 22–23, 28–29, 84, 92]

## Explicit Scope Limits

- No spells for Barbarian; spellcasting is only a demonstrative optional Wizard level-1 profile. No non-cantrip Wizard spell effects are simulated; this is sheet metadata and resource accounting only. [CITED: local PDF pp. 28, 77–79, 104]
- No arbitrary equipment shopping, encumbrance, currency conversion, attunement, multiclassing, feats/background generation, level-up feature choices, or spellcasting resolution in this minimal subset. These have distinct SRD procedures and should only be added with dedicated evidence-backed tables and tests. [CITED: local PDF pp. 19–25, 89–103]
- No source changes or commits were made.

## Follow-up audit corrections (2026-11-07)

Implementation review caught two source-bound edge cases and corrected them: Wizard skill choices are the exact six listed above (Nature is rejected), and a selected Barbarian Shield costs 10 GP and is deducted from either starting package rather than being granted without cost. Regression tests cover both. These corrections are derived from the pinned PDF entries cited above.

## Appendix — Bounded Level-1 Wizard/Dwarf Spell Profile (Source Gate Required)

The bounded profile requested for 06-08 is: cantrips `acid-splash`, `fire-bolt`, `light`; spellbook `alarm`, `burning-hands`, `detect-magic`, `disguise-self`, `magic-missile`, `shield`; four prepared IDs selected from the six. These are planned selections, not yet accepted source records. Execution must inspect each exact Phase 5 record, validate that its source class membership includes Wizard, verify each name on the pinned PDF Wizard list (pp. 76–78), and record each spell description's exact section and printed page. Any spell without verified record, class membership and citation is blocked from acceptance and remains unavailable; no remembered list or generated catalog can substitute.

The level-1 mechanics can still be cited independently of the unresolved names: Wizard starts with 3 cantrips, 4 prepared spells, 2 level-1 slots, and six level-1 Wizard spells in the spellbook (PDF p. 77, “Wizard Features” and “Level 1: Spellcasting”); Wizard spellcasting ability is Intelligence (same section). Arcane Recovery restores expended slot levels up to half Wizard level rounded up, once after a Short Rest, with no slot level 6+ (PDF p. 78, “Level 1: Arcane Recovery”). Thus at level 1 the recovery budget is `ceil(1/2) = 1` slot level, i.e. one level-1 slot; slot maximum is 2. [CITED: pinned local PDF, pp. 77–78, sections above]

**Current record lookup baseline:** `assets/srd/2024/records.normalized.json` currently contains `srd521:spell:acid-splash` (Wizard membership; PDF p. 107, "Spells - Spell Descriptions - Acid Splash"; record hash `bc58c81b620109935f35511bf091bfbabff8b76d2090f174c06450cdfab89050`). A tree lookup found no records for the other eight selected IDs at planning time. This is an execution gate, not proof they are absent from the source PDF: audit exact records and PDF entries, and do not accept any whose record/class provenance or exact description citation cannot be established. [VERIFIED: normalized record file lookup; exact source PDF citation above]

## 06-08 Direct Wizard Spell-List Source Gate (2026-11-07)

The pinned PDF was extracted directly with `pdftotext -layout` for printed pages 77-79. Its SHA-256 was independently rechecked as `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`. **Important page correction:** printed p. 77 contains Wizard class features and level-1 spellcasting rules; the actual **Wizard Spell List** starts on printed p. 79, not p. 77. The selected names were therefore checked against the actual list on p. 79 rather than relying on a mistaken page reference.

Direct list-membership results (printed p. 79, "Wizard Spell List", "Cantrips (Level 0 Wizard Spells)" and "Level 1 Wizard Spells"):

| Selected name | Printed-page list result | Phase 5 normalized record |
|---|---|---|
| Acid Splash | Present under Cantrips | Present: `srd521:spell:acid-splash` |
| Fire Bolt | Present under Cantrips | Not present |
| Light | Present under Cantrips | Not present |
| Alarm | Present under Level 1 Wizard Spells | Not present |
| Burning Hands | Present under Level 1 Wizard Spells | Not present |
| Detect Magic | Present under Level 1 Wizard Spells | Not present |
| Disguise Self | Present under Level 1 Wizard Spells | Not present |
| Magic Missile | Present under Level 1 Wizard Spells | Not present |
| Shield | Present under Level 1 Wizard Spells | Not present |

The revised 06-08 contract permits name/ID-only bookkeeping and makes Phase 5 records optional; accordingly, absent normalized records do not block these list-verified selections. No descriptions or effects are imported. Class feature counts, spellbook/prepared counts, slots, Intelligence spellcasting, and Arcane Recovery are cited separately to printed pp. 77-78; general slot/rest rules are cited to p. 104. This updates the earlier proposed record/class-membership/description-citation gate: those stricter conditions are not requirements of the revised execution plan.
