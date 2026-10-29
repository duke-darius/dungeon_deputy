using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace DungeonDeputy.Api.Maps;

public sealed record MapToken(string Id, string Name, string Kind, string Color, double X, double Y, string Artwork = "hero.svg", bool Visible = true);
public sealed record FogStamp(double X, double Y, double Radius);
public sealed record FogStroke(string Mode, List<FogStamp> Stamps);
public sealed record MapDocument(string CampaignId, string SessionId, string Id, string Name, string Image, bool GridVisible, double Scale, List<MapToken> Tokens, bool FogEnabled = false, List<FogStroke>? FogStrokes = null, string? ImageData = null);
public sealed record MapState(MapDocument Draft, MapDocument? Approved);
public sealed record TokenCommand(string? Name, string? Kind, string? Color, string? Artwork, double? X, double? Y);
public sealed record PublicToken(string Id, string Name, string Kind, string Color, double X, double Y, string Artwork);
public sealed record PublicMap(string Mode, string Id, string ImageData, List<PublicToken> Tokens);
public sealed record MapPublication(string ImageData);
public sealed record FogCommand(string Mode, List<FogStamp>? Stamps, string ImageData = "");
public sealed record FogEnableCommand(string ImageData);
public sealed record VisibilityCommand(bool Visible, string ImageData);

