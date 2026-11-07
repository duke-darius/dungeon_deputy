namespace DungeonDeputy.Api.AiPreparation;

/// <summary>Deterministic fake provider that is activated only by the isolated E2E launch seam.</summary>
public sealed class E2eFakeAiPreparationService : IAiPreparationService
{
    public AiPreparationStatus GetStatus() => new("configured");

    public Task<AiPreparationResult> GenerateAsync(AiGenerationRequest request, IReadOnlyList<AiSelectedSrdRecord> records, CancellationToken cancellationToken)
    {
        if (!request.Consent) return Task.FromResult(AiPreparationResult.Failed(AiPreparationFailure.ConsentRequired));
        if (request.Kind != "geometry" || string.IsNullOrWhiteSpace(request.Prompt) || request.Prompt.Length > AiPreparationService.MaxPromptCharacters)
            return Task.FromResult(AiPreparationResult.Failed(AiPreparationFailure.InvalidRequest));
        cancellationToken.ThrowIfCancellationRequested();
        var content = new GeometryProposalContent(
        [
            new GeometryPrimitive("rectangle", 120, 100, 260, 190, "Tavern ambush room"),
            new GeometryPrimitive("line", 120, 290, 260, 1, "Ambush approach")
        ], records.Select(record => record.Id).ToArray());
        var proposal = new AiProposal(request.Kind, content, records.ToArray());
        return Task.FromResult(new AiPreparationResult(null, null, "Proposal ready for private review.", proposal));
    }
}
