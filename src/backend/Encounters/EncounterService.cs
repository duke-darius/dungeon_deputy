using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;
using DungeonDeputy.Api.Maps;

namespace DungeonDeputy.Api.Encounters;

public sealed record ConditionDefinition(string Id, string Name, string Source = "core");
public interface IConditionCatalog { IReadOnlyList<ConditionDefinition> All { get; } }
public sealed class BuiltInConditionCatalog : IConditionCatalog
{
    public IReadOnlyList<ConditionDefinition> All { get; } = new[]
    {
        "blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated",
        "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained",
        "stunned", "unconscious", "exhaustion"
    }.Select(id => new ConditionDefinition(id, char.ToUpperInvariant(id[0]) + id[1..])).ToArray();
}

public sealed record EncounterActor(string TokenId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? CurrentHp = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? MaximumHp = null,
    List<string>? ConditionIds = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Initiative = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? InitiativeSource = null,
    int TieBreakOrder = 0);
public sealed record DiceRoll(int Sides, int Face, int Modifier, int Total);
public sealed record EncounterDocument(List<EncounterActor> Actors, string? ActiveTokenId = null, List<DiceRoll>? Rolls = null);
public sealed record EncounterState(List<EncounterActor> Actors, string? ActiveTokenId, List<DiceRoll> Rolls,
    IReadOnlyList<ConditionDefinition> Conditions);
public sealed record HpCommand(int Current, int Maximum);
public sealed record InitiativeCommand(int Value);
public sealed record TieBreakCommand(int Order);
public sealed record ConditionsCommand(List<string>? ConditionIds);
public sealed record DiceCommand(int Sides, int Modifier = 0);

public sealed class EncounterService
{
    public const int MaxHitPoints = 9999;
    public const int MaxInitiative = 1000;
    public const int MaxDiceModifier = 1000;
    private readonly string _connectionString;
    private readonly MapService _maps;
    private readonly IConditionCatalog _conditions;
    private readonly Func<int, int> _roll;
    private readonly SemaphoreSlim _writeGate = new(1, 1);

