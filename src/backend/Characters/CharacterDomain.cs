namespace DungeonDeputy.Api.Characters;

public sealed record CharacterInput(string? Name, string? @Class, string? Species, int Level,
    int Strength, int Dexterity, int Constitution, int Intelligence, int Wisdom, int Charisma,
    IReadOnlyList<string>? Inventory = null, IReadOnlyList<string>? Spells = null,
    IReadOnlyDictionary<string, int>? Resources = null, int? TotalExperiencePoints = null,
    string? EquipmentPackage = null, bool ShieldEquipped = false,
    IReadOnlyList<string>? Cantrips = null, IReadOnlyList<string>? Spellbook = null,
    IReadOnlyList<string>? PreparedSpells = null, int? CurrentSpellSlots = null,
    int? CurrentRageUses = null, int? CurrentStonecunningUses = null,
    bool ArcaneRecoveryUsed = false, IReadOnlyList<string>? SkillProficiencies = null);

public sealed record CharacterInventoryItem(string ItemId, int Quantity, bool Equipped = false);
public sealed record CharacterRestCommand(bool LongRest = false, bool ArcaneRecovery = false, string? ResourceAction = null);
public sealed record CharacterSupport(string PdfSha256, string RulesetVersion,
    IReadOnlyDictionary<string, string> Citations, IReadOnlyDictionary<string, string> CategoryStatus);
public sealed record CharacterRecord(string Id, string Name, string Class, string Species, int Level,
    int Strength, int Dexterity, int Constitution, int Intelligence, int Wisdom, int Charisma,
    IReadOnlyDictionary<string, int> AbilityModifiers, int ProficiencyBonus, int HitPointMaximum,
    int ArmorClass, string RulesetVersion, CharacterSupport Support,
    int TotalExperiencePoints = 0, string? EquipmentPackage = null,
    IReadOnlyList<CharacterInventoryItem>? Inventory = null, bool ShieldEquipped = false,
    IReadOnlyList<string>? Cantrips = null, IReadOnlyList<string>? Spellbook = null,
    IReadOnlyList<string>? PreparedSpells = null, int SpellSlotMaximum = 0, int CurrentSpellSlots = 0,
    int RageMaximum = 0, int CurrentRageUses = 0, int StonecunningMaximum = 0,
    int CurrentStonecunningUses = 0, bool ArcaneRecoveryUsed = false,
    int SpellSaveDc = 0, int SpellAttackBonus = 0,
    IReadOnlyList<string>? SkillProficiencies = null,
    IReadOnlyList<string>? SavingThrowProficiencies = null, int GoldPieces = 0, bool ArcaneRecoveryAvailable = false);

public static class CharacterDomain
{
    public const string RulesetVersion = "SRD 5.2.1 • bounded barbarian/dwarf 1-20 and wizard/dwarf 1";
    public const string PdfSha256 = "sha256:8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
    private static readonly int[] XpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
        85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
    private static readonly string[] BarbSkills = ["animal-handling", "athletics", "intimidation", "nature", "perception", "survival"];
    private static readonly string[] WizardSkills = ["arcana", "history", "insight", "investigation", "medicine", "religion"];
    private static readonly string[] CantripChoices = ["acid-splash", "fire-bolt", "light"];
    private static readonly string[] WizardSpells = ["alarm", "burning-hands", "detect-magic", "disguise-self", "magic-missile", "shield"];
    public static CharacterSupport Support { get; } = new(PdfSha256, RulesetVersion,
        SupportedRules.Current.Citations, SupportedRules.Current.CategoryStatus);

    public static int AbilityModifier(int score) => score is >= 1 and <= 30
        ? (int)Math.Floor((score - 10) / 2.0) : throw new ArgumentOutOfRangeException(nameof(score));

    public static int LevelForExperience(int experience) => experience < 0
        ? throw new ArgumentOutOfRangeException(nameof(experience))
        : Array.FindLastIndex(XpThresholds, threshold => threshold <= experience) + 1;

    public static int ProficiencyForLevel(int level) => level is >= 1 and <= 20
        ? 2 + (level - 1) / 4 : throw new ArgumentOutOfRangeException(nameof(level));

    public static int AbilityCheckBonus(CharacterRecord character, string ability, bool proficient) =>
        character.AbilityModifiers.TryGetValue(ability, out var modifier)
            ? modifier + (proficient ? character.ProficiencyBonus : 0)
            : throw new ArgumentOutOfRangeException(nameof(ability));

    public static int SavingThrowBonus(CharacterRecord character, string ability) =>
        AbilityCheckBonus(character, ability, character.SavingThrowProficiencies?.Contains(ability, StringComparer.Ordinal) == true);

