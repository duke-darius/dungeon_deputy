using System.Text.RegularExpressions;

namespace DungeonDeputy.Api.PlayerSessions;

public sealed record PlayerInventoryItem(string Id, string Name, int Quantity);
public sealed record PlayerSheetState(IReadOnlyList<PlayerInventoryItem> Inventory, IReadOnlyDictionary<string, int> Resources, int? CurrentHitPoints = null);
public sealed record PlayerCommand(string? Type, string? ItemId = null, string? Name = null, int? Quantity = null, string? ResourceId = null);

/// <summary>Closed player write allowlist. It edits bookkeeping only and never derives game mechanics.</summary>
public static class PlayerCommands
{
    public const int MaxInventoryItems = 32;
    public const int MaxItemQuantity = 99;
    private static readonly Regex ItemName = new("^[^\\p{C}]{1,60}$", RegexOptions.CultureInvariant | RegexOptions.Compiled);
    private static readonly Regex ResourceKey = new("^[a-z][a-z0-9_-]{0,31}$", RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static PlayerSheetState Empty { get; } = new([], new Dictionary<string, int>(StringComparer.Ordinal));

    public static bool TryApply(PlayerSheetState? current, PlayerCommand? command, out PlayerSheetState? updated)
    {
        updated = null;
        if (!IsValidState(current) || command is null) return false;
        var state = current!;
        var input = command!;
        switch (input.Type)
        {
            case "addInventory" when input.Name is not null && input.Quantity is >= 1 and <= MaxItemQuantity &&
                                      input.ItemId is null && input.ResourceId is null && ItemName.IsMatch(input.Name.Trim()):
                if (state.Inventory.Count == MaxInventoryItems) return false;
                updated = state with { Inventory = [.. state.Inventory, new PlayerInventoryItem(Guid.NewGuid().ToString("N"), input.Name.Trim(), input.Quantity.Value)] };
                return true;
            case "removeInventory" when input.ItemId is { Length: <= 32 } id && input.Quantity is >= 1 and <= MaxItemQuantity &&
                                         input.Name is null && input.ResourceId is null:
                var index = -1;
                for (var i = 0; i < state.Inventory.Count; i++) if (state.Inventory[i].Id == id) { index = i; break; }
                if (index < 0) return false;
                var items = state.Inventory.ToList(); var existing = items[index];
                if (existing.Quantity < input.Quantity) return false;
                if (existing.Quantity == input.Quantity) items.RemoveAt(index);
                else items[index] = existing with { Quantity = existing.Quantity - input.Quantity.Value };
                updated = state with { Inventory = items }; return true;
            case "useResource" when input.ResourceId is { Length: <= 32 } resource && ResourceKey.IsMatch(resource) &&
                                     input.ItemId is null && input.Name is null && input.Quantity is null:
                if (!state.Resources.TryGetValue(resource, out var count) || count < 1) return false;
                var resources = state.Resources.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
                resources[resource] = count - 1;
                updated = state with { Resources = resources }; return true;
            default:
                return false;
        }
    }

    public static bool IsValidState(PlayerSheetState? state) => state is not null && state.Inventory.Count <= MaxInventoryItems && state.Resources.Count <= 32 &&
        state.Inventory.All(ValidItem) && state.Inventory.Select(item => item.Id).Distinct(StringComparer.Ordinal).Count() == state.Inventory.Count &&
        state.Resources.All(pair => ResourceKey.IsMatch(pair.Key) && pair.Value is >= 0 and <= MaxItemQuantity);

    private static bool ValidItem(PlayerInventoryItem item) => !string.IsNullOrWhiteSpace(item.Id) && item.Id.Length == 32 &&
        item.Id.All(Uri.IsHexDigit) && item.Name is not null && ItemName.IsMatch(item.Name) && item.Name == item.Name.Trim() && item.Quantity is >= 1 and <= MaxItemQuantity;
}
