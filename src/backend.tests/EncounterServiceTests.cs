using DungeonDeputy.Api.Encounters;
using DungeonDeputy.Api.Maps;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class EncounterServiceTests
{
    [Fact]
    public void ValidatedTransitionsPreserveUnsetValuesAndOrderTurnsDeterministically()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-encounter-domain-" + Guid.NewGuid().ToString("N"));
        try
        {
            var config = Config(dir);
            var maps = new MapService(config);
            var service = new EncounterService(config, maps, new BuiltInConditionCatalog(), max => max);
            var initial = service.Get();
            Assert.True(initial.Actors.Count >= 2);
            Assert.All(initial.Actors, actor => { Assert.Null(actor.CurrentHp); Assert.Null(actor.MaximumHp); Assert.Null(actor.Initiative); });
            var first = initial.Actors[0].TokenId;
            var second = initial.Actors[1].TokenId;
            Assert.True(service.SetHp(first, new HpCommand(8, 12)));
            Assert.False(service.SetHp(first, new HpCommand(13, 12)));
            Assert.Equal(8, service.Get().Actors.Single(a => a.TokenId == first).CurrentHp);
            Assert.False(service.SetConditions(first, new ConditionsCommand(["unknown"])));
            Assert.True(service.SetConditions(first, new ConditionsCommand(["blinded"])));
            Assert.True(service.SetInitiative(first, new InitiativeCommand(15)));
            Assert.True(service.SetInitiative(second, new InitiativeCommand(20)));
            Assert.True(service.SetTieBreak(second, new TieBreakCommand(0)));
            Assert.True(service.SetTieBreak(first, new TieBreakCommand(1)));
            Assert.Equal(second, service.Get().Actors[0].TokenId);
            Assert.True(service.RollInitiative(first));
            Assert.Equal("d20", service.Get().Actors.Single(a => a.TokenId == first).InitiativeSource);
            Assert.Equal(second, service.EndTurn().ActiveTokenId);
            Assert.Equal(first, service.EndTurn().ActiveTokenId);
            Assert.Equal(second, service.EndTurn().ActiveTokenId);
            Assert.NotNull(service.RollDice(new DiceCommand(6, -2)));
            Assert.Null(service.RollDice(new DiceCommand(3, 0)));
            Assert.True(maps.RemoveToken(first));
            Assert.DoesNotContain(service.Get().Actors, a => a.TokenId == first);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void EncounterDocumentSurvivesServiceRecreation()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-encounter-reopen-domain-" + Guid.NewGuid().ToString("N"));
        try
        {
            var config = Config(dir);
            var maps = new MapService(config);
            var service = new EncounterService(config, maps, new BuiltInConditionCatalog(), _ => 4);
            var actor = service.Get().Actors[0].TokenId;
            Assert.True(service.SetHp(actor, new HpCommand(3, 7)));
            Assert.NotNull(service.RollDice(new DiceCommand(4, 1)));
            var reopened = new EncounterService(config, maps, new BuiltInConditionCatalog(), _ => 1).Get();
            Assert.Equal(3, reopened.Actors.Single(a => a.TokenId == actor).CurrentHp);
            Assert.Single(reopened.Rolls);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    private static IConfiguration Config(string dir) => new ConfigurationBuilder().AddInMemoryCollection(
        new Dictionary<string, string?> { ["DUNGEON_DEPUTY_DATA_DIR"] = dir }).Build();
}
