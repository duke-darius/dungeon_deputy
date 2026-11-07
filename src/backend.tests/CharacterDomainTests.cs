using DungeonDeputy.Api.Characters;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class CharacterDomainTests
{
    [Theory]
    [InlineData(0, 1, 2)] [InlineData(299, 1, 2)] [InlineData(300, 2, 2)]
    [InlineData(6499, 4, 2)] [InlineData(6500, 5, 3)] [InlineData(84999, 10, 4)]
    [InlineData(85000, 11, 4)] [InlineData(355000, 20, 6)]
    public void ExperienceAndProficiencyFollowAdvancementTable(int xp, int level, int pb)
    {
        Assert.Equal(level, CharacterDomain.LevelForExperience(xp));
        Assert.Equal(pb, CharacterDomain.ProficiencyForLevel(level));
        Assert.True(CharacterDomain.TryCalculate(Valid("barbarian") with { TotalExperiencePoints = xp, Level = level }, "c", out var record));
        Assert.Equal(level, record!.Level);
    }

    [Fact]
    public void EveryAdvancementBoundaryAndImmediatelyPreviousPointMapsExactly()
    {
        var thresholds = new[] {0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000};
        for (var index = 0; index < thresholds.Length; index++)
        {
            Assert.Equal(index + 1, CharacterDomain.LevelForExperience(thresholds[index]));
            if (thresholds[index] > 0) Assert.Equal(index, CharacterDomain.LevelForExperience(thresholds[index] - 1));
            Assert.Equal(2 + index / 4, CharacterDomain.ProficiencyForLevel(index + 1));
        }
    }

    [Theory]
    [InlineData(1, -5)] [InlineData(2, -4)] [InlineData(4, -3)] [InlineData(6, -2)]
    [InlineData(8, -1)] [InlineData(10, 0)] [InlineData(12, 1)] [InlineData(14, 2)]
    [InlineData(16, 3)] [InlineData(18, 4)] [InlineData(20, 5)] [InlineData(22, 6)]
    [InlineData(24, 7)] [InlineData(26, 8)] [InlineData(28, 9)] [InlineData(30, 10)]
    public void AbilityModifierTableCoversLegalScoreDomain(int score, int modifier) => Assert.Equal(modifier, CharacterDomain.AbilityModifier(score));

    [Fact]
    public void EveryAbilityScoreInModifierDomainMatchesTheTable()
    {
        for (var score = 1; score <= 30; score++) Assert.Equal((int)Math.Floor((score - 10) / 2.0), CharacterDomain.AbilityModifier(score));
    }

    [Fact]
    public void BarbarianHitPointsShieldAndPackagesAreSourceBounded()
    {
        Assert.True(CharacterDomain.TryCalculate(Valid("barbarian") with { TotalExperiencePoints = 6500, Level = 5, ShieldEquipped = true }, "c", out var levelFive));
        Assert.Equal(55, levelFive!.HitPointMaximum);
        Assert.Equal(16, levelFive.ArmorClass);
        Assert.Equal(3, levelFive.ProficiencyBonus);
        Assert.Equal(2, levelFive.RageMaximum);
        Assert.Equal(3, levelFive.StonecunningMaximum);
        Assert.True(CharacterDomain.TryRecalculate(levelFive, out var refreshed));
        Assert.Equal(levelFive.HitPointMaximum, refreshed!.HitPointMaximum);
        Assert.Equal(5, CharacterDomain.AbilityCheckBonus(levelFive, "strength", true));
        Assert.Equal(2, CharacterDomain.AbilityCheckBonus(levelFive, "strength", false));
        Assert.Equal(5, CharacterDomain.SavingThrowBonus(levelFive, "strength"));
        Assert.Equal(2, CharacterDomain.SavingThrowBonus(levelFive, "dexterity"));
        Assert.Equal(5, CharacterDomain.WeaponAttackBonus(levelFive, "strength", "greataxe"));
        Assert.Null(CharacterDomain.WeaponAttackBonus(levelFive, "strength", "unlisted"));
        Assert.Equal(5, levelFive.GoldPieces);
        Assert.Contains(levelFive.Inventory!, item => item.ItemId == "handaxe" && item.Quantity == 4);
        Assert.False(CharacterDomain.TryCalculate(Valid("barbarian") with { TotalExperiencePoints = 6500, Level = 4 }, "c", out _));
        Assert.True(CharacterDomain.TryCalculate(Valid("barbarian") with { EquipmentPackage = "B" }, "c", out var packageB));
        Assert.Empty(packageB!.Inventory!);
        Assert.Equal(75, packageB.GoldPieces);
        Assert.True(CharacterDomain.TryCalculate(Valid("barbarian") with { EquipmentPackage = "B", ShieldEquipped = true }, "c", out var packageBShield));
        Assert.Equal(65, packageBShield!.GoldPieces);
        Assert.Contains(packageBShield.Inventory!, item => item.ItemId == "shield" && item.Equipped);
    }

    [Fact]
    public void WizardSpellNameSelectionsSlotsAndSpellcastingAreClosedAndBounded()
    {
        Assert.True(CharacterDomain.TryCalculate(Valid("wizard") with { Intelligence = 16 }, "w", out var wizard));
        Assert.Equal(3, wizard!.Cantrips!.Count);
        Assert.Equal(6, wizard.Spellbook!.Count);
        Assert.Equal(4, wizard.PreparedSpells!.Count);
        Assert.Equal(2, wizard.SpellSlotMaximum);
        Assert.Equal(13, wizard.SpellSaveDc);
        Assert.Equal(5, wizard.SpellAttackBonus);
        Assert.False(CharacterDomain.TryCalculate(Valid("wizard") with { TotalExperiencePoints = 300, Level = 2 }, "w", out _));
        Assert.False(CharacterDomain.TryCalculate(Valid("wizard") with { PreparedSpells = ["unsupported"] }, "w", out _));
        Assert.False(CharacterDomain.TryCalculate(Valid("wizard") with { Spellbook = ["unsupported"] }, "w", out _));
        Assert.False(CharacterDomain.TryCalculate(Valid("wizard") with { SkillProficiencies = ["nature", "arcana"] }, "w", out _));
    }

    [Fact]
    public void RestAndArcaneRecoveryRestoreOnlyPermittedResources()
    {
        Assert.True(CharacterDomain.TryCalculate(Valid("barbarian") with { CurrentRageUses = 0, CurrentStonecunningUses = 0 }, "b", out var barbarian));
        var shortRest = CharacterDomain.Rest(barbarian!, false);
        Assert.Equal(1, shortRest.CurrentRageUses);
        Assert.Equal(0, shortRest.CurrentStonecunningUses);
        var longRest = CharacterDomain.Rest(shortRest, true);
        Assert.Equal(2, longRest.CurrentRageUses);
        Assert.Equal(2, longRest.CurrentStonecunningUses);
        Assert.True(CharacterDomain.TryCalculate(Valid("wizard") with { CurrentSpellSlots = 1 }, "w", out var wizard));
        var afterShortRest = CharacterDomain.Rest(wizard!, false);
        var recovered = CharacterDomain.ArcaneRecover(afterShortRest);
        Assert.Equal(2, recovered!.CurrentSpellSlots);
        Assert.Null(CharacterDomain.ArcaneRecover(recovered));
        Assert.Equal(2, CharacterDomain.Rest(wizard!, true).CurrentSpellSlots);
    }

    [Fact]
    public void ProvenanceAndClosedOptionSetsAreExplicit()
    {
        var rules = SupportedRules.Current;
        Assert.Equal(CharacterDomain.PdfSha256, rules.PdfSha256);
        Assert.Contains("p. 79", rules.Citations["spells"]);
        Assert.Contains("ID", rules.CategoryStatus["spells"]);
        Assert.False(CharacterDomain.TryCalculate(Valid("barbarian") with { Resources = new Dictionary<string, int> { ["rage"] = 99 } }, "c", out _));
        Assert.False(CharacterDomain.TryCalculate(Valid("barbarian") with { Inventory = ["unknown"] }, "c", out _));
        Assert.False(CharacterDomain.TryCalculate(Valid("wizard") with { SkillProficiencies = ["arcana", "arcana"] }, "w", out _));
        Assert.Throws<ArgumentOutOfRangeException>(() => CharacterDomain.AbilityModifier(31));
    }

    private static CharacterInput Valid(string @class) => new("Mira", @class, "dwarf", 1, 15, 14, 14, 10, 12, 8);
}
