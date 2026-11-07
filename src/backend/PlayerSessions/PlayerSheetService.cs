using DungeonDeputy.Api.Characters;

namespace DungeonDeputy.Api.PlayerSessions;

public sealed record PlayerResourceItem(string Id, int Remaining);
public sealed record PlayerSheetProjection(
    string Name, string Class, string Species, int Level,
    int Strength, int Dexterity, int Constitution, int Intelligence, int Wisdom, int Charisma,
    IReadOnlyDictionary<string, int> AbilityModifiers, int ProficiencyBonus,
    int HitPointMaximum, int CurrentHitPoints, int ArmorClass, string RulesetVersion,
    IReadOnlyList<PlayerInventoryItem> Inventory, IReadOnlyList<PlayerResourceItem> Resources);
public sealed record PlayerSheetResult(PlayerSheetProjection? Sheet, string? Error);

/// <summary>Produces only the current bearer assignment's character-sheet projection and allowed mutations.</summary>
public sealed class PlayerSheetService(PlayerAuthorization authorization, PlayerSessionService sessions, CharacterService characters)
{
    public const int MaxCommandAttemptsPerMinute = 30;
    private static readonly TimeSpan RateWindow = TimeSpan.FromMinutes(1);
    private readonly object _rateLock = new();
    private readonly Dictionary<string, Queue<DateTimeOffset>> _attempts = new(StringComparer.Ordinal);

    public PlayerSheetResult Get(string? bearerToken)
    {
        var identity = authorization.Resolve(bearerToken);
        if (identity is null) return new(null, authorization.Failure(bearerToken) ?? "invalid");
        var character = characters.Get(identity.CharacterId);
        var state = sessions.ReadPlayerSheet(identity);
        if (character is null || state is null) return new(null, "revoked");
        return new(Project(character, state), null);
    }

    public PlayerSheetResult Execute(string? bearerToken, PlayerCommand? command)
    {
        var identity = authorization.Resolve(bearerToken);
        if (identity is null) return new(null, authorization.Failure(bearerToken) ?? "invalid");
        if (!TryConsumeAttempt(identity.PlayerId, DateTimeOffset.UtcNow)) return new(null, "too-many-requests");
        if (command is null) return new(null, "invalid-command");
        if (!sessions.ApplyPlayerCommand(identity, command, out var state, out var stillAuthorized))
            return stillAuthorized ? new(null, "invalid-command") : new(null, "revoked");
        var character = characters.Get(identity.CharacterId);
        return character is null || state is null ? new(null, "revoked") : new(Project(character, state), null);
    }

    private static PlayerSheetProjection Project(CharacterRecord character, PlayerSheetState state) => new(
        character.Name, character.Class, character.Species, character.Level,
        character.Strength, character.Dexterity, character.Constitution, character.Intelligence, character.Wisdom, character.Charisma,
        character.AbilityModifiers, character.ProficiencyBonus, character.HitPointMaximum,
        state.CurrentHitPoints ?? character.HitPointMaximum, character.ArmorClass,
        character.RulesetVersion, state.Inventory.ToArray(), state.Resources.Where(pair => pair.Value > 0)
            .Select(pair => new PlayerResourceItem(pair.Key, pair.Value)).OrderBy(resource => resource.Id, StringComparer.Ordinal).ToArray());

    private bool TryConsumeAttempt(string playerId, DateTimeOffset now)
    {
        lock (_rateLock)
        {
            foreach (var key in _attempts.Where(pair => !pair.Value.TryPeek(out var oldest) || now - oldest >= RateWindow).Select(pair => pair.Key).ToArray()) _attempts.Remove(key);
            if (!_attempts.TryGetValue(playerId, out var queue)) _attempts[playerId] = queue = new();
            while (queue.TryPeek(out var oldest) && now - oldest >= RateWindow) queue.Dequeue();
            if (queue.Count >= MaxCommandAttemptsPerMinute) return false;
            queue.Enqueue(now); return true;
        }
    }
}
