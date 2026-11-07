using DungeonDeputy.Api.Characters;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class CharacterDomainTests
{
    [Fact]
    public void SupportedRulesExposeOnlyDirectlyCitedRulesAndMakeOtherCategoriesUnavailable()
    {
        var rules = SupportedRules.Current;
        Assert.Equal(CharacterDomain.PdfSha256, rules.PdfSha256);
        Assert.Contains("level 1", rules.Citations["proficiency"], StringComparison.OrdinalIgnoreCase);
        Assert.Equal(new[] { 1 }, rules.SupportedLevels);
        Assert.Empty(rules.SupportedEquipment);
        Assert.Empty(rules.SupportedSpells);
        Assert.Equal("Unavailable", rules.CategoryStatus["inventory"]);
        Assert.Equal("Unavailable", rules.CategoryStatus["spells"]);
        Assert.Equal("Unavailable", rules.CategoryStatus["resources"]);
        Assert.Equal("Level 1 only", rules.CategoryStatus["level"]);
    }

    [Theory]
    [InlineData(3, -4)]
    [InlineData(9, -1)]
    [InlineData(10, 0)]
    [InlineData(11, 0)]
    [InlineData(12, 1)]
    [InlineData(20, 5)]
    public void AbilityModifierUsesCitedScoreBands(int score, int modifier)
    {
        Assert.True(CharacterDomain.TryCalculate(ValidInput() with { Strength = score }, "test-id", out var result));
        Assert.Equal(modifier, result!.AbilityModifiers["strength"]);
    }

    [Fact]
    public void DerivedValuesAreRecalculatedAndUnsupportedProgressionAndOptionsRejected()
    {
        Assert.True(CharacterDomain.TryCalculate(ValidInput(), "test-id", out var result));
        Assert.Equal(2, result!.ProficiencyBonus);
        Assert.Equal(15, result.HitPointMaximum);
        Assert.Equal(14, result.ArmorClass);
        Assert.False(CharacterDomain.TryCalculate(ValidInput() with { Level = 2 }, "test-id", out _));
        Assert.False(CharacterDomain.TryCalculate(ValidInput() with { Class = "wizard" }, "test-id", out _));
        Assert.False(CharacterDomain.TryCalculate(ValidInput() with { Species = "elf" }, "test-id", out _));
    }

    [Fact]
    public void InventorySpellAndResourceCommandsCannotInventUnsupportedRules()
    {
        Assert.False(CharacterDomain.TryCalculate(ValidInput() with { Inventory = ["invented item"] }, "test-id", out _));
        Assert.False(CharacterDomain.TryCalculate(ValidInput() with { Spells = ["invented spell"] }, "test-id", out _));
        Assert.False(CharacterDomain.TryCalculate(ValidInput() with { Resources = new Dictionary<string, int> { ["rage"] = 9 } }, "test-id", out _));
    }

    private static CharacterInput ValidInput() => new("Mira", "barbarian", "dwarf", 1,
        15, 14, 14, 10, 12, 8);
}
