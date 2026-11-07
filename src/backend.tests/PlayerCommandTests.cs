using DungeonDeputy.Api.PlayerSessions;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PlayerCommandTests
{
    [Fact]
    public void PlayerCommandSchemaIsClosedAndInventoryMutationsAreBounded()
    {
        Assert.False(PlayerCommands.TryApply(new PlayerSheetState([], new Dictionary<string, int>()), new PlayerCommand("addInventory", Name: "", Quantity: 1), out _));
        Assert.False(PlayerCommands.TryApply(new PlayerSheetState([], new Dictionary<string, int>()), new PlayerCommand("addInventory", Name: new string('x', 200), Quantity: 1), out _));
        Assert.False(PlayerCommands.TryApply(new PlayerSheetState([], new Dictionary<string, int>()), new PlayerCommand("deleteCharacter"), out _));
        Assert.True(PlayerCommands.TryApply(new PlayerSheetState([], new Dictionary<string, int>()), new PlayerCommand("addInventory", Name: "Rope", Quantity: 2), out var state));
        Assert.Equal(2, state!.Inventory.Single().Quantity);
        Assert.True(PlayerCommands.TryApply(state, new PlayerCommand("removeInventory", ItemId: state.Inventory.Single().Id, Quantity: 1), out state));
        Assert.Equal(1, state!.Inventory.Single().Quantity);
        var resources = new PlayerSheetState([], new Dictionary<string, int> { ["test_resource"] = 2 });
        Assert.True(PlayerCommands.TryApply(resources, new PlayerCommand("useResource", ResourceId: "test_resource"), out var used));
        Assert.Equal(1, used!.Resources["test_resource"]);
        Assert.False(PlayerCommands.TryApply(state, new PlayerCommand("useResource", ResourceId: "unknown"), out _));
    }
}
