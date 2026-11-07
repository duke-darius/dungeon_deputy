using System.Text.Json;
using System.Text.Json.Serialization;
using DungeonDeputy.Api.Srd;

namespace DungeonDeputy.Api.AiPreparation;

public sealed record NpcProposalContent(IReadOnlyList<AiNpc> Npcs, IReadOnlyList<string> ReferenceIds);
public sealed record EncounterActor(string Name, string Rationale, string? SrdRecordId);
public sealed record EncounterProposalContent(IReadOnlyList<EncounterActor> Actors, IReadOnlyList<string> ReferenceIds);
public sealed record AdventureScene(string Title, string Description);
public sealed record AdventureProposalContent(string Title, IReadOnlyList<AdventureScene> Scenes, IReadOnlyList<string> ReferenceIds);
public sealed record SceneProposalContent(string Description, IReadOnlyList<string> ReferenceIds);
public sealed record GeometryPrimitive(string Kind, double X, double Y, double Width, double Height, string Label);
public sealed record GeometryProposalContent(IReadOnlyList<GeometryPrimitive> Primitives, IReadOnlyList<string> ReferenceIds);

public static class ProposalValidator
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow, AllowTrailingCommas = false, ReadCommentHandling = JsonCommentHandling.Disallow };
    public static bool TryValidate(string kind, string json, out AiProposal? proposal)
    {
        proposal = null;
        if (string.IsNullOrEmpty(json) || System.Text.Encoding.UTF8.GetByteCount(json) > AiPreparationService.MaxResponseBytes) return false;
        try
        {
            using var doc = JsonDocument.Parse(json, new JsonDocumentOptions { MaxDepth = 12, AllowTrailingCommas = false, CommentHandling = JsonCommentHandling.Disallow });
            if (HasDuplicateNames(doc.RootElement)) return false;
            object? content = kind switch
            {
                "npc" => Parse<NpcProposalContent>(doc.RootElement, c => c.Npcs is { Count: > 0 and <= 8 } && c.Npcs.All(n => Text(n.Name, 80) && Text(n.Description, 500, true)) && Refs(c.ReferenceIds)),
                "encounter" => Parse<EncounterProposalContent>(doc.RootElement, c => c.Actors is { Count: > 0 and <= 8 } && c.Actors.All(a => Text(a.Name, 80) && Text(a.Rationale, 500, true) && (a.SrdRecordId is null || Text(a.SrdRecordId, 120))) && Refs(c.ReferenceIds)),
                "adventure" => Parse<AdventureProposalContent>(doc.RootElement, c => Text(c.Title, 80) && c.Scenes is { Count: > 0 and <= 5 } && c.Scenes.All(s => Text(s.Title, 80) && Text(s.Description, 500, true)) && Refs(c.ReferenceIds)),
                "scene" => Parse<SceneProposalContent>(doc.RootElement, c => Text(c.Description, 1000) && Refs(c.ReferenceIds)),
                "geometry" => Parse<GeometryProposalContent>(doc.RootElement, c => c.Primitives is { Count: > 0 and <= 40 } && c.Primitives.All(p => (p.Kind is "line" or "rectangle") && Finite(p.X, p.Y, p.Width, p.Height) && p.X is >= 0 and <= 1000 && p.Y is >= 0 and <= 1000 && p.Width is >= 1 and <= 1000 && p.Height is >= 1 and <= 1000 && p.X + p.Width <= 1000 && p.Y + p.Height <= 1000 && Text(p.Label, 80, true)) && Refs(c.ReferenceIds)),
                _ => null
            };
            if (content is null) return false;
            var referenceIds = content switch { NpcProposalContent c => c.ReferenceIds, EncounterProposalContent c => c.ReferenceIds, AdventureProposalContent c => c.ReferenceIds, SceneProposalContent c => c.ReferenceIds, GeometryProposalContent c => c.ReferenceIds, _ => [] };
            proposal = new AiProposal(kind, content, referenceIds.Select(x => new AiSelectedSrdRecord(x, "", "", "")).ToArray());
            return true;
        }
        catch (Exception ex) when (ex is JsonException or ArgumentException or OverflowException) { return false; }
    }
    public static bool TryResolveReferences(IReadOnlyList<SrdRecord> catalog, IReadOnlyList<string> ids, out IReadOnlyList<AiSelectedSrdRecord> resolved)
    {
        resolved = [];
        if (!Refs(ids)) return false;
        var results = new List<AiSelectedSrdRecord>();
        foreach (var id in ids)
        {
            var record = catalog.SingleOrDefault(x => x.Id == id);
            if (record is null) return false;
            results.Add(new(record.Id, record.Name, record.Summary, $"{record.Provenance.Dataset} · {record.Provenance.License} · p. {record.Provenance.Page} · {record.Provenance.Section}"));
        }
        resolved = results;
        return true;
    }
    private static T? Parse<T>(JsonElement root, Func<T, bool> valid) where T : class { var value = root.Deserialize<T>(Options); return value is not null && valid(value) ? value : null; }
    private static bool Text(string? value, int max, bool emptyOk = false) => value is not null && value.Length <= max && (emptyOk || !string.IsNullOrWhiteSpace(value));
    private static bool Refs(IReadOnlyList<string>? values) => values is { Count: <= 3 } && values.All(x => Text(x, 120)) && values.Distinct(StringComparer.Ordinal).Count() == values.Count;
    private static bool Finite(params double[] xs) => xs.All(double.IsFinite);
    private static bool HasDuplicateNames(JsonElement value) => value.ValueKind switch { JsonValueKind.Object => value.EnumerateObject().Select(x => x.Name).Distinct(StringComparer.Ordinal).Count() != value.EnumerateObject().Count() || value.EnumerateObject().Any(x => HasDuplicateNames(x.Value)), JsonValueKind.Array => value.EnumerateArray().Any(HasDuplicateNames), _ => false };
}
