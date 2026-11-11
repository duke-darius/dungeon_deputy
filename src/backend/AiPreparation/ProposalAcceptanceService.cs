using DungeonDeputy.Api.Encounters;
using DungeonDeputy.Api.Maps;
using DungeonDeputy.Api.Srd;
using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace DungeonDeputy.Api.AiPreparation;

public sealed record ProposalAcceptanceRequest(string Kind, string? ProposalJson, string[]? SelectedMonsterIds);
public sealed record AcceptedPreparationEdit(string? Kind, string? ContentJson);
public sealed record ProposalAcceptanceResult(bool Accepted, string Message, MapDocument? Draft = null);

/// <summary>Applies only freshly validated, explicitly selected content to the private map draft.</summary>
public sealed class ProposalAcceptanceService(EncounterService encounters, SrdCatalog catalog, AcceptedPreparationStore accepted)
{
    public IReadOnlyList<AcceptedPreparation> ListAccepted() => accepted.List();
    public AcceptedPreparation? GetAccepted(string id) => accepted.Get(id);
    public bool DeleteAccepted(string id) => accepted.Delete(id);

    public AcceptedPreparation? UpdateAccepted(string id, AcceptedPreparationEdit? edit)
    {
        if (edit?.Kind is not ("npc" or "encounter" or "adventure" or "scene") ||
            !ProposalValidator.TryValidate(edit.Kind, edit.ContentJson ?? "", out var proposal) ||
            !ResolveAndValidate(proposal!, out var refs)) return null;
        using var content = JsonDocument.Parse(edit.ContentJson!);
        return accepted.Update(id, edit.Kind, content.RootElement, refs);
    }

    public ProposalAcceptanceResult Accept(ProposalAcceptanceRequest? request)
    {
        if (request is null || request.SelectedMonsterIds is null || request.SelectedMonsterIds.Length > 8 ||
            request.SelectedMonsterIds.Any(id => string.IsNullOrWhiteSpace(id) || id.Length > 120) ||
            request.SelectedMonsterIds.Distinct(StringComparer.Ordinal).Count() != request.SelectedMonsterIds.Length ||
            !ProposalValidator.TryValidate(request.Kind, request.ProposalJson ?? "", out var proposal))
            return new(false, "The edited proposal is invalid. Your campaign is unchanged.");

        var records = new List<SrdRecord>();
        foreach (var id in request.SelectedMonsterIds)
        {
            var record = catalog.Find(id);
            if (record is null || record.Category != "monster" || record.Stats is not { HitPoints: >= 1 and <= EncounterService.MaxHitPoints, ArmorClass: >= 1 and <= 50, Strength: >= 1 and <= 30, Dexterity: >= 1 and <= 30, Constitution: >= 1 and <= 30 } || record.Provenance.Dataset != "SRD 5.2.1")
                return new(false, "A selected local monster is unavailable or unsupported. Your campaign is unchanged.");
            records.Add(record);
        }

        if (!ResolveAndValidate(proposal!, out var references))
            return new(false, "A local SRD reference is unavailable or no longer matches this proposal. Your campaign is unchanged.");
        using var contentDocument = JsonDocument.Parse(request!.ProposalJson!);
        (string Kind, JsonElement Content, IReadOnlyList<AiSelectedSrdRecord> References)? narrative = proposal!.Kind == "geometry"
            ? null
            : (proposal.Kind, contentDocument.RootElement.Clone(), references);
        var geometry = proposal.Content is GeometryProposalContent shapeProposal
            ? shapeProposal.Primitives.Select(p => new MapGeometry(p.Kind, p.X, p.Y, p.Width, p.Height, p.Label)).ToList()
            : [];
        MapDocument? updated;
        try { updated = encounters.AcceptProposal(records, geometry, narrative, accepted); }
        catch (SqliteException) { return new(false, "The private draft could not be saved. No partial acceptance was committed."); }
        return updated is null
            ? new(false, "The selected content could not be applied within the current private map and encounter limits. No partial acceptance was saved.")
            : new(true, proposal.Kind == "geometry" || records.Count > 0
                ? "Accepted to the private editable map draft. Nothing was shown or published."
                : "Accepted to private preparation. Nothing was shown or published.", updated);
    }

    private bool ResolveAndValidate(AiProposal proposal, out IReadOnlyList<AiSelectedSrdRecord> references)
    {
        if (!ProposalValidator.TryResolveReferences(catalog.All, proposal.References.Select(x => x.Id).ToArray(), out references)) return false;
        if (proposal.Content is EncounterProposalContent encounter)
        {
            foreach (var actor in encounter.Actors)
                if (actor.SrdRecordId is not null && (!actor.SrdRecordId.StartsWith("srd521:monster:", StringComparison.Ordinal) ||
                    !references.Any(reference => reference.Id == actor.SrdRecordId) || catalog.Find(actor.SrdRecordId)?.Category != "monster")) return false;
        }
        return true;
    }
}
