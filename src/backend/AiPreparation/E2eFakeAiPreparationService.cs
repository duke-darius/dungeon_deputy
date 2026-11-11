namespace DungeonDeputy.Api.AiPreparation;

/// <summary>Deterministic fake provider that is activated only by the isolated E2E launch seam.</summary>
public sealed class E2eFakeAiPreparationService : IAiPreparationService
{
    public AiPreparationStatus GetStatus() => new("configured");

    public Task<AiPreparationResult> GenerateAsync(AiGenerationRequest request, IReadOnlyList<AiSelectedSrdRecord> records, CancellationToken cancellationToken)
    {
        if (!request.Consent) return Task.FromResult(AiPreparationResult.Failed(AiPreparationFailure.ConsentRequired));
        if (string.IsNullOrWhiteSpace(request.Prompt) || request.Prompt.Length > AiPreparationService.MaxPromptCharacters)
            return Task.FromResult(AiPreparationResult.Failed(AiPreparationFailure.InvalidRequest));
        cancellationToken.ThrowIfCancellationRequested();
        if (request.Kind == "npc")
        {
            var npc = new NpcProposalContent([new AiNpc("Mira Vale", "A careful local guide with a lantern.")], records.Select(record => record.Id).ToArray());
            return Task.FromResult(new AiPreparationResult(new AiNpcProposal(npc.Npcs), null, "Proposal ready for private review.", new AiProposal(request.Kind, npc, records.ToArray())));
        }
        if (request.Kind != "geometry") return Task.FromResult(AiPreparationResult.Failed(AiPreparationFailure.InvalidRequest));
        var content = new GeometryProposalContent(
        [
            new GeometryPrimitive("rectangle", 120, 100, 260, 190, "Tavern ambush room"),
            new GeometryPrimitive("line", 120, 290, 260, 1, "Ambush approach")
        ], records.Select(record => record.Id).ToArray());
        var proposal = new AiProposal(request.Kind, content, records.ToArray());
        return Task.FromResult(new AiPreparationResult(null, null, "Proposal ready for private review.", proposal));
    }
}
