using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace DungeonDeputy.Api.Maps;

public sealed record MapToken(string Id, string Name, string Kind, string Color, double X, double Y);
public sealed record MapDocument(string CampaignId, string SessionId, string Id, string Name, string Image, bool GridVisible, double Scale, List<MapToken> Tokens);
public sealed record MapState(MapDocument Draft, MapDocument? Approved);

public sealed class MapService
{
    private readonly string _connectionString;
    public MapService(IConfiguration config)
    {
        var directory = config["DUNGEON_DEPUTY_DATA_DIR"] ?? Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        if (string.IsNullOrWhiteSpace(directory)) throw new InvalidOperationException("DUNGEON_DEPUTY_DATA_DIR is required; launch the backend through Dungeon Deputy so it can use your per-user data folder.");
        Directory.CreateDirectory(directory);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = Path.Combine(Path.GetFullPath(directory), "dungeon-deputy.sqlite3") }.ToString();
        Initialize();
    }
    private SqliteConnection Connect() => new(_connectionString);
    private void Initialize()
    {
        using var db = Connect(); db.Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "CREATE TABLE IF NOT EXISTS map_draft (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS approved_map (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL);";
        cmd.ExecuteNonQuery();
        using var read = db.CreateCommand(); read.CommandText = "SELECT 1 FROM map_draft WHERE id=1";
        if (read.ExecuteScalar() is not null) return;
        var tokens = new List<MapToken>();
        var heroes = new[] { "Mira", "Bram", "Sable", "Tovin" };
        for (var i = 0; i < heroes.Length; i++) tokens.Add(new($"hero-{i + 1}", heroes[i], "hero", "#b89255", 250 + i * 80, 350));
        for (var i = 0; i < 3; i++) tokens.Add(new($"goblin-{i + 1}", $"Goblin {i + 1}", "monster", "#78906a", 650 + i * 70, 350));
        var tavern = new MapDocument("ashen-road", "session-1", "tavern", "The Crooked Tankard", "tavern.svg", true, 48, tokens);
        using var insert = db.CreateCommand(); insert.CommandText = "INSERT INTO map_draft(id,document) VALUES(1,$draft)"; insert.Parameters.AddWithValue("$draft", JsonSerializer.Serialize(tavern)); insert.ExecuteNonQuery();
    }
    public MapState Get()
    {
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand(); cmd.CommandText = "SELECT document FROM map_draft WHERE id=1";
        var draft = JsonSerializer.Deserialize<MapDocument>((string)cmd.ExecuteScalar()!)!;
        using var approved = db.CreateCommand(); approved.CommandText = "SELECT document FROM approved_map WHERE id=1";
        var value = approved.ExecuteScalar(); return new(draft, value is null ? null : JsonSerializer.Deserialize<MapDocument>((string)value));
    }
    public bool Save(MapDocument map)
    {
        if (map is null || map.CampaignId.Length is < 1 or > 80 || map.SessionId.Length is < 1 or > 80 || map.Name.Length is < 1 or > 100 || map.Image is not ("tavern.svg" or "") || !double.IsFinite(map.Scale) || map.Scale is < 8 or > 256 || map.Tokens.Count > 100) return false;
        if (map.Tokens.Any(t => string.IsNullOrWhiteSpace(t.Id) || t.Id.Length > 80 || t.Name.Length > 60 || t.Kind is not ("hero" or "monster") || t.Color.Length > 20 || !double.IsFinite(t.X) || !double.IsFinite(t.Y) || Math.Abs(t.X) > 100000 || Math.Abs(t.Y) > 100000)) return false;
        using var db = Connect(); db.Open(); using var transaction = db.BeginTransaction(); using var cmd = db.CreateCommand(); cmd.Transaction = transaction;
        cmd.CommandText = "UPDATE map_draft SET document=$draft WHERE id=1"; cmd.Parameters.AddWithValue("$draft", JsonSerializer.Serialize(map)); var changed = cmd.ExecuteNonQuery(); transaction.Commit(); return changed == 1;
    }
    public void Publish() { using var db = Connect(); db.Open(); using var transaction = db.BeginTransaction(); using var cmd = db.CreateCommand(); cmd.Transaction=transaction; cmd.CommandText = "INSERT INTO approved_map(id,document) SELECT 1,document FROM map_draft WHERE id=1 ON CONFLICT(id) DO UPDATE SET document=excluded.document"; cmd.ExecuteNonQuery(); transaction.Commit(); }
}
