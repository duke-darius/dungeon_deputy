namespace DungeonDeputy.Api.Characters;

public sealed record CharacterInput(string? Name, string? @Class, string? Species, int Level,
    int Strength, int Dexterity, int Constitution, int Intelligence, int Wisdom, int Charisma,
    IReadOnlyList<string>? Inventory = null, IReadOnlyList<string>? Spells = null,
    IReadOnlyDictionary<string, int>? Resources = null);
public sealed record CharacterSupport(string PdfSha256, string RulesetVersion,
    IReadOnlyDictionary<string, string> Citations, IReadOnlyDictionary<string, string> CategoryStatus);
public sealed record CharacterRecord(string Id, string Name, string Class, string Species, int Level,
    int Strength, int Dexterity, int Constitution, int Intelligence, int Wisdom, int Charisma,
    IReadOnlyDictionary<string, int> AbilityModifiers, int ProficiencyBonus, int HitPointMaximum,
    int ArmorClass, string RulesetVersion, CharacterSupport Support);

public static class CharacterDomain
{
    public const string RulesetVersion = "SRD 5.2.1 · bounded barbarian/dwarf level 1";
    public const string PdfSha256 = "sha256:8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
    public static CharacterSupport Support { get; } = new(PdfSha256, RulesetVersion,
        SupportedRules.Current.Citations, SupportedRules.Current.CategoryStatus);

    public static bool TryCalculate(CharacterInput? input, string id, out CharacterRecord? record)
    {
        record = null;
        if (input is null || string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 80 ||
            !SupportedRules.Current.SupportedClasses.Contains(input.Class) ||
            !SupportedRules.Current.SupportedSpecies.Contains(input.Species) ||
            !SupportedRules.Current.SupportedLevels.Contains(input.Level) ||
            input.Inventory is { Count: > 0 } || input.Spells is { Count: > 0 } || input.Resources is { Count: > 0 } ||
            new[] { input.Strength, input.Dexterity, input.Constitution, input.Intelligence, input.Wisdom, input.Charisma }.Any(score => score is < 3 or > 20)) return false;
        static int Mod(int score) => (int)Math.Floor((score - 10) / 2.0);
        var modifiers = new Dictionary<string, int>
        {
            ["strength"] = Mod(input.Strength), ["dexterity"] = Mod(input.Dexterity), ["constitution"] = Mod(input.Constitution),
            ["intelligence"] = Mod(input.Intelligence), ["wisdom"] = Mod(input.Wisdom), ["charisma"] = Mod(input.Charisma)
        };
        var hp = 12 + modifiers["constitution"] + 1;
        var ac = 10 + modifiers["dexterity"] + modifiers["constitution"];
        if (hp < 1 || ac < 1) return false;
        record = new CharacterRecord(id, input.Name.Trim(), input.Class!, input.Species!, input.Level,
            input.Strength, input.Dexterity, input.Constitution, input.Intelligence, input.Wisdom, input.Charisma,
            modifiers, 2, hp, ac, RulesetVersion, Support);
        return true;
    }
}