    public EncounterService(IConfiguration config, MapService maps, IConditionCatalog conditions, Func<int, int>? roll = null)
    {
        _maps = maps;
        _conditions = conditions;
        _roll = roll ?? (max => Random.Shared.Next(1, max + 1));
        var directory = config["DUNGEON_DEPUTY_DATA_DIR"] ?? Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        if (string.IsNullOrWhiteSpace(directory)) throw new InvalidOperationException("DUNGEON_DEPUTY_DATA_DIR is required.");
        Directory.CreateDirectory(directory);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = Path.Combine(Path.GetFullPath(directory), "dungeon-deputy.sqlite3") }.ToString();
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = "CREATE TABLE IF NOT EXISTS private_encounter (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL)";
        cmd.ExecuteNonQuery();
        _ = Get();
    }

    private SqliteConnection Connect() => new(_connectionString);
    private static EncounterDocument Empty(MapDocument map) => new(map.Tokens.Select((t, i) => new EncounterActor(t.Id, ConditionIds: [], TieBreakOrder: i)).ToList(), Rolls: []);
    private EncounterDocument Read(SqliteConnection db)
    {
        using var cmd = db.CreateCommand(); cmd.CommandText = "SELECT document FROM private_encounter WHERE id=1";
        var value = cmd.ExecuteScalar();
        return value is null ? Empty(_maps.Get().Draft) : JsonSerializer.Deserialize<EncounterDocument>((string)value)!;
    }
    private EncounterDocument Reconcile(EncounterDocument state)
    {
        var tokens = _maps.Get().Draft.Tokens;
        var existing = state.Actors.ToDictionary(a => a.TokenId, StringComparer.Ordinal);
        var actors = tokens.Select((token, i) => existing.TryGetValue(token.Id, out var actor)
            ? actor with { ConditionIds = actor.ConditionIds ?? [] }
            : new EncounterActor(token.Id, ConditionIds: [], TieBreakOrder: i)).ToList();
        var active = state.ActiveTokenId is not null && actors.Any(a => a.TokenId == state.ActiveTokenId) ? state.ActiveTokenId : null;
        return state with { Actors = actors, ActiveTokenId = active, Rolls = state.Rolls ?? [] };
    }
    private void Save(SqliteConnection db, SqliteTransaction tx, EncounterDocument state)
    {
        using var cmd = db.CreateCommand(); cmd.Transaction = tx;
        cmd.CommandText = "INSERT INTO private_encounter(id,document) VALUES(1,$doc) ON CONFLICT(id) DO UPDATE SET document=excluded.document";
        cmd.Parameters.AddWithValue("$doc", JsonSerializer.Serialize(state)); cmd.ExecuteNonQuery();
    }
    private static bool Valid(EncounterDocument state) => state.Actors.Count <= 100 && (state.Rolls?.Count ?? 0) <= 100 &&
        state.Actors.Select(a => a.TokenId).Distinct(StringComparer.Ordinal).Count() == state.Actors.Count &&
        state.Actors.All(a => !string.IsNullOrWhiteSpace(a.TokenId) && a.TokenId.Length <= 80 &&
            (a.CurrentHp is null && a.MaximumHp is null || a.CurrentHp is >= 0 and <= MaxHitPoints && a.MaximumHp is >= 0 and <= MaxHitPoints && a.CurrentHp <= a.MaximumHp) &&
            (a.Initiative is null ? a.InitiativeSource is null : a.Initiative is >= -MaxInitiative and <= MaxInitiative && a.InitiativeSource is "manual" or "d20") &&
            a.TieBreakOrder >= 0 && (a.ConditionIds?.Count ?? 0) <= 20 && (a.ConditionIds ?? []).Distinct(StringComparer.Ordinal).Count() == (a.ConditionIds?.Count ?? 0)) &&
        (state.ActiveTokenId is null || state.Actors.Any(a => a.TokenId == state.ActiveTokenId)) &&
        (state.Rolls ?? []).All(r => r.Sides is 4 or 6 or 8 or 10 or 12 or 20 or 100 && r.Face >= 1 && r.Face <= r.Sides && r.Modifier is >= -MaxDiceModifier and <= MaxDiceModifier && r.Total == r.Face + r.Modifier);

    public EncounterState Get()
    {
        _writeGate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction();
            var state = Reconcile(Read(db));
            if (!Valid(state)) throw new InvalidDataException("Stored encounter state is invalid.");
            Save(db, tx, state); tx.Commit();
            return ToState(state);
        }
        finally { _writeGate.Release(); }
    }
    private EncounterState ToState(EncounterDocument d) => new(Order(d.Actors), d.ActiveTokenId, d.Rolls ?? [], _conditions.All);
    public static List<EncounterActor> Order(IEnumerable<EncounterActor> actors) => actors.OrderByDescending(a => a.Initiative ?? int.MinValue).ThenBy(a => a.TieBreakOrder).ToList();

    private bool Change(Func<EncounterDocument, EncounterDocument?> transition)
    {
        _writeGate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction();
            var old = Reconcile(Read(db)); var next = transition(old);
            if (next is null || !Valid(next)) return false;
            Save(db, tx, next); tx.Commit(); return true;
        }
        finally { _writeGate.Release(); }
    }
    private static EncounterDocument? UpdateActor(EncounterDocument state, string id, Func<EncounterActor, EncounterActor?> update)
    {
        var index = state.Actors.FindIndex(a => a.TokenId == id);
        if (index < 0) return null;
        var actors = state.Actors.ToList(); var actor = update(actors[index]); if (actor is null) return null;
        actors[index] = actor; return state with { Actors = actors };
    }
    public bool SetHp(string id, HpCommand command) => command is not null && command.Current is >= 0 and <= MaxHitPoints && command.Maximum is >= 0 and <= MaxHitPoints && command.Current <= command.Maximum &&
        Change(s => UpdateActor(s, id, a => a with { CurrentHp = command.Current, MaximumHp = command.Maximum }));
    public bool SetConditions(string id, ConditionsCommand command) => command?.ConditionIds is { Count: <= 20 } ids && ids.Distinct(StringComparer.Ordinal).Count() == ids.Count && ids.All(id => _conditions.All.Any(c => c.Id == id)) &&
        Change(s => UpdateActor(s, id, a => a with { ConditionIds = ids.ToList() }));
    public bool SetInitiative(string id, InitiativeCommand command) => command is not null && command.Value is >= -MaxInitiative and <= MaxInitiative &&
        Change(s => UpdateActor(s, id, a => a with { Initiative = command.Value, InitiativeSource = "manual" }));
    public bool RollInitiative(string id) => Change(s => UpdateActor(s, id, a =>
    {
        var face = _roll(20);
        return face is >= 1 and <= 20 ? a with { Initiative = face, InitiativeSource = "d20" } : null;
    }));
    public bool SetTieBreak(string id, TieBreakCommand command) => command is not null && command.Order is >= 0 and <= 100 &&
        Change(s => UpdateActor(s, id, a => a with { TieBreakOrder = command.Order }));
    public EncounterState EndTurn() => Change(s =>
    {
        var eligible = Order(s.Actors.Where(a => a.Initiative is not null));
        if (eligible.Count == 0) return null;
        var index = eligible.FindIndex(a => a.TokenId == s.ActiveTokenId);
        return s with { ActiveTokenId = eligible[(index + 1) % eligible.Count].TokenId };
    }) ? Get() : throw new InvalidOperationException("No actors with initiative are available.");
    public DiceRoll? RollDice(DiceCommand command)
    {
        if (command is null || command.Sides is not (4 or 6 or 8 or 10 or 12 or 20 or 100) || command.Modifier is < -MaxDiceModifier or > MaxDiceModifier) return null;
        var face = _roll(command.Sides); if (face < 1 || face > command.Sides) return null;
        var result = new DiceRoll(command.Sides, face, command.Modifier, face + command.Modifier);
        return Change(s => (s.Rolls?.Count ?? 0) >= 100 ? null : s with { Rolls = [.. s.Rolls ?? [], result] }) ? result : null;
    }
}
