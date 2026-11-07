using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace DungeonDeputy.Api.PlayerSessions;

public sealed record PlayerSession(string Id, DateTimeOffset StartedAt, bool Active);
public sealed record PlayerInvite(string Id, string Secret, string CharacterId, DateTimeOffset ExpiresAt);
public sealed record PlayerGrant(string PlayerId, string Token, string CharacterId, DateTimeOffset ExpiresAt);
public sealed record PlayerIdentity(string PlayerId, string SessionId, string CharacterId, DateTimeOffset ExpiresAt);
public sealed record PlayerSessionView(string Id, DateTimeOffset StartedAt, bool Active, int PairedCount);
public sealed record PlayerAssignmentView(string PlayerId, string CharacterId, DateTimeOffset ExpiresAt,
    IReadOnlyList<PlayerInventoryItem> Inventory, IReadOnlyDictionary<string, int> Resources, int? CurrentHitPoints = null);
public sealed record PlayerExchangeResult(PlayerGrant? Grant, string? Failure);

/// <summary>Persists only SHA-256 digests of ephemeral invite and player bearer secrets.</summary>
public sealed class PlayerSessionService : IDisposable
{
    public const int MaxPlayers = 2;
    public const int MaxFailedInviteAttempts = 5;
    private static readonly TimeSpan InviteLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan PlayerLifetime = TimeSpan.FromHours(8);
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly object _throttleLock = new();
    private readonly Dictionary<string, Queue<DateTimeOffset>> _failedAttempts = new(StringComparer.Ordinal);

