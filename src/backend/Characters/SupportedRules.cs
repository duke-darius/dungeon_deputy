namespace DungeonDeputy.Api.Characters;

/// <summary>Closed, source-audited limits for the character rules currently implemented.</summary>
public sealed record SupportedRuleset(
    string RulesetVersion,
    string PdfSha256,
    IReadOnlyList<string> SupportedClasses,
    IReadOnlyList<string> SupportedSpecies,
    IReadOnlyList<int> SupportedLevels,
    IReadOnlyList<string> SupportedEquipment,
    IReadOnlyList<string> SupportedSpells,
    IReadOnlyDictionary<string, string> CategoryStatus,
    IReadOnlyDictionary<string, string> Citations);

public static class SupportedRules
{
    public static SupportedRuleset Current { get; } = new(
        CharacterDomain.RulesetVersion,
        CharacterDomain.PdfSha256,
        ["barbarian"],
        ["dwarf"],
        [1],
        [],
        [],
        new Dictionary<string, string>
        {
            ["ability"] = "Supported",
            ["proficiency"] = "Supported",
            ["hitPoints"] = "Supported",
            ["armorClass"] = "Supported",
            ["inventory"] = "Unavailable",
            ["spells"] = "Unavailable",
            ["resources"] = "Unavailable",
            ["level"] = "Level 1 only"
        },
        new Dictionary<string, string>
        {
            ["class"] = "PDF p. 28, Classes — Barbarian — Core Barbarian Traits (d12 Hit Point Die); p. 29, Barbarian — Unarmored Defense",
            ["species"] = "PDF p. 84, Character Origins — Character Species — Dwarf (Dwarven Toughness, +1 HP per character level)",
            ["abilityModifiers"] = "PDF p. 37, Creating a Character — Determine Ability Scores (ability modifier table)",
            ["proficiency"] = "PDF p. 36, Character Advancement — Character Advancement table (level 1 proficiency bonus +2)"
        });
}
