using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace DungeonDeputy.Api.Characters;

public sealed class CharacterService
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);
    public CharacterService(IConfiguration config)
    {
        var directory = config["DUNGEON_DEPUTY_DATA_DIR"] ?? Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        if (string.IsNullOrWhiteSpace(directory)) throw new InvalidOperationException("DUNGEON_DEPUTY_DATA_DIR is required.");
        Directory.CreateDirectory(directory);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = Path.Combine(Path.GetFullPath(directory), "dungeon-deputy.sqlite3") }.ToString();
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = "CREATE TABLE IF NOT EXISTS dm_characters (id TEXT PRIMARY KEY, name TEXT NOT NULL, document TEXT NOT NULL)";
        cmd.ExecuteNonQuery();
    }
    private SqliteConnection Connect() => new(_connectionString);
    public IReadOnlyList<CharacterRecord> List()
    {
        _gate.Wait();
        try { using var db = Connect(); db.Open(); using var cmd = db.CreateCommand(); cmd.CommandText = "SELECT document FROM dm_characters ORDER BY name COLLATE NOCASE, id"; return ReadMany(cmd); }
        finally { _gate.Release(); }
    }
    private static IReadOnlyList<CharacterRecord> ReadMany(SqliteCommand cmd)
    {
        using var reader = cmd.ExecuteReader(); var records = new List<CharacterRecord>();
        while (reader.Read()) records.Add(JsonSerializer.Deserialize<CharacterRecord>(reader.GetString(0))!);
        return records;
    }
    public CharacterRecord? Get(string id) => List().SingleOrDefault(record => record.Id == id);
    public CharacterRecord? Create(CharacterInput? input)
    {
        var id = Guid.NewGuid().ToString("N");
        if (!CharacterDomain.TryCalculate(input, id, out var record)) return null;
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var cmd = db.CreateCommand();
            cmd.Transaction = tx; cmd.CommandText = "INSERT INTO dm_characters(id,name,document) VALUES($id,$name,$document)";
            cmd.Parameters.AddWithValue("$id", id); cmd.Parameters.AddWithValue("$name", record!.Name); cmd.Parameters.AddWithValue("$document", JsonSerializer.Serialize(record)); cmd.ExecuteNonQuery(); tx.Commit();
            return record;
        }
        finally { _gate.Release(); }
    }
    public CharacterRecord? Update(string id, CharacterInput? input)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 80 || !CharacterDomain.TryCalculate(input, id, out var record)) return null;
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var cmd = db.CreateCommand();
            cmd.Transaction = tx; cmd.CommandText = "UPDATE dm_characters SET name=$name, document=$document WHERE id=$id";
            cmd.Parameters.AddWithValue("$id", id); cmd.Parameters.AddWithValue("$name", record!.Name); cmd.Parameters.AddWithValue("$document", JsonSerializer.Serialize(record));
            if (cmd.ExecuteNonQuery() != 1) return null;
            tx.Commit(); return record;
        }
        finally { _gate.Release(); }
    }
    public bool Delete(string id)
    {
        _gate.Wait();
        try { using var db = Connect(); db.Open(); using var cmd = db.CreateCommand(); cmd.CommandText = "DELETE FROM dm_characters WHERE id=$id"; cmd.Parameters.AddWithValue("$id", id); return cmd.ExecuteNonQuery() == 1; }
        finally { _gate.Release(); }
    }
}