public sealed class MapService
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _writeGate = new(1, 1);
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
        for (var i = 0; i < 3; i++) tokens.Add(new($"goblin-{i + 1}", $"Goblin {i + 1}", "monster", "#78906a", 650 + i * 70, 350, "goblin.svg"));
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
        _writeGate.Wait();
        try { return SaveCore(map); }
        finally { _writeGate.Release(); }
    }
    private bool SaveCore(MapDocument map)
    {
        if (map is null || string.IsNullOrWhiteSpace(map.CampaignId) || map.CampaignId.Length > 80 || string.IsNullOrWhiteSpace(map.SessionId) || map.SessionId.Length > 80 || string.IsNullOrWhiteSpace(map.Id) || map.Id.Length > 80 || string.IsNullOrWhiteSpace(map.Name) || map.Name.Length > 100 || map.Image is not ("tavern.svg" or "") || !double.IsFinite(map.Scale) || map.Scale is < 8 or > 256 || map.Tokens is null || map.Tokens.Count > 100 || (map.FogStrokes?.Count ?? 0) > 2000 || (map.ImageData is not null && !ValidPng(map.ImageData))) return false;
        if (map.FogStrokes?.Any(s => s is null || s.Mode is not ("reveal" or "hide") || s.Stamps is null || s.Stamps.Count is 0 or > 500 || s.Stamps.Any(p => p is null || !double.IsFinite(p.X) || !double.IsFinite(p.Y) || Math.Abs(p.X) > 100000 || Math.Abs(p.Y) > 100000 || !double.IsFinite(p.Radius) || p.Radius is < 1 or > 5000)) == true) return false;
        if (map.Tokens.Any(t => t is null || string.IsNullOrWhiteSpace(t.Id) || t.Id.Length > 80 || string.IsNullOrWhiteSpace(t.Name) || t.Name.Length > 60 || t.Kind is not ("hero" or "monster") || t.Color is null || !Regex.IsMatch(t.Color, "^#[0-9a-fA-F]{6}$") || t.Artwork is not ("hero.svg" or "goblin.svg") || !double.IsFinite(t.X) || !double.IsFinite(t.Y) || Math.Abs(t.X) > 100000 || Math.Abs(t.Y) > 100000) || map.Tokens.Select(t => t.Id).Distinct(StringComparer.Ordinal).Count() != map.Tokens.Count) return false;
        if (JsonSerializer.Serialize(map).Length > 2_000_000) return false;
        using var db = Connect(); db.Open(); using var transaction = db.BeginTransaction(); using var cmd = db.CreateCommand(); cmd.Transaction = transaction;
        cmd.CommandText = "UPDATE map_draft SET document=$draft WHERE id=1"; cmd.Parameters.AddWithValue("$draft", JsonSerializer.Serialize(map)); var changed = cmd.ExecuteNonQuery(); transaction.Commit(); return changed == 1;
    }
    public bool ChangeToken(string id, TokenCommand change)
    {
        _writeGate.Wait();
        try
        {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 80 || change is null) return false;
        var state = Get(); var tokens = state.Draft.Tokens;
        var index = tokens.FindIndex(t => t.Id == id);
        if (index < 0) return false;
        var old = tokens[index];
        var next = old with
        {
            Name = change.Name ?? old.Name,
            Kind = change.Kind ?? old.Kind,
            Color = change.Color ?? old.Color,
            Artwork = change.Artwork ?? old.Artwork,
            X = change.X ?? old.X,
            Y = change.Y ?? old.Y
        };
        if (string.IsNullOrWhiteSpace(next.Name) || next.Name.Length > 60 || next.Kind is not ("hero" or "monster") || !Regex.IsMatch(next.Color, "^#[0-9a-fA-F]{6}$") || next.Artwork is not ("hero.svg" or "goblin.svg") || !double.IsFinite(next.X) || !double.IsFinite(next.Y) || Math.Abs(next.X) > 100000 || Math.Abs(next.Y) > 100000) return false;
        tokens[index] = next;
        return SaveCore(state.Draft with { Tokens = tokens });
        }
        finally { _writeGate.Release(); }
    }
    public bool RemoveToken(string id)
    {
        _writeGate.Wait();
        try
        {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 80) return false;
        var draft = Get().Draft; var tokens = draft.Tokens.Where(t => t.Id != id).ToList();
        return tokens.Count != draft.Tokens.Count && SaveCore(draft with { Tokens = tokens });
        }
        finally { _writeGate.Release(); }
    }
    public bool AddToken(MapToken token)
    {
        _writeGate.Wait();
        try
        {
        var draft = Get().Draft;
        if (draft.Tokens.Count >= 100 || token is null || draft.Tokens.Any(t => t.Id == token.Id)) return false;
        return SaveCore(draft with { Tokens = [.. draft.Tokens, token] });
        }
        finally { _writeGate.Release(); }
    }
    public bool EnableFog()
    {
        _writeGate.Wait();
        try { var map = Get().Draft; return map.FogEnabled || SaveCore(map with { FogEnabled = true, FogStrokes = [] }); }
        finally { _writeGate.Release(); }
    }
    public MapDocument? EnableFog(string imageData)
    {
        _writeGate.Wait();
        try { var map = Get().Draft; var next = map with { FogEnabled = true, FogStrokes = [], ImageData = imageData }; return ValidPng(imageData) && SaveCore(next) ? next : null; }
        finally { _writeGate.Release(); }
    }
    public bool ApplyFog(FogCommand command)
    {
        _writeGate.Wait();
        try
        {
            if (command is null || command.Mode is not ("reveal" or "hide") || command.Stamps is null || command.Stamps.Count is 0 or > 500) return false;
            var map = Get().Draft;
            if (!map.FogEnabled || (map.FogStrokes?.Sum(s => s.Stamps.Count) ?? 0) + command.Stamps.Count > 10000) return false;
            var next = new FogStroke(command.Mode, command.Stamps);
            return SaveCore(map with { FogStrokes = [.. map.FogStrokes ?? [], next] });
        }
        finally { _writeGate.Release(); }
    }
    public MapDocument? ApplyFogWithImage(FogCommand command)
    {
        _writeGate.Wait();
        try
        {
            if (command is null || command.Mode is not ("reveal" or "hide") || command.Stamps is null || command.Stamps.Count is 0 or > 500 || !ValidPng(command.ImageData)) return null;
            var map = Get().Draft;
            if (!map.FogEnabled || (map.FogStrokes?.Sum(s => s.Stamps.Count) ?? 0) + command.Stamps.Count > 10000) return null;
            var next = map with { FogStrokes = [.. map.FogStrokes ?? [], new FogStroke(command.Mode, command.Stamps)], ImageData = command.ImageData };
            return SaveCore(next) ? next : null;
        }
        finally { _writeGate.Release(); }
    }
    public bool ChangeTokenVisibility(string id, bool visible)
    {
        _writeGate.Wait();
        try
        {
            if (string.IsNullOrWhiteSpace(id) || id.Length > 80) return false;
            var map = Get().Draft; var index = map.Tokens.FindIndex(t => t.Id == id);
            if (index < 0) return false;
            var tokens = map.Tokens.ToList(); tokens[index] = tokens[index] with { Visible = visible };
            return SaveCore(map with { Tokens = tokens });
        }
        finally { _writeGate.Release(); }
    }
    public MapDocument? ChangeTokenVisibility(string id, bool visible, string imageData)
    {
        _writeGate.Wait();
        try
        {
            if (string.IsNullOrWhiteSpace(id) || id.Length > 80 || !ValidPng(imageData)) return null;
            var map = Get().Draft; var index = map.Tokens.FindIndex(t => t.Id == id); if (index < 0) return null;
            var tokens = map.Tokens.ToList(); tokens[index] = tokens[index] with { Visible = visible };
            var next = map with { Tokens = tokens, ImageData = imageData };
            return SaveCore(next) ? next : null;
        }
        finally { _writeGate.Release(); }
    }
    private static bool ValidPng(string? value)
    {
        const int maxBytes = 4 * 1024 * 1024;
        if (string.IsNullOrEmpty(value) || value.Length > maxBytes * 4 / 3 + 64 || !value.StartsWith("data:image/png;base64,", StringComparison.Ordinal)) return false;
        try
        {
            var bytes = Convert.FromBase64String(value["data:image/png;base64,".Length..]);
            return bytes.Length is >= 33 and <= maxBytes && bytes.AsSpan(0, 8).SequenceEqual(new byte[] {137,80,78,71,13,10,26,10}) &&
                bytes.AsSpan(12, 4).SequenceEqual("IHDR"u8) &&
                System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16, 4)) == 1200 &&
                System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20, 4)) == 760;
        }
        catch (FormatException) { return false; }
    }
    public MapDocument Publish(string imageData)
    {
        _writeGate.Wait();
        try
        {
            var draft = Get().Draft with { ImageData = imageData };
            if (!ValidPng(imageData) || !SaveCore(draft)) throw new InvalidOperationException("Sanitized PNG publication was rejected.");
            using var db = Connect(); db.Open(); using var transaction = db.BeginTransaction(); using var cmd = db.CreateCommand(); cmd.Transaction=transaction; cmd.CommandText = "INSERT INTO approved_map(id,document) SELECT 1,document FROM map_draft WHERE id=1 ON CONFLICT(id) DO UPDATE SET document=excluded.document"; cmd.ExecuteNonQuery(); transaction.Commit(); return Get().Approved!;
        }
        finally { _writeGate.Release(); }
    }
    public PublicMap? GetPublic() { var approved=Get().Approved; return approved is null || approved.ImageData is null ? null : Project(approved); }
    public PublicMap ProjectDraft() { var draft=Get().Draft; if (draft.ImageData is null) throw new InvalidOperationException("A sanitized map raster is required before public display."); return Project(draft); }
    public static PublicMap Project(MapDocument map) => new("map", map.Id, map.ImageData!,
        map.Tokens.Where(t => t.Visible).Select(t => new PublicToken(t.Id,t.Name,t.Kind,t.Color,t.X,t.Y,t.Artwork)).ToList());
}
