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
        while (reader.Read())
        {
            try
            {
                var stored = JsonSerializer.Deserialize<CharacterRecord>(reader.GetString(0));
                if (CharacterDomain.TryRecalculate(stored, out var canonical)) records.Add(canonical!);
            }
            catch (JsonException) { /* Malformed persisted documents are excluded, never trusted or returned. */ }
        }
        return records;
    }
    public CharacterRecord? Get(string id) => List().SingleOrDefault(record => record.Id == id);
    public CharacterRecord? Create(CharacterInput? input)
    {
        var id = Guid.NewGuid().ToString("N");
        if (!CharacterDomain.TryCalculate(input is null ? null : input with { CurrentSpellSlots = null, CurrentRageUses = null,
            CurrentStonecunningUses = null, ArcaneRecoveryUsed = false }, id, out var record)) return null;
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
        if (string.IsNullOrWhiteSpace(id) || id.Length > 80 || input is null) return null;
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var cmd = db.CreateCommand();
            cmd.Transaction = tx; cmd.CommandText = "SELECT document FROM dm_characters WHERE id=$id"; cmd.Parameters.AddWithValue("$id", id);
            var existingJson = cmd.ExecuteScalar() as string;
            if (existingJson is null) return null;
            CharacterRecord? existing;
            try { existing = JsonSerializer.Deserialize<CharacterRecord>(existingJson); } catch (JsonException) { return null; }
            if (!CharacterDomain.TryRecalculate(existing, out var canonicalExisting)) return null;
            var effective = input with { CurrentSpellSlots = canonicalExisting!.CurrentSpellSlots, CurrentRageUses = canonicalExisting.CurrentRageUses,
                CurrentStonecunningUses = canonicalExisting.CurrentStonecunningUses, ArcaneRecoveryUsed = canonicalExisting.ArcaneRecoveryUsed };
            if (!CharacterDomain.TryCalculate(effective, id, out var record)) return null;
            record = record! with { ArcaneRecoveryAvailable = canonicalExisting.ArcaneRecoveryAvailable };
            cmd.CommandText = "UPDATE dm_characters SET name=$name, document=$document WHERE id=$id";
            cmd.Parameters.Clear(); cmd.Parameters.AddWithValue("$id", id); cmd.Parameters.AddWithValue("$name", record!.Name); cmd.Parameters.AddWithValue("$document", JsonSerializer.Serialize(record));
            if (cmd.ExecuteNonQuery() != 1) return null;
            tx.Commit(); return record;
        }
        finally { _gate.Release(); }
    }
    public CharacterRecord? Rest(string id, bool longRest, bool arcaneRecovery)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 80 || (longRest && arcaneRecovery)) return null;
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var cmd = db.CreateCommand();
            cmd.Transaction = tx; cmd.CommandText = "SELECT document FROM dm_characters WHERE id=$id"; cmd.Parameters.AddWithValue("$id", id);
            var json = cmd.ExecuteScalar() as string;
            if (json is null) return null;
            CharacterRecord? record;
            try { record = JsonSerializer.Deserialize<CharacterRecord>(json); } catch (JsonException) { return null; }
            if (!CharacterDomain.TryRecalculate(record, out var canonical)) return null;
            var updated = arcaneRecovery ? CharacterDomain.ArcaneRecover(canonical!) : CharacterDomain.Rest(canonical!, longRest);
            if (updated is null) return null;
            using var save = db.CreateCommand(); save.Transaction = tx;
            save.CommandText = "UPDATE dm_characters SET document=$document WHERE id=$id";
            save.Parameters.AddWithValue("$id", id); save.Parameters.AddWithValue("$document", JsonSerializer.Serialize(updated));
            if (save.ExecuteNonQuery() != 1) return null;
            tx.Commit(); return updated;
        }
        finally { _gate.Release(); }
    }
    public CharacterRecord? UseResource(string id, string action)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 80) return null;
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var cmd = db.CreateCommand();
            cmd.Transaction = tx; cmd.CommandText = "SELECT document FROM dm_characters WHERE id=$id"; cmd.Parameters.AddWithValue("$id", id);
            var json = cmd.ExecuteScalar() as string; if (json is null) return null;
            CharacterRecord? stored; try { stored = JsonSerializer.Deserialize<CharacterRecord>(json); } catch (JsonException) { return null; }
            if (!CharacterDomain.TryRecalculate(stored, out var canonical)) return null;
            var updated = CharacterDomain.UseResource(canonical!, action); if (updated is null) return null;
            using var save = db.CreateCommand(); save.Transaction = tx;
            save.CommandText = "UPDATE dm_characters SET document=$document WHERE id=$id";
            save.Parameters.AddWithValue("$id", id); save.Parameters.AddWithValue("$document", JsonSerializer.Serialize(updated));
            if (save.ExecuteNonQuery() != 1) return null;
            tx.Commit(); return updated;
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