    public static int? WeaponAttackBonus(CharacterRecord character, string ability, string weaponId)
    {
        var proficientWeapons = character.Class == "barbarian"
            ? new[] { "greataxe", "handaxe" }
            : new[] { "dagger", "quarterstaff" };
        var knownWeapon = new[] { "greataxe", "handaxe", "dagger", "quarterstaff" }.Contains(weaponId, StringComparer.Ordinal);
        if (!knownWeapon) return null;
        return AbilityCheckBonus(character, ability, proficientWeapons.Contains(weaponId, StringComparer.Ordinal));
    }

    public static bool TryCalculate(CharacterInput? input, string id, out CharacterRecord? record)
    {
        record = null;
        if (input is null || string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 80 || input.Inventory is { Count: > 0 } ||
            input.Class is not ("barbarian" or "wizard") || input.Species != "dwarf" ||
            new[] { input.Strength, input.Dexterity, input.Constitution, input.Intelligence, input.Wisdom, input.Charisma }.Any(score => score is < 3 or > 20)) return false;
        var xp = input.TotalExperiencePoints ?? (input.Level is >= 1 and <= 20 ? XpThresholds[input.Level - 1] : -1);
        if (xp < 0) return false;
        var level = LevelForExperience(xp);
        if (input.Level != level) return false;
        if (input.Class == "wizard" && level != 1) return false;
        if (input.Resources is { Count: > 0 } || input.Spells is { Count: > 0 } || (input.Class == "wizard" && input.ShieldEquipped)) return false;
        var pb = ProficiencyForLevel(level);
        var scores = new[] { input.Strength, input.Dexterity, input.Constitution, input.Intelligence, input.Wisdom, input.Charisma };
        var mods = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["strength"] = AbilityModifier(scores[0]), ["dexterity"] = AbilityModifier(scores[1]),
            ["constitution"] = AbilityModifier(scores[2]), ["intelligence"] = AbilityModifier(scores[3]),
            ["wisdom"] = AbilityModifier(scores[4]), ["charisma"] = AbilityModifier(scores[5])
        };
        var hp = input.Class == "barbarian"
            ? Math.Max(1, 12 + mods["constitution"]) + level * 1 + (level - 1) * Math.Max(1, 7 + mods["constitution"])
            : Math.Max(1, 6 + mods["constitution"]) + 1;
        var package = input.EquipmentPackage ?? (input.Class == "barbarian" ? "A" : "A");
        if (package is not ("A" or "B")) return false;
        var items = input.Class == "barbarian" ? package == "A"
            ? new List<CharacterInventoryItem> { new("greataxe", 1), new("handaxe", 4), new("explorers-pack", 1) }
            : new List<CharacterInventoryItem>()
            : package == "A" ? new List<CharacterInventoryItem> { new("dagger", 2), new("arcane-focus-quarterstaff", 1), new("robe", 1), new("spellbook", 1), new("scholars-pack", 1) }
            : new List<CharacterInventoryItem>();
        if (input.ShieldEquipped) items.Add(new CharacterInventoryItem("shield", 1, true));
        var skillsAllowed = input.Class == "barbarian" ? BarbSkills : WizardSkills;
        var skills = input.SkillProficiencies ?? (input.Class == "barbarian" ? ["athletics", "perception"] : ["arcana", "history"]);
        if (skills.Count != 2 || skills.Distinct(StringComparer.Ordinal).Count() != 2 || skills.Any(skill => !skillsAllowed.Contains(skill, StringComparer.Ordinal))) return false;
        var cantrips = input.Cantrips ?? (input.Class == "wizard" ? CantripChoices : Array.Empty<string>());
        var book = input.Spellbook ?? (input.Class == "wizard" ? WizardSpells : Array.Empty<string>());
        var prepared = input.PreparedSpells ?? (input.Class == "wizard" ? WizardSpells.Take(4).ToArray() : Array.Empty<string>());
        if (input.Class == "barbarian" && (cantrips.Count > 0 || book.Count > 0 || prepared.Count > 0 || input.CurrentSpellSlots is > 0)) return false;
        if (input.Class == "wizard" && (cantrips.Count != 3 || cantrips.Distinct().Count() != 3 || cantrips.Any(spell => !CantripChoices.Contains(spell)) ||
            book.Count != 6 || book.Distinct().Count() != 6 || book.Any(spell => !WizardSpells.Contains(spell)) ||
            prepared.Count != 4 || prepared.Distinct().Count() != 4 || prepared.Any(spell => !book.Contains(spell)))) return false;
        var slotCurrent = input.CurrentSpellSlots ?? (input.Class == "wizard" ? 2 : 0);
        var rageMax = input.Class == "barbarian" ? 2 : 0;
        var rageCurrent = input.CurrentRageUses ?? rageMax;
        var stoneMax = input.Class == "barbarian" ? pb : 0;
        var stoneCurrent = input.CurrentStonecunningUses ?? stoneMax;
        if (slotCurrent is < 0 or > 2 || rageCurrent < 0 || rageCurrent > rageMax || stoneCurrent < 0 || stoneCurrent > stoneMax ||
            (input.Class == "barbarian" && (slotCurrent != 0 || input.ArcaneRecoveryUsed)) ||
            (input.Class == "wizard" && (rageCurrent != 0 || stoneCurrent != 0))) return false;
        var ac = input.Class == "barbarian" ? 10 + mods["dexterity"] + mods["constitution"] + (input.ShieldEquipped ? 2 : 0) : 10 + mods["dexterity"];
        var saves = input.Class == "barbarian" ? new[] { "strength", "constitution" } : new[] { "intelligence", "wisdom" };
        record = new CharacterRecord(id, input.Name.Trim(), input.Class, input.Species!, level,
            input.Strength, input.Dexterity, input.Constitution, input.Intelligence, input.Wisdom, input.Charisma,
            mods, pb, hp, ac, RulesetVersion, Support, xp, package, items, input.ShieldEquipped,
            cantrips.ToArray(), book.ToArray(), prepared.ToArray(), input.Class == "wizard" ? 2 : 0, slotCurrent, rageMax, rageCurrent,
            stoneMax, stoneCurrent, input.ArcaneRecoveryUsed,
            input.Class == "wizard" ? 8 + mods["intelligence"] + pb : 0,
            input.Class == "wizard" ? mods["intelligence"] + pb : 0,
            skills.ToArray(), saves,
            (input.Class == "barbarian" ? package == "A" ? 15 : 75 : package == "A" ? 5 : 55) - (input.ShieldEquipped ? 10 : 0));
        return true;
    }

    public static CharacterRecord Rest(CharacterRecord character, bool longRest)
    {
        var slots = longRest ? character.SpellSlotMaximum : character.CurrentSpellSlots;
        var rage = longRest ? character.RageMaximum : Math.Min(character.RageMaximum, character.CurrentRageUses + 1);
        return character with
        {
            CurrentSpellSlots = slots,
            CurrentRageUses = longRest ? character.RageMaximum : rage,
            CurrentStonecunningUses = longRest ? character.StonecunningMaximum : character.CurrentStonecunningUses,
            ArcaneRecoveryUsed = longRest ? false : character.ArcaneRecoveryUsed,
            ArcaneRecoveryAvailable = !longRest && character.Class == "wizard" && !character.ArcaneRecoveryUsed
        };
    }

    public static CharacterRecord? ArcaneRecover(CharacterRecord character)
    {
        if (character.Class != "wizard" || character.ArcaneRecoveryUsed || !character.ArcaneRecoveryAvailable || character.CurrentSpellSlots >= character.SpellSlotMaximum) return null;
        return character with { CurrentSpellSlots = character.CurrentSpellSlots + 1, ArcaneRecoveryUsed = true, ArcaneRecoveryAvailable = false };
    }

    public static CharacterRecord? UseResource(CharacterRecord character, string action) => action switch
    {
        "rage" when character.CurrentRageUses > 0 => character with { CurrentRageUses = character.CurrentRageUses - 1 },
        "stonecunning" when character.CurrentStonecunningUses > 0 => character with { CurrentStonecunningUses = character.CurrentStonecunningUses - 1 },
        "spell-slot" when character.CurrentSpellSlots > 0 => character with { CurrentSpellSlots = character.CurrentSpellSlots - 1 },
        _ => null
    };

    public static bool TryRecalculate(CharacterRecord? stored, out CharacterRecord? canonical)
    {
        canonical = null;
        if (stored is null) return false;
        var input = new CharacterInput(stored.Name, stored.Class, stored.Species, stored.Level,
            stored.Strength, stored.Dexterity, stored.Constitution, stored.Intelligence, stored.Wisdom, stored.Charisma,
            TotalExperiencePoints: stored.TotalExperiencePoints, EquipmentPackage: stored.EquipmentPackage ?? "A", ShieldEquipped: stored.ShieldEquipped,
            Cantrips: stored.Cantrips, Spellbook: stored.Spellbook, PreparedSpells: stored.PreparedSpells,
            CurrentSpellSlots: stored.CurrentSpellSlots, CurrentRageUses: stored.CurrentRageUses,
            CurrentStonecunningUses: stored.CurrentStonecunningUses, ArcaneRecoveryUsed: stored.ArcaneRecoveryUsed,
            SkillProficiencies: stored.SkillProficiencies);
        if (!TryCalculate(input, stored.Id, out var refreshed)) return false;
        canonical = refreshed! with { ArcaneRecoveryAvailable = stored.ArcaneRecoveryAvailable && !stored.ArcaneRecoveryUsed &&
            stored.Class == "wizard" && stored.CurrentSpellSlots < refreshed!.SpellSlotMaximum };
        return true;
    }
}
