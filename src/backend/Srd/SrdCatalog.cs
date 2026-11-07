using System.Text.Json;

namespace DungeonDeputy.Api.Srd;

public sealed record SrdProvenance(string Dataset, string License, string SourceHash, int Page, string Section, string Modifications, string RecordHash);
public sealed record MonsterStats(string Size, int ArmorClass, int HitPoints, int Speed, int Strength, int Dexterity, int Constitution, int ChallengeRatingNumerator, int ChallengeRatingDenominator, List<string> Attacks);
public sealed record SrdRecord(string Id, string Category, string Name, string Summary, MonsterStats? Stats, JsonElement Details, SrdProvenance Provenance);
public sealed record SrdSearchResult(IReadOnlyList<SrdRecord> Records, int Total);
public sealed record SrdAddMonsterCommand(string? MonsterId);

public sealed class SrdCatalog
{
    private static readonly HashSet<string> Categories = ["spell", "condition", "action", "monster", "equipment", "class", "species"];
    private const string PinnedPdfHash = "sha256:8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
    private readonly IReadOnlyList<SrdRecord> _records;
    public JsonElement Manifest { get; }
    public JsonElement Coverage { get; }

    public SrdCatalog(IConfiguration configuration)
    {
        var configured = configuration["DUNGEON_DEPUTY_SRD_RECORDS"];
        var path = configured ?? Path.Combine(AppContext.BaseDirectory, "assets", "srd", "2024", "records.json");
        if (!File.Exists(path) && configured is null) path = Path.Combine(Directory.GetCurrentDirectory(), "assets", "srd", "2024", "records.json");
        if (!File.Exists(path)) throw new FileNotFoundException("Bundled SRD catalog is missing.", path);
        var directory = Path.GetDirectoryName(path)!;
        using (var manifest = JsonDocument.Parse(File.ReadAllText(Path.Combine(directory, "manifest.json")))) Manifest = manifest.RootElement.Clone();
        using (var coverage = JsonDocument.Parse(File.ReadAllText(Path.Combine(directory, "coverage.json")))) Coverage = coverage.RootElement.Clone();
        _records = JsonSerializer.Deserialize<List<SrdRecord>>(File.ReadAllText(path), new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidDataException("Bundled SRD catalog is invalid.");
        if (_records.Count > 1000 || _records.Select(r => r.Id).Distinct(StringComparer.Ordinal).Count() != _records.Count ||
            _records.Any(r => !Categories.Contains(r.Category) || r.Provenance.License != "CC-BY-4.0" || r.Provenance.Dataset != "SRD 5.2.1" ||
                r.Provenance.Page < 1 || string.IsNullOrWhiteSpace(r.Provenance.Section) ||
                r.Provenance.SourceHash != PinnedPdfHash ||
                !System.Text.RegularExpressions.Regex.IsMatch(r.Provenance.RecordHash, "^sha256:[a-f0-9]{64}$") ||
                (r.Category == "monster" && (r.Stats is null || r.Stats.HitPoints is < 1 or > 9999 || r.Stats.ArmorClass is < 1 or > 50))))
            throw new InvalidDataException("Bundled SRD catalog failed provenance or schema validation.");
    }

    public IReadOnlyList<SrdRecord> All => _records;
    public SrdRecord? Find(string id) => _records.SingleOrDefault(r => r.Id == id);
    public SrdSearchResult Search(string? query, string? category)
    {
        if (query is { Length: > 100 } || (category is not null && !Categories.Contains(category))) return new([], 0);
        var filtered = _records.Where(r => (category is null || r.Category == category) &&
            (string.IsNullOrWhiteSpace(query) || r.Name.Contains(query.Trim(), StringComparison.OrdinalIgnoreCase) || r.Summary.Contains(query.Trim(), StringComparison.OrdinalIgnoreCase)))
            .OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase).Take(50).ToArray();
        return new(filtered, filtered.Length);
    }
}
