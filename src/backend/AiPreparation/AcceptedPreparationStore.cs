using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace DungeonDeputy.Api.AiPreparation;

public sealed record AcceptedPreparation(string Id, string Kind, JsonElement Content,
    IReadOnlyList<AiSelectedSrdRecord> References, string CampaignId, string SessionId,
    string CreatedAt, string UpdatedAt);

/// <summary>Private, allowlisted narrative records. Provider requests and envelopes have no storage path.</summary>
public sealed class AcceptedPreparationStore
{
    private readonly string _connectionString;

    public AcceptedPreparationStore(IConfiguration configuration)
    {
        var directory = configuration["DUNGEON_DEPUTY_DATA_DIR"] ?? Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        if (string.IsNullOrWhiteSpace(directory)) throw new InvalidOperationException("DUNGEON_DEPUTY_DATA_DIR is required.");
        Directory.CreateDirectory(directory);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = Path.Combine(Path.GetFullPath(directory), "dungeon-deputy.sqlite3") }.ToString();
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = "CREATE TABLE IF NOT EXISTS accepted_preparation (id TEXT PRIMARY KEY, kind TEXT NOT NULL, content TEXT NOT NULL, references_json TEXT NOT NULL, campaign_id TEXT NOT NULL, session_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TRIGGER IF NOT EXISTS accepted_preparation_limit BEFORE INSERT ON accepted_preparation WHEN (SELECT COUNT(*) FROM accepted_preparation) >= 500 BEGIN SELECT RAISE(ABORT, 'accepted preparation limit reached'); END";
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Connect() => new(_connectionString);

    public IReadOnlyList<AcceptedPreparation> List()
    {
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT id,kind,content,references_json,campaign_id,session_id,created_at,updated_at FROM accepted_preparation ORDER BY created_at DESC,id LIMIT 500";
        using var reader = cmd.ExecuteReader(); var items = new List<AcceptedPreparation>();
        while (reader.Read()) items.Add(Read(reader));
        return items;
    }

    public AcceptedPreparation? Get(string id)
    {
        if (!ValidId(id)) return null;
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT id,kind,content,references_json,campaign_id,session_id,created_at,updated_at FROM accepted_preparation WHERE id=$id";
        cmd.Parameters.AddWithValue("$id", id); using var reader = cmd.ExecuteReader();
        return reader.Read() ? Read(reader) : null;
    }

    internal AcceptedPreparation InsertInTransaction(SqliteConnection db, SqliteTransaction tx, string kind,
        JsonElement content, IReadOnlyList<AiSelectedSrdRecord> references, string campaignId, string sessionId)
    {
        var now = DateTimeOffset.UtcNow.ToString("O");
        var item = new AcceptedPreparation(Guid.NewGuid().ToString("N"), kind, content.Clone(), references,
            campaignId, sessionId, now, now);
        using var cmd = db.CreateCommand(); cmd.Transaction = tx;
        cmd.CommandText = "INSERT INTO accepted_preparation(id,kind,content,references_json,campaign_id,session_id,created_at,updated_at) VALUES($id,$kind,$content,$refs,$campaign,$session,$created,$updated)";
        Bind(cmd, item); cmd.ExecuteNonQuery(); return item;
    }

    public AcceptedPreparation? Update(string id, string kind, JsonElement content, IReadOnlyList<AiSelectedSrdRecord> references)
    {
        if (!ValidId(id)) return null;
        using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(deferred: false);
        using var cmd = db.CreateCommand(); cmd.Transaction = tx;
        cmd.CommandText = "UPDATE accepted_preparation SET kind=$kind,content=$content,references_json=$refs,updated_at=$updated WHERE id=$id";
        cmd.Parameters.AddWithValue("$id", id); cmd.Parameters.AddWithValue("$kind", kind);
        cmd.Parameters.AddWithValue("$content", content.GetRawText()); cmd.Parameters.AddWithValue("$refs", JsonSerializer.Serialize(references));
        cmd.Parameters.AddWithValue("$updated", DateTimeOffset.UtcNow.ToString("O"));
        if (cmd.ExecuteNonQuery() != 1) return null;
        tx.Commit(); return Get(id);
    }

    public bool Delete(string id)
    {
        if (!ValidId(id)) return false;
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = "DELETE FROM accepted_preparation WHERE id=$id"; cmd.Parameters.AddWithValue("$id", id);
        return cmd.ExecuteNonQuery() == 1;
    }

    private static void Bind(SqliteCommand cmd, AcceptedPreparation item)
    {
        cmd.Parameters.AddWithValue("$id", item.Id); cmd.Parameters.AddWithValue("$kind", item.Kind);
        cmd.Parameters.AddWithValue("$content", item.Content.GetRawText()); cmd.Parameters.AddWithValue("$refs", JsonSerializer.Serialize(item.References));
        cmd.Parameters.AddWithValue("$campaign", item.CampaignId); cmd.Parameters.AddWithValue("$session", item.SessionId);
        cmd.Parameters.AddWithValue("$created", item.CreatedAt); cmd.Parameters.AddWithValue("$updated", item.UpdatedAt);
    }

    private static AcceptedPreparation Read(SqliteDataReader r) => new(r.GetString(0), r.GetString(1),
        JsonDocument.Parse(r.GetString(2)).RootElement.Clone(), JsonSerializer.Deserialize<List<AiSelectedSrdRecord>>(r.GetString(3)) ?? [],
        r.GetString(4), r.GetString(5), r.GetString(6), r.GetString(7));

    private static bool ValidId(string? id) => id is { Length: 32 } && id.All(Uri.IsHexDigit);
}