    public PlayerSessionService(string dataDirectory)
    {
        if (string.IsNullOrWhiteSpace(dataDirectory)) throw new ArgumentException("Data directory is required.", nameof(dataDirectory));
        Directory.CreateDirectory(dataDirectory);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = Path.Combine(Path.GetFullPath(dataDirectory), "dungeon-deputy.sqlite3") }.ToString();
        using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS player_sessions(id TEXT PRIMARY KEY, started_utc TEXT NOT NULL, active INTEGER NOT NULL CHECK(active IN (0,1)));
            CREATE TABLE IF NOT EXISTS player_invites(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, character_id TEXT NOT NULL, secret_hash TEXT NOT NULL UNIQUE, expires_utc TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS player_assignments(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, character_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_utc TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
            UPDATE player_sessions SET active=0 WHERE active=1;
            UPDATE player_assignments SET revoked=1 WHERE revoked=0;
            UPDATE player_invites SET used=1 WHERE used=0;
            """;
        cmd.ExecuteNonQuery();
        EnsureColumn("inventory_json", "TEXT NOT NULL DEFAULT '[]'");
        EnsureColumn("resources_json", "TEXT NOT NULL DEFAULT '{}'");
        EnsureColumn("current_hp", "INTEGER");
    }

    private SqliteConnection Connect() => new(_connectionString);
    private void EnsureColumn(string name, string definition)
    {
        using var db = Connect(); db.Open(); using var check = db.CreateCommand();
        check.CommandText = "SELECT COUNT(*) FROM pragma_table_info('player_assignments') WHERE name=$name";
        check.Parameters.AddWithValue("$name", name);
        if (Convert.ToInt32(check.ExecuteScalar(), System.Globalization.CultureInfo.InvariantCulture) != 0) return;
        using var alter = db.CreateCommand(); alter.CommandText = $"ALTER TABLE player_assignments ADD COLUMN {name} {definition}"; alter.ExecuteNonQuery();
    }
    private static string NewSecret(int bytes) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static string Digest(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static bool Matches(string storedHash, string supplied) =>
        CryptographicOperations.FixedTimeEquals(Convert.FromHexString(storedHash), SHA256.HashData(Encoding.UTF8.GetBytes(supplied)));
    private static string Iso(DateTimeOffset value) => value.ToUniversalTime().ToString("O");
    private static DateTimeOffset ReadDate(string value) => DateTimeOffset.Parse(value, null, System.Globalization.DateTimeStyles.RoundtripKind);
    private static bool ValidCharacterId(string value) => !string.IsNullOrWhiteSpace(value) && value.Length <= 80 && value.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');

    public PlayerSession Start()
    {
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction();
            using (var stop = db.CreateCommand()) { stop.Transaction = tx; stop.CommandText = "UPDATE player_sessions SET active=0 WHERE active=1"; stop.ExecuteNonQuery(); }
            using (var revoke = db.CreateCommand()) { revoke.Transaction = tx; revoke.CommandText = "UPDATE player_assignments SET revoked=1 WHERE revoked=0"; revoke.ExecuteNonQuery(); }
            using (var invalidate = db.CreateCommand()) { invalidate.Transaction = tx; invalidate.CommandText = "UPDATE player_invites SET used=1 WHERE used=0"; invalidate.ExecuteNonQuery(); }
            var session = new PlayerSession(Guid.NewGuid().ToString("N"), DateTimeOffset.UtcNow, true);
            using var insert = db.CreateCommand(); insert.Transaction = tx; insert.CommandText = "INSERT INTO player_sessions(id,started_utc,active) VALUES($id,$started,1)";
            insert.Parameters.AddWithValue("$id", session.Id); insert.Parameters.AddWithValue("$started", Iso(session.StartedAt)); insert.ExecuteNonQuery(); tx.Commit(); return session;
        }
        finally { _gate.Release(); }
    }

    public PlayerSessionView? GetActiveSession()
    {
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
            cmd.CommandText = "SELECT id,started_utc,(SELECT COUNT(*) FROM player_assignments a WHERE a.session_id=s.id AND a.revoked=0 AND a.expires_utc>$now) FROM player_sessions s WHERE active=1 ORDER BY started_utc DESC LIMIT 1";
            cmd.Parameters.AddWithValue("$now", Iso(DateTimeOffset.UtcNow)); using var reader = cmd.ExecuteReader();
            return reader.Read() ? new PlayerSessionView(reader.GetString(0), ReadDate(reader.GetString(1)), true, reader.GetInt32(2)) : null;
        }
        finally { _gate.Release(); }
    }

    public IReadOnlyList<PlayerAssignmentView> GetAssignments(string sessionId)
    {
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
             cmd.CommandText = "SELECT id,character_id,expires_utc,inventory_json,resources_json,current_hp FROM player_assignments WHERE session_id=$session AND revoked=0 AND expires_utc>$now ORDER BY character_id";
            cmd.Parameters.AddWithValue("$session", sessionId); cmd.Parameters.AddWithValue("$now", Iso(DateTimeOffset.UtcNow)); using var reader = cmd.ExecuteReader();
            var result = new List<PlayerAssignmentView>();
            while (reader.Read())
            {
                try
                {
                    result.Add(new(reader.GetString(0), reader.GetString(1), ReadDate(reader.GetString(2)),
                        JsonSerializer.Deserialize<List<PlayerInventoryItem>>(reader.GetString(3)) ?? [],
                        JsonSerializer.Deserialize<Dictionary<string, int>>(reader.GetString(4)) ?? new(StringComparer.Ordinal), reader.IsDBNull(5) ? null : reader.GetInt32(5)));
                }
                catch (JsonException) { result.Add(new(reader.GetString(0), reader.GetString(1), ReadDate(reader.GetString(2)), [], new Dictionary<string, int>(StringComparer.Ordinal))); }
            }
            return result;
        }
        finally { _gate.Release(); }
    }

    public PlayerInvite? CreateInvite(string sessionId, string characterId, DateTimeOffset? now = null)
    {
        if (!ValidCharacterId(sessionId) || !ValidCharacterId(characterId)) return null;
        var at = now ?? DateTimeOffset.UtcNow; var secret = NewSecret(24); var invite = new PlayerInvite(Guid.NewGuid().ToString("N"), secret, characterId, at.Add(InviteLifetime));
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction();
            using var check = db.CreateCommand(); check.Transaction = tx;
            check.CommandText = "SELECT (SELECT COUNT(*) FROM player_assignments WHERE session_id=$session AND revoked=0 AND expires_utc>$now)+(SELECT COUNT(*) FROM player_invites WHERE session_id=$session AND used=0 AND expires_utc>$now), EXISTS(SELECT 1 FROM player_assignments WHERE session_id=$session AND character_id=$character AND revoked=0 AND expires_utc>$now), EXISTS(SELECT 1 FROM player_invites WHERE session_id=$session AND character_id=$character AND used=0 AND expires_utc>$now), EXISTS(SELECT 1 FROM player_sessions WHERE id=$session AND active=1)";
            check.Parameters.AddWithValue("$session", sessionId); check.Parameters.AddWithValue("$character", characterId); check.Parameters.AddWithValue("$now", Iso(at)); using var r = check.ExecuteReader();
            if (!r.Read() || r.GetInt32(0) >= MaxPlayers || r.GetInt32(1) != 0 || r.GetInt32(2) != 0 || r.GetInt32(3) == 0) return null;
            r.Close(); using var insert = db.CreateCommand(); insert.Transaction = tx;
            insert.CommandText = "INSERT INTO player_invites(id,session_id,character_id,secret_hash,expires_utc) VALUES($id,$session,$character,$hash,$expires)";
            insert.Parameters.AddWithValue("$id", invite.Id); insert.Parameters.AddWithValue("$session", sessionId); insert.Parameters.AddWithValue("$character", characterId);
            insert.Parameters.AddWithValue("$hash", Digest(secret)); insert.Parameters.AddWithValue("$expires", Iso(invite.ExpiresAt)); insert.ExecuteNonQuery(); tx.Commit(); return invite;
        }
        catch (SqliteException) { return null; }
        finally { _gate.Release(); }
    }

    public PlayerGrant? Exchange(string? secret, DateTimeOffset now, string sourceKey = "global") => ExchangeDetailed(secret, now, sourceKey).Grant;

    public PlayerExchangeResult ExchangeDetailed(string? secret, DateTimeOffset now, string sourceKey = "global")
    {
        if (IsInviteExchangeThrottled(sourceKey, now)) return new(null, "throttled");
        if (string.IsNullOrEmpty(secret) || secret.Length is < 32 or > 64 || secret.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_')))
        { RecordFailure(sourceKey, now); return new(null, "invalid"); }
        var token = NewSecret(32); _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var query = db.CreateCommand(); query.Transaction = tx;
            query.CommandText = "SELECT i.id,i.session_id,i.character_id,i.secret_hash,i.used,i.expires_utc,s.active FROM player_invites i JOIN player_sessions s ON s.id=i.session_id";
            using var reader = query.ExecuteReader();
            string? inviteId = null, sessionId = null, characterId = null, failure = null; var used = false; var expiry = DateTimeOffset.MinValue; var sessionActive = false;
            while (reader.Read())
            {
                if (!Matches(reader.GetString(3), secret)) continue;
                inviteId = reader.GetString(0); sessionId = reader.GetString(1); characterId = reader.GetString(2); used = reader.GetInt32(4) != 0; expiry = ReadDate(reader.GetString(5)); sessionActive = reader.GetInt32(6) != 0; break;
            }
            if (inviteId is null || sessionId is null || characterId is null) failure = "invalid";
            else if (used) failure = "used";
            else if (expiry <= now) failure = "expired";
            else if (!sessionActive) failure = "ended";
            if (failure is not null) { reader.Close(); tx.Rollback(); RecordFailure(sourceKey, now); return new(null, failure); }
            reader.Close();
            using var consume = db.CreateCommand(); consume.Transaction = tx; consume.CommandText = "UPDATE player_invites SET used=1 WHERE id=$id AND used=0 AND expires_utc>$now";
            consume.Parameters.AddWithValue("$id", inviteId!); consume.Parameters.AddWithValue("$now", Iso(now)); if (consume.ExecuteNonQuery() != 1) { tx.Rollback(); return new(null, "used"); }
            var playerId = Guid.NewGuid().ToString("N"); var tokenExpiry = now.Add(PlayerLifetime);
            using var grant = db.CreateCommand(); grant.Transaction = tx; grant.CommandText = "INSERT INTO player_assignments(id,session_id,character_id,token_hash,expires_utc) VALUES($id,$session,$character,$hash,$expires)";
            grant.Parameters.AddWithValue("$id", playerId); grant.Parameters.AddWithValue("$session", sessionId!); grant.Parameters.AddWithValue("$character", characterId!);
            grant.Parameters.AddWithValue("$hash", Digest(token)); grant.Parameters.AddWithValue("$expires", Iso(tokenExpiry)); grant.ExecuteNonQuery(); tx.Commit();
            lock (_throttleLock) _failedAttempts.Remove(sourceKey);
            return new(new PlayerGrant(playerId, token, characterId!, tokenExpiry), null);
        }
        finally { _gate.Release(); }
    }

    public PlayerIdentity? Authorize(string? token, string? requestedCharacterId = null, DateTimeOffset? now = null)
    {
        if (string.IsNullOrEmpty(token) || token.Length is < 40 or > 64 || token.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_'))) return null;
        var digest = Digest(token); var expected = Convert.FromHexString(digest); _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
            cmd.CommandText = "SELECT a.id,a.session_id,a.character_id,a.token_hash,a.expires_utc FROM player_assignments a JOIN player_sessions s ON s.id=a.session_id WHERE a.revoked=0 AND s.active=1 AND a.expires_utc>$now";
            cmd.Parameters.AddWithValue("$now", Iso(now ?? DateTimeOffset.UtcNow)); using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var hash = Convert.FromHexString(reader.GetString(3));
                if (!CryptographicOperations.FixedTimeEquals(hash, expected)) continue;
                var characterId = reader.GetString(2);
                if (requestedCharacterId is not null && !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(characterId), Encoding.UTF8.GetBytes(requestedCharacterId))) return null;
                return new PlayerIdentity(reader.GetString(0), reader.GetString(1), characterId, ReadDate(reader.GetString(4)));
            }
            return null;
        }
        finally { _gate.Release(); }
    }

    public string? AuthorizationFailure(string? token, DateTimeOffset? now = null)
    {
        if (string.IsNullOrEmpty(token) || token.Length is < 40 or > 64 || token.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '-' or '_'))) return "invalid";
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
            cmd.CommandText = "SELECT a.token_hash,a.revoked,a.expires_utc,s.active FROM player_assignments a JOIN player_sessions s ON s.id=a.session_id";
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                if (!Matches(reader.GetString(0), token)) continue;
                if (reader.GetInt32(1) != 0) return "revoked";
                if (ReadDate(reader.GetString(2)) <= (now ?? DateTimeOffset.UtcNow)) return "expired";
                if (reader.GetInt32(3) == 0) return "ended";
                return null;
            }
            return "invalid";
        }
        finally { _gate.Release(); }
    }

    public PlayerSheetState? ReadPlayerSheet(PlayerIdentity identity)
    {
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
             cmd.CommandText = "SELECT a.inventory_json,a.resources_json,a.current_hp FROM player_assignments a JOIN player_sessions s ON s.id=a.session_id WHERE a.id=$player AND a.session_id=$session AND a.character_id=$character AND a.revoked=0 AND a.expires_utc>$now AND s.active=1";
            cmd.Parameters.AddWithValue("$player", identity.PlayerId); cmd.Parameters.AddWithValue("$session", identity.SessionId);
            cmd.Parameters.AddWithValue("$character", identity.CharacterId); cmd.Parameters.AddWithValue("$now", Iso(DateTimeOffset.UtcNow));
            using var reader = cmd.ExecuteReader();
            if (!reader.Read()) return null;
            try
            {
                var inventory = JsonSerializer.Deserialize<List<PlayerInventoryItem>>(reader.GetString(0));
                var resources = JsonSerializer.Deserialize<Dictionary<string, int>>(reader.GetString(1));
                var state = new PlayerSheetState(inventory ?? [], resources ?? new(StringComparer.Ordinal), reader.IsDBNull(2) ? null : reader.GetInt32(2));
                return PlayerCommands.IsValidState(state) ? state : null;
            }
            catch (JsonException) { return null; }
        }
        finally { _gate.Release(); }
    }

    public bool ApplyPlayerCommand(PlayerIdentity identity, PlayerCommand command, out PlayerSheetState? updated, out bool stillAuthorized)
    {
        updated = null; stillAuthorized = false; _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction(); using var read = db.CreateCommand(); read.Transaction = tx;
             read.CommandText = "SELECT a.inventory_json,a.resources_json,a.current_hp FROM player_assignments a JOIN player_sessions s ON s.id=a.session_id WHERE a.id=$player AND a.session_id=$session AND a.character_id=$character AND a.revoked=0 AND a.expires_utc>$now AND s.active=1";
            read.Parameters.AddWithValue("$player", identity.PlayerId); read.Parameters.AddWithValue("$session", identity.SessionId);
            read.Parameters.AddWithValue("$character", identity.CharacterId); read.Parameters.AddWithValue("$now", Iso(DateTimeOffset.UtcNow));
            using var reader = read.ExecuteReader();
            if (!reader.Read()) { reader.Close(); tx.Rollback(); return false; }
            stillAuthorized = true;
            PlayerSheetState current;
            try { current = new(JsonSerializer.Deserialize<List<PlayerInventoryItem>>(reader.GetString(0)) ?? [], JsonSerializer.Deserialize<Dictionary<string, int>>(reader.GetString(1)) ?? new(StringComparer.Ordinal), reader.IsDBNull(2) ? null : reader.GetInt32(2)); }
            catch (JsonException) { reader.Close(); tx.Rollback(); stillAuthorized = false; return false; }
            if (!PlayerCommands.IsValidState(current)) { reader.Close(); tx.Rollback(); stillAuthorized = false; return false; }
            reader.Close();
            if (!PlayerCommands.TryApply(current, command, out updated)) { tx.Rollback(); return false; }
            using var write = db.CreateCommand(); write.Transaction = tx;
             write.CommandText = "UPDATE player_assignments SET inventory_json=$inventory,resources_json=$resources WHERE id=$player AND session_id=$session AND revoked=0 AND expires_utc>$now AND EXISTS(SELECT 1 FROM player_sessions WHERE id=$session AND active=1)";
            write.Parameters.AddWithValue("$inventory", JsonSerializer.Serialize(updated!.Inventory)); write.Parameters.AddWithValue("$resources", JsonSerializer.Serialize(updated.Resources));
            write.Parameters.AddWithValue("$player", identity.PlayerId); write.Parameters.AddWithValue("$session", identity.SessionId); write.Parameters.AddWithValue("$now", Iso(DateTimeOffset.UtcNow));
            if (write.ExecuteNonQuery() != 1) { tx.Rollback(); updated = null; stillAuthorized = false; return false; }
            tx.Commit(); return true;
        }
        finally { _gate.Release(); }
    }

    public bool SetCurrentHitPoints(string sessionId, string playerId, int currentHp, int maximum)
    {
        if (currentHp < 0 || currentHp > maximum || maximum < 1) return false;
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var cmd = db.CreateCommand();
            cmd.CommandText = "UPDATE player_assignments SET current_hp=$hp WHERE id=$player AND session_id=$session AND revoked=0 AND expires_utc>$now AND EXISTS(SELECT 1 FROM player_sessions WHERE id=$session AND active=1)";
            cmd.Parameters.AddWithValue("$hp", currentHp); cmd.Parameters.AddWithValue("$player", playerId); cmd.Parameters.AddWithValue("$session", sessionId); cmd.Parameters.AddWithValue("$now", Iso(DateTimeOffset.UtcNow));
            return cmd.ExecuteNonQuery() == 1;
        }
        finally { _gate.Release(); }
    }

    public bool Revoke(string sessionId, string playerId)
    {
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction();
            using var cmd = db.CreateCommand(); cmd.Transaction = tx; cmd.CommandText = "UPDATE player_assignments SET revoked=1 WHERE id=$player AND session_id=$session AND revoked=0"; cmd.Parameters.AddWithValue("$player", playerId); cmd.Parameters.AddWithValue("$session", sessionId); var changed = cmd.ExecuteNonQuery();
            if (changed == 1)
            {
                using var invalidate = db.CreateCommand(); invalidate.Transaction = tx;
                invalidate.CommandText = "UPDATE player_invites SET used=1 WHERE session_id=$session AND character_id=(SELECT character_id FROM player_assignments WHERE id=$player) AND used=0";
                invalidate.Parameters.AddWithValue("$session", sessionId); invalidate.Parameters.AddWithValue("$player", playerId); invalidate.ExecuteNonQuery();
            }
            tx.Commit(); return changed == 1;
        }
        finally { _gate.Release(); }
    }

    public bool Stop(string sessionId)
    {
        _gate.Wait();
        try
        {
            using var db = Connect(); db.Open(); using var tx = db.BeginTransaction();
            using var stop = db.CreateCommand(); stop.Transaction = tx; stop.CommandText = "UPDATE player_sessions SET active=0 WHERE id=$id AND active=1"; stop.Parameters.AddWithValue("$id", sessionId); var changed = stop.ExecuteNonQuery();
            using var revoke = db.CreateCommand(); revoke.Transaction = tx; revoke.CommandText = "UPDATE player_assignments SET revoked=1 WHERE session_id=$id AND revoked=0"; revoke.Parameters.AddWithValue("$id", sessionId); revoke.ExecuteNonQuery();
            using var invites = db.CreateCommand(); invites.Transaction = tx; invites.CommandText = "UPDATE player_invites SET used=1 WHERE session_id=$id AND used=0"; invites.Parameters.AddWithValue("$id", sessionId); invites.ExecuteNonQuery(); tx.Commit(); return changed == 1;
        }
        finally { _gate.Release(); }
    }

    public bool IsInviteExchangeThrottled(DateTimeOffset now) => IsInviteExchangeThrottled("global", now);
    public bool IsInviteExchangeThrottled(string sourceKey, DateTimeOffset now)
    {
        lock (_throttleLock) { var queue = GetAttempts(sourceKey); Prune(queue, now); return queue.Count >= MaxFailedInviteAttempts; }
    }
    private void RecordFailure(string sourceKey, DateTimeOffset now) { lock (_throttleLock) { var queue = GetAttempts(sourceKey); Prune(queue, now); if (queue.Count < MaxFailedInviteAttempts) queue.Enqueue(now); } }
    private Queue<DateTimeOffset> GetAttempts(string sourceKey) { if (!_failedAttempts.TryGetValue(sourceKey, out var queue)) _failedAttempts[sourceKey] = queue = new(); return queue; }
    private static void Prune(Queue<DateTimeOffset> queue, DateTimeOffset now) { while (queue.TryPeek(out var oldest) && now - oldest >= TimeSpan.FromMinutes(1)) queue.Dequeue(); }
    public void Dispose() => _gate.Dispose();
}
