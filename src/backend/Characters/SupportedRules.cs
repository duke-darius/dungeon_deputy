namespace DungeonDeputy.Api.Characters;

public sealed record SupportedRuleset(string RulesetVersion, string PdfSha256,
    IReadOnlyList<string> SupportedClasses, IReadOnlyList<string> SupportedSpecies,
    IReadOnlyList<int> SupportedLevels, IReadOnlyList<string> SupportedEquipment,
    IReadOnlyList<string> SupportedSpells, IReadOnlyDictionary<string, string> CategoryStatus,
    IReadOnlyDictionary<string, string> Citations);

public static class SupportedRules
{
    public static SupportedRuleset Current { get; } = new(
        CharacterDomain.RulesetVersion, CharacterDomain.PdfSha256,
        ["barbarian", "wizard"], ["dwarf"], Enumerable.Range(1, 20).ToArray(),
        ["greataxe", "handaxe", "explorers-pack", "dagger", "quarterstaff", "arcane-focus-quarterstaff", "robe", "spellbook", "scholars-pack", "shield"],
        ["acid-splash", "fire-bolt", "light", "alarm", "burning-hands", "detect-magic", "disguise-self", "magic-missile", "shield"],
        new Dictionary<string, string>
        {
            ["ability"] = "Supported: resulting character scores 3-20; modifier table accepts 1-30",
            ["proficiency"] = "Supported: level-derived proficiency and closed class save/skill proficiency selections",
            ["hitPoints"] = "Supported: Barbarian levels 1-20 and Wizard level 1; Dwarven Toughness",
            ["armorClass"] = "Supported: Barbarian Unarmored Defense and optional proficient shield; Wizard unarmored base AC",
            ["inventory"] = "Supported: enumerated starting packages only; no purchases or encumbrance",
            ["spells"] = "Supported: Wizard level-1 spell names/IDs only; no spell text or effects",
            ["resources"] = "Supported: bounded Rage, Stonecunning, spell-slot, and Arcane Recovery counters",
            ["level"] = "Supported: XP-derived Barbarian levels 1-20; Wizard level 1 only"
        },
        new Dictionary<string, string>
        {
            ["class"] = "PDF pp. 28-29, Barbarian Core Traits, Rage, Unarmored Defense; pp. 77-78 Wizard Features, Spellcasting and Arcane Recovery",
            ["species"] = "PDF p. 84, Dwarf - Dwarven Toughness (+1 HP per character level) and Stonecunning",
            ["abilityModifiers"] = "PDF p. 6, Playing the Game - Ability Modifiers; character creation bounds pp. 21-22",
            ["proficiency"] = "PDF p. 23, Level Advancement - Character Advancement; pp. 28, 77 class proficiencies",
            ["level"] = "PDF p. 23, Level Advancement - Character Advancement and Gaining a Level",
            ["hitPoints"] = "PDF pp. 22-23, Level 1 Hit Points by Class, Fixed Hit Points by Class and Gaining a Level; p. 84 Dwarven Toughness",
            ["armorClass"] = "PDF pp. 7, 22, 29, 92, Armor Class, Fill In Numbers, Unarmored Defense and Armor",
            ["inventory"] = "PDF p. 28 Barbarian Starting Equipment; pp. 89-91 weapons, pp. 94-99 adventuring gear and packs",
            ["spells"] = "PDF p. 79, Wizard Spell List (name membership only); pp. 77-78 Wizard Spellcasting, slots and Arcane Recovery; p. 104 Spell Slots/rest"
        });
}
