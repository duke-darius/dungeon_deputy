namespace DungeonDeputy.Api.AiPreparation;

public sealed record AiGenerationRequest(string? Prompt, bool Consent, string[]? SelectedSrdRecordIds, string Kind = "npc");
public sealed record AiProviderSettings(bool Enabled, string? ApiKey, string? Model);
public sealed record AiSelectedSrdRecord(string Id, string Name, string Excerpt, string Source);
public sealed record AiNpc(string Name, string Description);
public sealed record AiNpcProposal(IReadOnlyList<AiNpc> Npcs);
public sealed record AiProposal(string Kind, object Content, IReadOnlyList<AiSelectedSrdRecord> References, bool NarrativeUnverified = true);
public enum AiPreparationFailure { Disabled, NotConfigured, ConsentRequired, InvalidRequest, InvalidProviderResponse, ProviderUnavailable }
public sealed record AiPreparationResult(AiNpcProposal? Proposal, AiPreparationFailure? Failure, string Message, AiProposal? StructuredProposal = null)
{
    public static AiPreparationResult Failed(AiPreparationFailure failure) => new(null, failure, failure switch
    {
        AiPreparationFailure.Disabled => "AI preparation is disabled.",
        AiPreparationFailure.NotConfigured => "AI provider is not configured.",
        AiPreparationFailure.ConsentRequired => "Fresh consent is required for each request.",
        AiPreparationFailure.InvalidRequest => "The request is invalid or exceeds the allowed limits.",
        AiPreparationFailure.InvalidProviderResponse => "The proposal could not be validated.",
        _ => "The AI provider is unavailable. Your campaign is unchanged."
    });
}
public sealed record AiPreparationStatus(string State);
public interface IAiPreparationService
{
    AiPreparationStatus GetStatus();
    Task<AiPreparationResult> GenerateAsync(AiGenerationRequest request, IReadOnlyList<AiSelectedSrdRecord> records, CancellationToken cancellationToken);
}
